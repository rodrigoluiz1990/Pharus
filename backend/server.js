const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const CHAT_UPLOAD_DIR = path.join(__dirname, 'uploads', 'chat');
const MAX_CHAT_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'pharus',
});

app.use(express.json({ limit: '20mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.static(path.join(__dirname, '..')));

const TABLE_COLUMNS = {
  app_users: [
    'id',
    'email',
    'password',
    'raw_user_meta_data',
    'role',
    'status',
    'last_sign_in_at',
    'created_at',
    'updated_at',
  ],
  user_profiles: [
    'id',
    'email',
    'full_name',
    'role',
    'status',
    'last_sign_in_at',
    'created_at',
    'updated_at',
  ],
  columns: ['id', 'title', 'type', 'position', 'created_at', 'updated_at'],
  tasks: [
    'id',
    'title',
    'description',
    'status',
    'priority',
    'assignee',
    'request_date',
    'due_date',
    'observation',
    'jira',
    'client',
    'is_pinned',
    'focus_order',
    'type',
    'column_id',
    'completed',
    'created_at',
    'updated_at',
  ],
  clients: [
    'id',
    'name',
    'acronym',
    'contact_name',
    'email',
    'phone',
    'status',
    'notes',
    'created_at',
    'updated_at',
  ],
  chat_messages: [
    'id',
    'sender_id',
    'receiver_id',
    'message',
    'attachment_name',
    'attachment_path',
    'attachment_type',
    'attachment_size',
    'edited_at',
    'is_read',
    'created_at',
  ],
};

const MUTABLE_TABLES = new Set(['app_users', 'columns', 'tasks', 'clients', 'chat_messages']);

function normalizeTable(table) {
  if (!table || typeof table !== 'string') return null;
  return Object.prototype.hasOwnProperty.call(TABLE_COLUMNS, table) ? table : null;
}

function normalizeSelect(select, table) {
  const allowed = TABLE_COLUMNS[table];
  if (!allowed) return '*';
  if (!select || select === '*' || select.trim() === '*') return '*';

  const requested = select
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const valid = requested.filter((col) => allowed.includes(col));
  return valid.length > 0 ? valid.join(', ') : '*';
}

function parseSimpleOr(orExpr, values, table) {
  if (typeof orExpr !== 'string' || !orExpr.trim()) return null;
  if (table !== 'chat_messages') return null;

  const pattern =
    /^and\(sender_id\.eq\.([a-f0-9-]+),receiver_id\.eq\.([a-f0-9-]+)\),and\(sender_id\.eq\.([a-f0-9-]+),receiver_id\.eq\.([a-f0-9-]+)\)$/i;
  const match = orExpr.trim().match(pattern);
  if (!match) return null;

  values.push(match[1], match[2], match[3], match[4]);
  const b = values.length;
  return `(sender_id = $${b - 3} AND receiver_id = $${b - 2}) OR (sender_id = $${b - 1} AND receiver_id = $${b})`;
}

function buildWhere(filters, orExpr, values, table) {
  const clauses = [];
  const allowed = TABLE_COLUMNS[table] || [];
  const safeFilters = Array.isArray(filters) ? filters : [];

  for (const filter of safeFilters) {
    if (!filter || !allowed.includes(filter.column)) continue;
    const op = filter.op;
    if (op !== 'eq' && op !== 'neq') continue;
    values.push(filter.value);
    const index = values.length;
    clauses.push(`${filter.column} ${op === 'eq' ? '=' : '<>'} $${index}`);
  }

  const orClause = parseSimpleOr(orExpr, values, table);
  if (orClause) {
    clauses.push(`(${orClause})`);
  }

  return clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
}

function formatError(error) {
  return { message: error?.message || 'Erro interno no servidor' };
}

function ensureChatUploadDir() {
  if (!fs.existsSync(CHAT_UPLOAD_DIR)) {
    fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
  }
}

function sanitizeFileName(fileName) {
  const base = String(fileName || 'arquivo')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return base || 'arquivo';
}

function detectExtension(mimeType, originalName) {
  const explicitExt = path.extname(String(originalName || '')).trim();
  if (explicitExt) return explicitExt.slice(0, 12);

  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'text/plain': '.txt',
    'application/zip': '.zip',
    'application/json': '.json',
    'text/csv': '.csv',
    'application/csv': '.csv',
    'application/xml': '.xml',
    'text/xml': '.xml',
    'application/sql': '.sql',
    'text/x-sql': '.sql',
    'application/x-powershell': '.ps1',
    'text/x-shellscript': '.sh',
    'application/x-sh': '.sh',
    'text/markdown': '.md',
    'text/x-patch': '.patch',
    'application/x-patch': '.patch',
    'text/x-diff': '.diff',
    'application/x-diff': '.diff',
  };
  return map[String(mimeType || '').toLowerCase()] || '.bin';
}

function validateAttachmentMime(mimeType) {
  const allowed = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/zip',
    'text/x-patch',
    'application/x-patch',
    'text/x-diff',
    'application/x-diff',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/json',
    'text/csv',
    'application/csv',
    'application/xml',
    'text/xml',
    'application/sql',
    'text/x-sql',
    'text/x-shellscript',
    'application/x-sh',
    'application/x-powershell',
    'text/markdown',
    'application/octet-stream',
  ]);
  return allowed.has(String(mimeType || '').toLowerCase());
}

