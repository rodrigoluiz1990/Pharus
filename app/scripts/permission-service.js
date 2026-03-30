// scripts/permission-service.js
const PermissionService = (() => {
    const PAGE_SCREEN_MAP = {
        'dashboard.html': 'dashboard',
        'agenda.html': 'agenda',
        'avisos.html': 'avisos',
        'quadrodetarefas.html': 'quadro_tarefas',
        'clientes.html': 'clientes',
        'chatconversas.html': 'chat',
        'chat.html': 'chat',
        'chatpanel.html': 'chat',
        'relatorios.html': 'relatorios',
        'configuracoes.html': 'configuracoes',
        'users.html': 'usuarios',
    };

    const CONFIG_OPTIONS = ['view', 'project', 'permissions', 'users', 'table', 'extension', 'maintenance'];
    const state = {
        loaded: false,
        userId: null,
        groupId: null,
        role: 'user',
        permissions: new Set(),
        pageAccessDenied: false,
        deniedNotifiedAt: 0,
        deniedNotifiedForPage: false,
    };

    const keyOf = (screen, option) => `${String(screen || '').trim()}|${String(option || '').trim()}`;
    const isNumericId = (value) => /^[0-9]+$/.test(String(value || '').trim());

    const getCurrentPage = () => {
        const path = String(window.location.pathname || '');
        return path.split('/').pop() || '';
    };

    const notifyDenied = (message, options = {}) => {
        const force = Boolean(options && options.force);
        const now = Date.now();
        if (state.pageAccessDenied && !force) return;
        if (now - state.deniedNotifiedAt < 1200) return;
        state.deniedNotifiedAt = now;

        const text = String(message || 'Você não tem permissão para executar esta ação.');
        if (window.UtilsModule && typeof window.UtilsModule.showPermissionDeniedModal === 'function') {
            window.UtilsModule.showPermissionDeniedModal(text);
            return;
        }
        window.alert(text);
    };

    const renderDeniedPageState = (message) => {
        const root = document.querySelector('.main-content') || document.querySelector('.content') || document.body;
        if (!root) return;

        const blocked = document.getElementById('permissionBlockedPage');
        if (blocked) return;

        const block = document.createElement('section');
        block.id = 'permissionBlockedPage';
        block.style.background = '#fff';
        block.style.border = '1px solid #dce3ec';
        block.style.borderRadius = '10px';
        block.style.padding = '20px';
        block.style.margin = '16px';
        block.style.color = '#2f465e';
        block.innerHTML = `
            <h3 style="margin:0 0 8px;">Acesso negado</h3>
            <p style="margin:0;">${String(message || 'Você não tem permissão para acessar esta tela.')}</p>
        `;

        const projectContent = root.querySelector('.project-content');
        if (projectContent) {
            const children = Array.from(projectContent.children);
            children.forEach((child) => {
                if (child.id === 'permissionBlockedPage') return;
                child.style.display = 'none';
            });
            projectContent.appendChild(block);
            return;
        }

        const dynamicContainers = [
            'taskBoard',
            'sociousView',
            'agendaCalendarGrid',
            'agendaUpcomingList',
            'noticesList',
            'clientsTableBody',
            'usersTableBody',
            'reportListBody',
            'reportBuilderListBody',
            'chatContactsList',
            'chatConversationMessages',
        ];
        dynamicContainers.forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });
        root.appendChild(block);
    };

    const has = (screen, option = 'view') => state.permissions.has(keyOf(screen, option));

    const hasAny = (screen, options) => {
        const list = Array.isArray(options) ? options : [];
        return list.some((option) => has(screen, option));
    };

    const canViewScreen = (screen) => {
        if (!screen) return true;
        if (screen === 'configuracoes') {
            return hasAny('configuracoes', CONFIG_OPTIONS);
        }
        return has(screen, 'view');
    };

    const canAccessCurrentPage = () => {
        const screen = PAGE_SCREEN_MAP[getCurrentPage()];
        return canViewScreen(screen);
    };

    const ensure = (screen, option = 'view', message) => {
        if (state.pageAccessDenied) return false;
        if (has(screen, option)) return true;
        notifyDenied(message || 'Você não tem permissão para executar esta ação.');
        return false;
    };

    const getFallbackPage = () => {
        const priority = [
            ['quadrodetarefas.html', 'quadro_tarefas'],
            ['dashboard.html', 'dashboard'],
            ['agenda.html', 'agenda'],
            ['avisos.html', 'avisos'],
            ['clientes.html', 'clientes'],
            ['chatconversas.html', 'chat'],
            ['relatorios.html', 'relatorios'],
            ['configuracoes.html', 'configuracoes'],
        ];

        const found = priority.find(([, screen]) => canViewScreen(screen));
        return found ? found[0] : 'login.html';
    };

    const guardPageAccess = () => {
        if (canAccessCurrentPage()) return true;
        if (!state.deniedNotifiedForPage) {
            state.deniedNotifiedForPage = true;
            notifyDenied('Você não tem permissão para acessar esta tela.', { force: true });
        }
        state.pageAccessDenied = true;
        renderDeniedPageState('Você não tem permissão para visualizar esta tela.');
        return false;
    };

    const applySidebarVisibility = () => {
        const items = Array.from(document.querySelectorAll('.menu-item[data-page]'));
        if (!items.length) return;

        const pageMap = {
            'dashboard.html': 'dashboard',
            'agenda.html': 'agenda',
            'avisos.html': 'avisos',
            'quadrodetarefas.html': 'quadro_tarefas',
            'clientes.html': 'clientes',
            'chatconversas.html': 'chat',
            'relatorios.html': 'relatorios',
            'configuracoes.html': 'configuracoes',
        };

        items.forEach((item) => {
            const page = String(item.getAttribute('data-page') || '').trim();
            const screen = pageMap[page];
            if (!screen) return;
            const visible = canViewScreen(screen);
            item.style.display = visible ? '' : 'none';
        });
    };

    const bindAction = (elementOrSelector, screen, option, message) => {
        const elements = typeof elementOrSelector === 'string'
            ? Array.from(document.querySelectorAll(elementOrSelector))
            : [elementOrSelector].filter(Boolean);

        if (!elements.length) return;

        const allowed = has(screen, option);
        elements.forEach((element) => {
            if (!element) return;
            element.disabled = !allowed && element.tagName === 'BUTTON';
            element.classList.toggle('permission-disabled', !allowed);
            if (!allowed) {
                element.title = message || 'Sem permissão';
                element.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    notifyDenied(message || 'Você não tem permissão para executar esta ação.');
                });
            }
        });
    };

    const loadCurrentUserRow = async () => {
        const { data: sessionData, error: sessionError } = await window.dbClient.auth.getSession();
        if (sessionError) throw sessionError;
        const sessionUser = sessionData?.session?.user;
        if (!sessionUser?.id && !sessionUser?.email) return null;

        if (isNumericId(sessionUser.id)) {
            const byId = await window.dbClient
                .from('app_users')
                .select('id, role, permission_group_id, email')
                .eq('id', Number(sessionUser.id))
                .single();
            if (!byId.error && byId.data) return byId.data;
        }

        const email = String(sessionUser?.email || '').trim().toLowerCase();
        if (!email) return null;
        const byEmail = await window.dbClient
            .from('app_users')
            .select('id, role, permission_group_id, email')
            .eq('email', email)
            .single();
        if (byEmail.error || !byEmail.data) return null;
        return byEmail.data;
    };

    const init = async (force = false) => {
        if (state.loaded && !force) return state;
        state.permissions = new Set();
        state.loaded = false;
        state.userId = null;
        state.groupId = null;
        state.role = 'user';

        try {
            if (!window.dbClient) return state;

            const userRow = await loadCurrentUserRow();
            if (!userRow) return state;

            state.userId = userRow.id || null;
            state.groupId = userRow.permission_group_id || null;
            state.role = String(userRow.role || 'user').toLowerCase();

            if (state.groupId) {
                const { data, error } = await window.dbClient
                    .from('permission_group_rules')
                    .select('screen_key, option_key, allowed')
                    .eq('group_id', state.groupId);
                if (error) throw error;
                (Array.isArray(data) ? data : [])
                    .filter((row) => row.allowed !== false)
                    .forEach((row) => {
                        state.permissions.add(keyOf(row.screen_key, row.option_key));
                    });
            }
            state.loaded = true;
            document.dispatchEvent(new CustomEvent('pharus:permissions-loaded', { detail: { ...state } }));
        } catch (error) {
            console.warn('Falha ao carregar permissões do usuário atual:', error);
        }

        return state;
    };

    return {
        init,
        has,
        hasAny,
        ensure,
        bindAction,
        canViewScreen,
        canAccessCurrentPage,
        guardPageAccess,
        applySidebarVisibility,
        keyOf,
    };
})();
