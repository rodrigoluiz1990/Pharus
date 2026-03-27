const AvisosModule = (() => {
    const LS_KEY = 'pharus_notice_board_posts_fallback';

    const listEl = document.getElementById('noticesList');
    const newBtn = document.getElementById('newNoticeBtn');
    const searchEl = document.getElementById('noticeSearchInput');
    const statusFilterEl = document.getElementById('noticeStatusFilter');

    const modalEl = document.getElementById('noticeModal');
    const modalTitleEl = document.getElementById('noticeModalTitle');
    const closeModalBtn = document.getElementById('closeNoticeModal');
    const cancelBtn = document.getElementById('cancelNoticeBtn');
    const deleteBtn = document.getElementById('deleteNoticeBtn');

    const formEl = document.getElementById('noticeForm');
    const idEl = document.getElementById('noticeId');
    const titleEl = document.getElementById('noticeTitle');
    const priorityEl = document.getElementById('noticePriority');
    const statusEl = document.getElementById('noticeStatus');
    const visibleUntilEl = document.getElementById('noticeVisibleUntil');
    const permissionGroupEl = document.getElementById('noticePermissionGroup');
    const contentEl = document.getElementById('noticeContent');

    const priorityWeight = { urgent: 0, high: 1, medium: 2, low: 3 };

    let notices = [];
    let filteredNotices = [];
    let permissionGroups = [];
    let currentUserPermissionGroupId = null;
    let useLocalFallback = false;
    let fallbackNotified = false;
    let initialized = false;
    const ensureNoticePermission = (optionKey, message) => {
        if (typeof PermissionService === 'undefined' || typeof PermissionService.ensure !== 'function') return true;
        return PermissionService.ensure('avisos', optionKey, message || 'Você não tem permissão para executar esta ação.');
    };

    const notify = (message, type = 'info') => {
        if (window.UtilsModule && typeof window.UtilsModule.showNotification === 'function') {
            window.UtilsModule.showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }

        if (type === 'error') {
            window.alert(message);
        }
    };

    const showLoading = (message) => {
        if (window.UtilsModule && typeof window.UtilsModule.showLoading === 'function') {
            window.UtilsModule.showLoading(message || 'Carregando avisos...');
        }
    };

    const hideLoading = () => {
        if (window.UtilsModule && typeof window.UtilsModule.hideLoading === 'function') {
            window.UtilsModule.hideLoading();
        }
    };

    const escapeHtml = (value) => {
        if (window.UtilsModule && typeof window.UtilsModule.escapeHtml === 'function') {
            return window.UtilsModule.escapeHtml(String(value ?? ''));
        }
        const div = document.createElement('div');
        div.textContent = String(value ?? '');
        return div.innerHTML;
    };

    const isMissingTableError = (error) => {
        const raw = String(error?.message || error?.details || error || '').toLowerCase();
        return raw.includes('notice_board_posts') && (
            raw.includes('does not exist') ||
            raw.includes('relation') ||
            raw.includes('not found')
        );
    };

    const isSchemaMismatchError = (error) => {
        const raw = String(error?.message || error?.details || error || '').toLowerCase();
        return raw.includes('column') && (
            raw.includes('created_by') ||
            raw.includes('updated_at') ||
            raw.includes('visible_until') ||
            raw.includes('permission_group_id')
        );
    };

    const getLocalNotices = () => {
        try {
            const raw = localStorage.getItem(LS_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (_error) {
            return [];
        }
    };

    const saveLocalNotices = (items) => {
        localStorage.setItem(LS_KEY, JSON.stringify(Array.isArray(items) ? items : []));
    };

    const normalizeNotice = (item) => ({
        id: String(item?.id || ''),
        title: String(item?.title || '').trim(),
        content: String(item?.content || '').trim(),
        priority: ['low', 'medium', 'high', 'urgent'].includes(item?.priority) ? item.priority : 'medium',
        status: item?.status === 'archived' ? 'archived' : 'active',
        visible_until: item?.visible_until || null,
        permission_group_id: item?.permission_group_id || null,
        created_at: item?.created_at || null,
        updated_at: item?.updated_at || null,
    });

    const getPermissionGroupName = (groupId) => {
        const id = String(groupId || '').trim();
        if (!id) return 'Todos os grupos';
        const found = permissionGroups.find((group) => String(group.id) === id);
        return found ? String(found.name || 'Grupo') : 'Grupo especifico';
    };

    const canCurrentUserSeeNotice = (notice) => {
        const targetGroupId = String(notice?.permission_group_id || '').trim();
        if (!targetGroupId) return true;
        return targetGroupId === String(currentUserPermissionGroupId || '').trim();
    };

    const renderPermissionGroupOptions = (selectedId = '') => {
        if (!permissionGroupEl) return;
        permissionGroupEl.innerHTML = '<option value="">Todos os grupos</option>';
        permissionGroups.forEach((group) => {
            const option = document.createElement('option');
            option.value = String(group.id);
            option.textContent = String(group.name || 'Grupo');
            if (selectedId && String(selectedId) === String(group.id)) {
                option.selected = true;
            }
            permissionGroupEl.appendChild(option);
        });
    };

    const loadPermissionGroups = async () => {
        if (!window.dbClient) return;
        try {
            const { data, error } = await window.dbClient
                .from('permission_groups')
                .select('id, name, status')
                .order('name', { ascending: true });
            if (error) throw error;
            permissionGroups = (data || []).filter((item) => String(item.status || 'active') === 'active');
        } catch (error) {
            permissionGroups = [];
            console.warn('Não foi possível carregar grupos de permissao:', error);
        }
        renderPermissionGroupOptions();
    };

    const loadCurrentUserGroup = async () => {
        currentUserPermissionGroupId = null;
        if (!window.dbClient) return;
        try {
            const { data: sessionData, error: sessionError } = await window.dbClient.auth.getSession();
            if (sessionError) throw sessionError;
            const userId = sessionData?.session?.user?.id;
            if (!userId) return;

            const { data: userRow, error: userError } = await window.dbClient
                .from('app_users')
                .select('permission_group_id')
                .eq('id', userId)
                .single();
            if (userError) throw userError;
            currentUserPermissionGroupId = userRow?.permission_group_id || null;
        } catch (error) {
            currentUserPermissionGroupId = null;
            console.warn('Não foi possível identificar grupo do usuario atual:', error);
        }
    };

    const formatDate = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('pt-BR');
    };

    const formatDateForInput = (value) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const isExpired = (notice) => {
        if (!notice?.visible_until) return false;
        const end = new Date(notice.visible_until);
        if (Number.isNaN(end.getTime())) return false;
        end.setHours(23, 59, 59, 999);
        return end < new Date();
    };

    const loadNotices = async () => {
        showLoading('Carregando avisos...');
        try {
            const { data, error } = await window.dbClient
                .from('notice_board_posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            useLocalFallback = false;
            notices = (Array.isArray(data) ? data : []).map(normalizeNotice);
        } catch (error) {
            if (isMissingTableError(error)) {
                useLocalFallback = true;
                notices = getLocalNotices().map(normalizeNotice);
                if (!fallbackNotified) {
                    notify('Tabela notice_board_posts nao encontrada. Usando armazenamento local temporario.', 'warning');
                    fallbackNotified = true;
                }
            } else {
                console.error('Erro ao carregar avisos:', error);
                notify(`Erro ao carregar avisos: ${error.message || 'falha inesperada'}`, 'error');
            }
        } finally {
            hideLoading();
        }
    };

    const applyFilters = () => {
        const query = String(searchEl?.value || '').trim().toLowerCase();
        const status = String(statusFilterEl?.value || 'active').toLowerCase();

        filteredNotices = notices
            .filter((notice) => {
                if (!canCurrentUserSeeNotice(notice)) return false;
                if (status !== 'all' && notice.status !== status) return false;
                if (status === 'active' && isExpired(notice)) return false;

                if (!query) return true;
                const haystack = `${notice.title} ${notice.content}`.toLowerCase();
                return haystack.includes(query);
            })
            .sort((a, b) => {
                if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
                const pa = priorityWeight[a.priority] ?? 9;
                const pb = priorityWeight[b.priority] ?? 9;
                if (pa !== pb) return pa - pb;
                const ad = new Date(a.created_at || 0).getTime();
                const bd = new Date(b.created_at || 0).getTime();
                return bd - ad;
            });

        renderNotices();
    };

    const renderNotices = () => {
        if (!listEl) return;

        if (!filteredNotices.length) {
            listEl.innerHTML = `
                <div class="notice-empty">
                    <i class="fas fa-bullhorn"></i>
                    <p>Nenhum aviso encontrado.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = filteredNotices.map((notice) => {
            const statusText = notice.status === 'active' ? 'Ativo' : 'Arquivado';
            const isNoticeExpired = notice.status === 'active' && isExpired(notice);
            const priorityText = notice.priority === 'urgent'
                ? 'Urgente'
                : notice.priority === 'high'
                    ? 'Alta'
                    : notice.priority === 'low'
                        ? 'Baixa'
                        : 'Média';

            return `
                <article class="notice-card priority-${escapeHtml(notice.priority)} status-${escapeHtml(notice.status)}" data-notice-id="${escapeHtml(notice.id)}">
                    <div class="notice-card-header">
                        <h3>${escapeHtml(notice.title || 'Sem titulo')}</h3>
                        <div class="notice-badges">
                            <span class="notice-priority">${priorityText}</span>
                            <span class="notice-chip notice-status-chip">${statusText}</span>
                        </div>
                    </div>
                    <p class="notice-content">${escapeHtml(notice.content || '')}</p>
                    ${isNoticeExpired ? '<div class="notice-meta"><span class="notice-expired">Expirado</span></div>' : ''}
                </article>
            `;
        }).join('');

        listEl.querySelectorAll('.notice-card[data-notice-id]').forEach((card) => {
            card.addEventListener('click', () => {
                if (!ensureNoticePermission('edit', 'Você não tem permissão para editar avisos.')) return;
                const id = card.getAttribute('data-notice-id');
                const notice = notices.find((item) => String(item.id) === String(id));
                if (notice) openModal(notice);
            });
        });
    };

    const setModalVisible = (visible) => {
        if (!modalEl) return;
        modalEl.style.display = visible ? 'flex' : 'none';
    };

    const resetForm = () => {
        if (!formEl) return;
        formEl.reset();
        idEl.value = '';
        priorityEl.value = 'medium';
        statusEl.value = 'active';
        if (permissionGroupEl) permissionGroupEl.value = '';
        deleteBtn.style.display = 'none';
    };

    const openModal = (notice) => {
        if (notice) {
            if (!ensureNoticePermission('edit', 'Você não tem permissão para editar avisos.')) return;
        } else if (!ensureNoticePermission('create', 'Você não tem permissão para criar avisos.')) {
            return;
        }
        resetForm();

        if (!notice) {
            modalTitleEl.textContent = 'Novo aviso';
            setModalVisible(true);
            return;
        }

        idEl.value = notice.id;
        modalTitleEl.textContent = 'Editar aviso';
        titleEl.value = notice.title || '';
        priorityEl.value = notice.priority || 'medium';
        statusEl.value = notice.status || 'active';
        visibleUntilEl.value = formatDateForInput(notice.visible_until);
        renderPermissionGroupOptions(notice.permission_group_id || '');
        contentEl.value = notice.content || '';
        const canArchive = typeof PermissionService === 'undefined' || typeof PermissionService.has !== 'function'
            ? true
            : PermissionService.has('avisos', 'archive');
        deleteBtn.style.display = notice.status === 'active' && canArchive ? 'inline-flex' : 'none';
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
    };

    const readPayload = async () => {
        const title = String(titleEl.value || '').trim();
        const content = String(contentEl.value || '').trim();

        if (!title) {
            notify('Informe o titulo do aviso.', 'warning');
            return null;
        }

        if (!content) {
            notify('Informe o conteudo do aviso.', 'warning');
            return null;
        }

        let userId = null;
        try {
            const sessionResult = await window.dbClient.auth.getSession();
            userId = sessionResult?.data?.session?.user?.id || null;
        } catch (_error) {
            userId = null;
        }

        return {
            title,
            content,
            priority: ['low', 'medium', 'high', 'urgent'].includes(priorityEl.value) ? priorityEl.value : 'medium',
            status: statusEl.value === 'archived' ? 'archived' : 'active',
            visible_until: visibleUntilEl.value || null,
            permission_group_id: permissionGroupEl ? (permissionGroupEl.value || null) : null,
            created_by: userId,
            updated_at: new Date().toISOString(),
        };
    };

    const toBasePayload = (payload) => ({
        title: payload.title,
        content: payload.content,
        priority: payload.priority,
        status: payload.status,
        visible_until: payload.visible_until || null,
        permission_group_id: payload.permission_group_id || null,
    });

    const insertLocal = (payload) => {
        const item = {
            ...payload,
            id: String(Date.now()),
            created_at: new Date().toISOString(),
        };
        const next = [item, ...notices];
        notices = next;
        saveLocalNotices(next);
    };

    const updateLocal = (id, payload) => {
        const next = notices.map((item) => {
            if (String(item.id) !== String(id)) return item;
            return { ...item, ...payload, id: item.id };
        });
        notices = next;
        saveLocalNotices(next);
    };

    const archiveLocal = (id) => {
        const nowIso = new Date().toISOString();
        const next = notices.map((item) => {
            if (String(item.id) !== String(id)) return item;
            return { ...item, status: 'archived', updated_at: nowIso };
        });
        notices = next;
        saveLocalNotices(next);
    };

    const deleteLocal = (id) => {
        const next = notices.filter((item) => String(item.id) !== String(id));
        notices = next;
        saveLocalNotices(next);
    };

    const saveNotice = async (event) => {
        event.preventDefault();

        const payload = await readPayload();
        if (!payload) return;

        const noticeId = idEl.value;
        const permissionKey = noticeId ? 'edit' : 'create';
        if (!ensureNoticePermission(permissionKey, noticeId ? 'Você não tem permissão para editar avisos.' : 'Você não tem permissão para criar avisos.')) {
            return;
        }

        showLoading('Salvando aviso...');
        try {
            if (useLocalFallback) {
                if (noticeId) updateLocal(noticeId, payload);
                else insertLocal(payload);
            } else if (noticeId) {
                let { error } = await window.dbClient
                    .from('notice_board_posts')
                    .update(payload)
                    .eq('id', noticeId);

                if (error && isSchemaMismatchError(error)) {
                    const basePayload = toBasePayload(payload);
                    const retry = await window.dbClient
                        .from('notice_board_posts')
                        .update(basePayload)
                        .eq('id', noticeId);
                    error = retry.error;
                }

                if (error) throw error;
            } else {
                const insertPayload = { ...payload };
                delete insertPayload.updated_at;
                let { error } = await window.dbClient
                    .from('notice_board_posts')
                    .insert([insertPayload]);

                if (error && isSchemaMismatchError(error)) {
                    const basePayload = toBasePayload(payload);
                    const retry = await window.dbClient
                        .from('notice_board_posts')
                        .insert([basePayload]);
                    error = retry.error;
                }

                if (error) throw error;
            }

            notify('Aviso salvo com sucesso.', 'success');
            closeModal();
            await loadNotices();
            applyFilters();
        } catch (error) {
            console.error('Erro ao salvar aviso:', error);
            if (isMissingTableError(error)) {
                if (noticeId) updateLocal(noticeId, payload);
                else insertLocal(payload);
                useLocalFallback = true;
                notify('Aviso salvo localmente (tabela do banco ainda nao existe).', 'warning');
                closeModal();
                applyFilters();
                return;
            }
            notify(`Falha ao salvar aviso: ${error.message || 'erro inesperado'}`, 'error');
        } finally {
            hideLoading();
        }
    };

    const archiveNotice = async () => {
        if (!ensureNoticePermission('archive', 'Você não tem permissão para arquivar avisos.')) return;
        const noticeId = idEl.value;
        if (!noticeId) return;
        if (!window.confirm('Deseja arquivar este aviso?')) return;

        showLoading('Arquivando aviso...');
        try {
            if (useLocalFallback) {
                archiveLocal(noticeId);
            } else {
                const { error } = await window.dbClient
                    .from('notice_board_posts')
                    .update({ status: 'archived', updated_at: new Date().toISOString() })
                    .eq('id', noticeId);
                if (error) throw error;
            }

            notify('Aviso arquivado com sucesso.', 'success');
            closeModal();
            await loadNotices();
            applyFilters();
        } catch (error) {
            console.error('Erro ao arquivar aviso:', error);
            notify(`Falha ao arquivar aviso: ${error.message || 'erro inesperado'}`, 'error');
        } finally {
            hideLoading();
        }
    };

    const attachEvents = () => {
        if (newBtn) {
            const canCreate = typeof PermissionService === 'undefined' || typeof PermissionService.has !== 'function'
                ? true
                : PermissionService.has('avisos', 'create');
            newBtn.disabled = !canCreate;
            newBtn.addEventListener('click', () => openModal(null));
        }
        if (searchEl) searchEl.addEventListener('input', applyFilters);
        if (statusFilterEl) statusFilterEl.addEventListener('change', applyFilters);

        if (formEl) formEl.addEventListener('submit', (event) => void saveNotice(event));
        if (deleteBtn) deleteBtn.addEventListener('click', () => void archiveNotice());

        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        if (modalEl) {
            modalEl.addEventListener('click', (event) => {
                if (event.target === modalEl) closeModal();
            });
        }
    };

    const init = async () => {
        if (initialized) return;
        initialized = true;

        attachEvents();
        await loadPermissionGroups();
        await loadCurrentUserGroup();
        await loadNotices();
        applyFilters();
    };

    return { init };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        void AvisosModule.init();
    });
} else {
    void AvisosModule.init();
}


