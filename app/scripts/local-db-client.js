// Local DB client shim for PostgreSQL backend (Supabase-like API shape).
(function () {
  const STORAGE_KEY = 'pharus_local_session';
  const authListeners = new Set();

  function readSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function writeSession(session) {
    if (!session) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  function notifyAuth(event, session) {
    authListeners.forEach((cb) => {
      try {
        cb(event, session);
      } catch (_error) {
        // ignore listener errors to keep auth flow stable
      }
    });
  }

  function isNumericId(value) {
    const raw = String(value ?? '').trim();
    return /^[0-9]+$/.test(raw);
  }

  function toClientUser(row) {
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      user_metadata: {
        ...(row.raw_user_meta_data || {}),
        role: row.role || 'user',
      },
      created_at: row.created_at,
      last_sign_in_at: row.last_sign_in_at,
    };
  }

  async function normalizeSessionUserId(session) {
    const user = session?.user;
    if (!user) return session || null;
    const rawId = String(user.id ?? '').trim();
    const email = String(user.email || '').trim().toLowerCase();

    if (isNumericId(rawId)) {
      const byIdResult = await api('/api/db/query', {
        table: 'app_users',
        action: 'select',
        select: 'id,email,raw_user_meta_data,role,created_at,last_sign_in_at',
        filters: [{ column: 'id', op: 'eq', value: Number(rawId) }],
        single: true,
      });

      if (!byIdResult?.error && byIdResult?.data?.id != null) {
        return { ...session, user: toClientUser(byIdResult.data) };
      }

      if (email) {
        const byEmailResult = await api('/api/db/query', {
          table: 'app_users',
          action: 'select',
          select: 'id,email,raw_user_meta_data,role,created_at,last_sign_in_at',
          filters: [{ column: 'email', op: 'eq', value: email }],
          single: true,
        });

        if (!byEmailResult?.error && byEmailResult?.data?.id != null) {
          const nextSession = { ...session, user: toClientUser(byEmailResult.data) };
          writeSession(nextSession);
          return nextSession;
        }
      }

      writeSession(null);
      return null;
    }

    if (!email) return session;

    const result = await api('/api/db/query', {
      table: 'app_users',
      action: 'select',
      select: 'id,email,raw_user_meta_data,role,created_at,last_sign_in_at',
      filters: [{ column: 'email', op: 'eq', value: email }],
      single: true,
    });

    if (result?.error || !result?.data) {
      writeSession(null);
      return null;
    }

    const normalizedUser = toClientUser(result.data);
    if (!normalizedUser?.id) {
      writeSession(null);
      return null;
    }

    const nextSession = { ...session, user: normalizedUser };
    writeSession(nextSession);
    return nextSession;
  }

  async function api(path, payload) {
    let response;
    try {
      response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
    } catch (_networkError) {
      return {
        data: null,
        error: {
          message: 'Falha de conexao com o servidor. Verifique se o backend esta rodando e acessivel na rede.',
        },
      };
    }

    const json = await response.json().catch(() => ({ data: null, error: { message: 'Resposta invalida do servidor' } }));
    if (!response.ok) {
      return { data: null, error: json.error || { message: `HTTP ${response.status}` } };
    }
    return json;
  }

  class QueryBuilder {
    constructor(table) {
      this.table = table;
      this.state = {
        table,
        action: null,
        select: '*',
        filters: [],
        order: null,
        single: false,
        data: null,
        or: null,
        returning: null,
      };
    }

    select(columns = '*') {
      if (this.state.action && this.state.action !== 'select') {
        this.state.returning = columns;
        return this;
      }
      this.state.action = 'select';
      this.state.select = columns;
      return this;
    }

    insert(rows) {
      this.state.action = 'insert';
      this.state.data = rows;
      return this;
    }

    update(data) {
      this.state.action = 'update';
      this.state.data = data;
      return this;
    }

    delete() {
      this.state.action = 'delete';
      return this;
    }

    eq(column, value) {
      this.state.filters.push({ column, op: 'eq', value });
      return this;
    }

    neq(column, value) {
      this.state.filters.push({ column, op: 'neq', value });
      return this;
    }

    order(column, options = {}) {
      this.state.order = {
        column,
        ascending: options.ascending !== false,
      };
      return this;
    }

    single() {
      this.state.single = true;
      return this;
    }

    or(expression) {
      this.state.or = expression;
      return this;
    }

    then(resolve, reject) {
      return this.execute().then(resolve, reject);
    }

    catch(reject) {
      return this.execute().catch(reject);
    }

    finally(callback) {
      return this.execute().finally(callback);
    }

    async execute() {
      if (!this.state.action) {
        this.state.action = 'select';
      }
      return api('/api/db/query', this.state);
    }
  }

  function createClient() {
    return {
      auth: {
        onAuthStateChange(callback) {
          authListeners.add(callback);
          return {
            data: {
              subscription: {
                unsubscribe() {
                  authListeners.delete(callback);
                },
              },
            },
          };
        },

        async getSession() {
          const session = readSession();
          const normalized = await normalizeSessionUserId(session);
          return { data: { session: normalized }, error: null };
        },

        async getUser() {
          const session = readSession();
          const normalized = await normalizeSessionUserId(session);
          return { data: { user: normalized ? normalized.user : null }, error: null };
        },

        async signInWithPassword({ email, password }) {
          const result = await api('/api/auth/login', { email, password });
          if (result.error) return { data: null, error: result.error };

          writeSession(result.data);
          notifyAuth('SIGNED_IN', result.data);
          return { data: result.data, error: null };
        },

        async signUp({ email, password, options }) {
          const result = await api('/api/auth/signup', { email, password, options });
          if (result.error) return { data: null, error: result.error };

          const session = { user: result.data.user };
          writeSession(session);
          notifyAuth('SIGNED_IN', session);
          return { data: result.data, error: null };
        },

        async updateUser(updateData) {
          const session = readSession();
          const user = session ? session.user : null;
          if (!user) {
            return { data: null, error: { message: 'Usuário não autenticado' } };
          }

          const result = await api('/api/auth/update', {
            userId: user.id,
            updateData,
          });

          if (result.error) return { data: null, error: result.error };

          const nextSession = { user: result.data.user };
          writeSession(nextSession);
          notifyAuth('USER_UPDATED', nextSession);
          return { data: result.data, error: null };
        },

        async signOut() {
          writeSession(null);
          notifyAuth('SIGNED_OUT', null);
          return { error: null };
        },
      },

      from(table) {
        return new QueryBuilder(table);
      },

      channel(_name) {
        return {
          on() {
            return this;
          },
          subscribe(callback) {
            if (typeof callback === 'function') callback('SUBSCRIBED');
            return this;
          },
        };
      },

      removeChannel() {
        return true;
      },
    };
  }

  // Primary global factory used by db-client-config.js
  window.postgres = {
    createClient,
  };

  // Backward compatibility aliases (legacy naming)
  window.supabase = {
    createClient,
  };
})();







