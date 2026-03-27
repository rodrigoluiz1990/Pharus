const LoginNoticesModalModule = (() => {
    const TRIGGER_KEY = 'pharus_open_notices_after_login';
    const modalEl = document.getElementById('loginNoticesModal');
    const closeBtn = document.getElementById('closeLoginNoticesModal');
    const okBtn = document.getElementById('okLoginNoticesBtn');
    const listEl = document.getElementById('loginNoticesList');
    const countEl = document.getElementById('loginNoticesCount');

    const isExpired = (visibleUntil) => {
        if (!visibleUntil) return false;
        const end = new Date(visibleUntil);
        if (Number.isNaN(end.getTime())) return false;
        end.setHours(23, 59, 59, 999);
        return end < new Date();
    };

    const isAllowedByGroup = (notice, currentGroupId) => {
        const target = String(notice?.permission_group_id || '').trim();
        if (!target) return true;
        return target === String(currentGroupId || '').trim();
    };

    const closeModal = () => {
        if (!modalEl) return;
        modalEl.style.display = 'none';
    };

    const openModal = () => {
        if (!modalEl) return;
        modalEl.style.display = 'flex';
    };

    const buildPriorityLabel = (priority) => {
        if (priority === 'urgent') return 'Urgente';
        if (priority === 'high') return 'Alta';
        if (priority === 'low') return 'Baixa';
        return 'Média';
    };

    const renderNotices = (items) => {
        if (!listEl) return;
        const notices = Array.isArray(items) ? items : [];

        if (countEl) {
            countEl.textContent = notices.length === 1
                ? '1 aviso disponível'
                : `${notices.length} avisos disponíveis`;
        }

        if (!notices.length) {
            listEl.innerHTML = `
                <div class="login-notices-empty">
                    <i class="fas fa-bullhorn"></i>
                    <p>Nenhum aviso ativo para o seu grupo.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = notices.map((notice) => `
            <article class="login-notice-card priority-${String(notice.priority || 'medium')}">
                <header class="login-notice-card-header">
                    <h4>${window.UtilsModule ? window.UtilsModule.escapeHtml(notice.title || 'Sem titulo') : (notice.title || 'Sem titulo')}</h4>
                    <span class="login-notice-priority">${buildPriorityLabel(notice.priority)}</span>
                </header>
                <p>${window.UtilsModule ? window.UtilsModule.escapeHtml(notice.content || '') : (notice.content || '')}</p>
            </article>
        `).join('');
    };

    const getCurrentUserGroupId = async () => {
        try {
            const sessionResult = await window.dbClient.auth.getSession();
            const userId = sessionResult?.data?.session?.user?.id;
            if (!userId) return null;

            const { data, error } = await window.dbClient
                .from('app_users')
                .select('permission_group_id')
                .eq('id', userId)
                .single();
            if (error) throw error;
            return data?.permission_group_id || null;
        } catch (_error) {
            return null;
        }
    };

    const loadVisibleNotices = async () => {
        let rawData = [];
        let error = null;

        const fullResult = await window.dbClient
            .from('notice_board_posts')
            .select('id, title, content, priority, status, visible_until, permission_group_id, created_at')
            .order('created_at', { ascending: false });

        rawData = fullResult?.data || [];
        error = fullResult?.error || null;

        if (error) {
            const fallbackResult = await window.dbClient
                .from('notice_board_posts')
                .select('id, title, content, priority, visible_until, permission_group_id, created_at')
                .order('created_at', { ascending: false });
            rawData = fallbackResult?.data || [];
            error = fallbackResult?.error || null;
        }

        if (error) throw error;

        const currentGroupId = await getCurrentUserGroupId();
        return rawData.filter((notice) => {
            const status = String(notice?.status || 'active').toLowerCase();
            if (status && status !== 'active') return false;
            if (isExpired(notice?.visible_until)) return false;
            return isAllowedByGroup(notice, currentGroupId);
        });
    };

    const attachEvents = () => {
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (okBtn) okBtn.addEventListener('click', closeModal);
    };

    const shouldOpen = () => sessionStorage.getItem(TRIGGER_KEY) === '1';
    const clearTrigger = () => sessionStorage.removeItem(TRIGGER_KEY);

    const init = async () => {
        if (!modalEl || !shouldOpen()) return;
        clearTrigger();
        attachEvents();

        try {
            const notices = await loadVisibleNotices();
            renderNotices(notices);
            openModal();
        } catch (error) {
            console.error('Erro ao carregar avisos de login:', error);
        }
    };

    return { init };
})();