function validateAttachmentExtension(fileName) {
  const ext = path.extname(String(fileName || '')).toLowerCase();
  const allowed = new Set([
    '.jpg', '.jpeg', '.png', '.webp', '.pdf', '.txt', '.zip',
    '.patch', '.diff', '.doc', '.docx', '.xls', '.xlsx',
    '.log', '.json', '.csv', '.xml', '.sql', '.ps1', '.sh', '.md',
  ]);
  return allowed.has(ext);
}

function toClientUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    user_metadata: {
      ...(user.raw_user_meta_data || {}),
      role: user.role || 'user',
    },
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
  };
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: formatError(error) });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, options } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ data: null, error: { message: 'E-mail e senha são obrigatórios' } });
  }

  try {
    const metadata = (options && options.data) || {};
    const role = metadata.role || 'user';
    const fullName = metadata.full_name || String(email).split('@')[0];

    const result = await pool.query(
      `INSERT INTO app_users (email, password, raw_user_meta_data, role, status, last_sign_in_at)
       VALUES ($1, $2, $3::jsonb, $4, 'active', NOW())
       RETURNING *`,
      [String(email).toLowerCase(), String(password), JSON.stringify({ full_name: fullName }), role]
    );

    res.json({ data: { user: toClientUser(result.rows[0]) }, error: null });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ data: null, error: { message: 'User already registered' } });
    }
    res.status(500).json({ data: null, error: formatError(error) });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ data: null, error: { message: 'E-mail e senha são obrigatórios' } });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM app_users WHERE email = $1 LIMIT 1`,
      [String(email).toLowerCase()]
    );

    const user = result.rows[0];
    if (!user || user.password !== String(password)) {
      return res.status(401).json({ data: null, error: { message: 'Invalid login credentials' } });
    }

    await pool.query('UPDATE app_users SET last_sign_in_at = NOW() WHERE id = $1', [user.id]);
    const fresh = await pool.query('SELECT * FROM app_users WHERE id = $1', [user.id]);
    const session = { user: toClientUser(fresh.rows[0]) };

    res.json({ data: session, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: formatError(error) });
  }
});

app.post('/api/auth/update', async (req, res) => {
  const { userId, updateData } = req.body || {};
  if (!userId || !updateData) {
    return res.status(400).json({ data: null, error: { message: 'Dados inválidos para atualização de usuário' } });
  }

  try {
    const sets = [];
    const values = [];
    let idx = 1;

    if (updateData.email) {
      sets.push(`email = $${idx++}`);
      values.push(String(updateData.email).toLowerCase());
    }
    if (updateData.password) {
      sets.push(`password = $${idx++}`);
      values.push(String(updateData.password));
    }
    if (updateData.data) {
      sets.push(`raw_user_meta_data = $${idx++}::jsonb`);
      values.push(JSON.stringify(updateData.data));
      if (updateData.data.role) {
        sets.push(`role = $${idx++}`);
        values.push(String(updateData.data.role));
      }
    }
    sets.push(`updated_at = NOW()`);

    values.push(userId);
    const whereIdx = values.length;

    const sql = `UPDATE app_users SET ${sets.join(', ')} WHERE id = $${whereIdx} RETURNING *`;
    const result = await pool.query(sql, values);
    const updated = result.rows[0];

    if (!updated) {
      return res.status(404).json({ data: null, error: { message: 'Usuário não encontrado' } });
    }

    res.json({ data: { user: toClientUser(updated) }, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: formatError(error) });
  }
});

app.post('/api/chat/upload', async (req, res) => {
  const { fileName, mimeType, base64Data } = req.body || {};

  if (!fileName || !mimeType || !base64Data) {
    return res.status(400).json({ data: null, error: { message: 'Dados de anexo incompletos' } });
  }

  if (!validateAttachmentMime(mimeType)) {
    return res.status(400).json({ data: null, error: { message: 'Tipo MIME de arquivo nao permitido' } });
  }

  if (!validateAttachmentExtension(fileName)) {
    return res.status(400).json({
      data: null,
      error: {
        message: 'Extensao nao permitida. Permitidos: .pdf .jpg .jpeg .png .webp .txt .zip .patch .diff .doc .docx .xls .xlsx .log .json .csv .xml .sql .ps1 .sh .md',
      },
    });
  }

  try {
    const buffer = Buffer.from(String(base64Data), 'base64');
    if (!buffer || !buffer.length) {
      return res.status(400).json({ data: null, error: { message: 'Arquivo inválido' } });
    }

    if (buffer.length > MAX_CHAT_ATTACHMENT_BYTES) {
      return res.status(400).json({ data: null, error: { message: 'Arquivo excede o limite de 10 MB' } });
    }

    ensureChatUploadDir();
    const ext = detectExtension(mimeType, fileName);
    const safeName = sanitizeFileName(fileName);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    const absolutePath = path.join(CHAT_UPLOAD_DIR, uniqueName);

    await fsp.writeFile(absolutePath, buffer);

    return res.json({
      data: {
        attachment_name: safeName,
        attachment_path: uniqueName,
        attachment_type: mimeType,
        attachment_size: buffer.length,
      },
      error: null,
    });
  } catch (error) {
    return res.status(500).json({ data: null, error: formatError(error) });
  }
});

app.get('/api/chat/attachment/:messageId', async (req, res) => {
  const { messageId } = req.params || {};
  if (!messageId) {
    return res.status(400).json({ data: null, error: { message: 'messageId inválido' } });
  }

  try {
    const result = await pool.query(
      `SELECT attachment_name, attachment_path, attachment_type
       FROM chat_messages
       WHERE id = $1
       LIMIT 1`,
      [String(messageId)]
    );

    const row = result.rows[0];
    if (!row || !row.attachment_path) {
      return res.status(404).json({ data: null, error: { message: 'Anexo não encontrado' } });
    }

    const filePath = path.join(CHAT_UPLOAD_DIR, row.attachment_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ data: null, error: { message: 'Arquivo do anexo não encontrado' } });
    }

    res.setHeader('Content-Type', row.attachment_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${sanitizeFileName(row.attachment_name || 'anexo')}"`
    );
    return res.sendFile(filePath);
  } catch (error) {
    return res.status(500).json({ data: null, error: formatError(error) });
  }
});

app.post('/api/db/query', async (req, res) => {
  const {
    table: rawTable,
    action,
    select,
    filters,
    order,
    single,
    data,
    or,
    returning,
  } = req.body || {};

  const table = normalizeTable(rawTable);
  if (!table) {
    return res.status(400).json({ data: null, error: { message: 'Tabela inválida' } });
  }

  if (!action || typeof action !== 'string') {
    return res.status(400).json({ data: null, error: { message: 'Ação inválida' } });
  }

  try {
    let result;

    if (action === 'select') {
      const values = [];
      const whereSql = buildWhere(filters, or, values, table);
      let orderSql = '';

      if (order && TABLE_COLUMNS[table].includes(order.column)) {
        orderSql = ` ORDER BY ${order.column} ${order.ascending === false ? 'DESC' : 'ASC'}`;
      }

      const columnsSql = normalizeSelect(select || '*', table);
      const sql = `SELECT ${columnsSql} FROM ${table}${whereSql}${orderSql}`;
      result = await pool.query(sql, values);
      const rows = result.rows || [];
      return res.json({ data: single ? rows[0] || null : rows, error: null });
    }

    if (!MUTABLE_TABLES.has(table)) {
      return res.status(400).json({ data: null, error: { message: 'Tabela não suporta escrita' } });
    }

    if (action === 'insert') {
      const rows = Array.isArray(data) ? data : [];
      if (!rows.length) return res.status(400).json({ data: null, error: { message: 'Sem dados para inserir' } });

      const allowed = TABLE_COLUMNS[table];
      const keys = Object.keys(rows[0]).filter((k) => allowed.includes(k) && k !== 'id');
      if (!keys.length) {
        return res.status(400).json({ data: null, error: { message: 'Colunas inválidas para inserção' } });
      }

      const values = [];
      const valuesPlaceholders = rows
        .map((row) => {
          const placeholders = keys.map((k) => {
            values.push(row[k]);
            return `$${values.length}`;
          });
          return `(${placeholders.join(', ')})`;
        })
        .join(', ');

      const returningSql = normalizeSelect(returning || '*', table);
      const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES ${valuesPlaceholders} RETURNING ${returningSql}`;
      result = await pool.query(sql, values);
      const out = result.rows || [];
      return res.json({ data: single ? out[0] || null : out, error: null });
    }

    if (action === 'update') {
      const allowed = TABLE_COLUMNS[table];
      const payload = data || {};
      const keys = Object.keys(payload).filter((k) => allowed.includes(k) && k !== 'id');
      if (!keys.length) {
        return res.status(400).json({ data: null, error: { message: 'Sem campos válidos para update' } });
      }

      const values = [];
      const sets = keys.map((k) => {
        values.push(payload[k]);
        return `${k} = $${values.length}`;
      });

      const whereSql = buildWhere(filters, or, values, table);
      const returningSql = normalizeSelect(returning || '*', table);
      const sql = `UPDATE ${table} SET ${sets.join(', ')}${whereSql} RETURNING ${returningSql}`;
      result = await pool.query(sql, values);
      const out = result.rows || [];
      return res.json({ data: single ? out[0] || null : out, error: null });
    }

    if (action === 'delete') {
      const values = [];
      const whereSql = buildWhere(filters, or, values, table);
      const sql = `DELETE FROM ${table}${whereSql} RETURNING id`;
      result = await pool.query(sql, values);
      const out = result.rows || [];
      return res.json({ data: single ? out[0] || null : out, error: null });
    }

    return res.status(400).json({ data: null, error: { message: 'Ação não suportada' } });
  } catch (error) {
    return res.status(500).json({ data: null, error: formatError(error) });
  }
});

app.get('/api/tasks/focus', async (req, res) => {
  const { email, user_id: userIdRaw, limit: limitRaw } = req.query || {};
  const limit = Math.max(1, Math.min(Number(limitRaw) || 12, 50));

  try {
    let userId = userIdRaw ? String(userIdRaw) : null;

    if (!userId && email) {
      const userResult = await pool.query(
        `SELECT id FROM app_users WHERE email = $1 LIMIT 1`,
        [String(email).toLowerCase()]
      );
      userId = userResult.rows[0]?.id || null;
    }

    const values = [limit];
    let assigneeFilterSql = '';

    if (userId) {
      values.push(userId);
      assigneeFilterSql = `AND t.assignee = $2`;
    }

    const sql = `
      SELECT
        t.id,
        t.title,
        t.status,
        t.priority,
        t.due_date,
        t.client,
        t.is_pinned,
        t.focus_order,
        t.assignee,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email, '') AS assignee_name
      FROM tasks t
      LEFT JOIN app_users u ON u.id = t.assignee
      WHERE COALESCE(t.completed, FALSE) = FALSE
        AND COALESCE(t.status, 'pending') <> 'completed'
        ${assigneeFilterSql}
      ORDER BY
        COALESCE(t.is_pinned, FALSE) DESC,
        COALESCE(t.focus_order, 999999) ASC,
        CASE COALESCE(t.priority, 'medium')
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END ASC,
        COALESCE(t.due_date, DATE '2999-12-31') ASC,
        t.created_at DESC
      LIMIT $1
    `;

    const result = await pool.query(sql, values);
    return res.json({ data: result.rows || [], error: null });
  } catch (error) {
    return res.status(500).json({ data: null, error: formatError(error) });
  }
});

app.post('/api/tasks/focus/update', async (req, res) => {
  const { taskId, isPinned, focusOrder } = req.body || {};
  if (!taskId) {
    return res.status(400).json({ data: null, error: { message: 'taskId e obrigatorio' } });
  }

  const normalizedFocusOrder =
    focusOrder === null || focusOrder === undefined || focusOrder === ''
      ? null
      : Number(focusOrder);

  if (normalizedFocusOrder !== null && !Number.isFinite(normalizedFocusOrder)) {
    return res.status(400).json({ data: null, error: { message: 'focusOrder invalido' } });
  }

  try {
    const result = await pool.query(
      `UPDATE tasks
       SET is_pinned = COALESCE($1, is_pinned),
           focus_order = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, is_pinned, focus_order`,
      [
        typeof isPinned === 'boolean' ? isPinned : null,
        normalizedFocusOrder,
        String(taskId),
      ]
    );

    const updated = result.rows[0];
    if (!updated) {
      return res.status(404).json({ data: null, error: { message: 'Tarefa nao encontrada' } });
    }

    return res.json({ data: updated, error: null });
  } catch (error) {
    return res.status(500).json({ data: null, error: formatError(error) });
  }
});

app.get('*', (req, res) => {
  const normalized = req.path === '/' ? '/index.html' : req.path;
  res.sendFile(path.join(__dirname, '..', normalized));
});

app.listen(PORT, () => {
  console.log(`Pharus local server running on http://localhost:${PORT}`);
});
