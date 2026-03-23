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
    const contentEl = document.getElementById('noticeContent');

    const priorityWeight = { urgent: 0, high: 1, medium: 2, low: 3 };

    let notices = [];
    let filteredNotices = [];
    let useLocalFallback = false;
    let fallbackNotified = false;
    let initialized = false;

    const notify = (message, type = 'info') => {
        if (window.UtilsModule && typeof window.UtilsModule.showNotification === 'function') {
            window.UtilsModule.showNotification(message, type);
            return;
        }
        console.log(`[${type}] ${message}`);
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
        created_at: item?.created_at || null,
        updated_at: item?.updated_at || null,
    });

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
            const { data, error } = await window.supabaseClient
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
            const expiredText = notice.status === 'active' && isExpired(notice) ? '<span class="notice-expired">Expirado</span>' : '';
            const priorityText = notice.priority === 'urgent'
                ? 'Urgente'
                : notice.priority === 'high'
                    ? 'Alta'
                    : notice.priority === 'low'
                        ? 'Baixa'
                        : 'Media';

            return `
                <article class="notice-card priority-${escapeHtml(notice.priority)} status-${escapeHtml(notice.status)}" data-notice-id="${escapeHtml(notice.id)}">
                    <div class="notice-card-header">
                        <h3>${escapeHtml(notice.title || 'Sem titulo')}</h3>
                        <span class="notice-priority">${priorityText}</span>
                    </div>
                    <p class="notice-content">${escapeHtml(notice.content || '')}</p>
                    <div class="notice-meta">
                        <span>Status: ${statusText}</span>
                        <span>Criado em: ${formatDate(notice.created_at)}</span>
                        <span>Visivel ate: ${formatDate(notice.visible_until)}</span>
                        ${expiredText}
                    </div>
                    <div class="notice-actions">
                        <button type="button" class="btn btn-secondary" data-edit-notice="${escapeHtml(notice.id)}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    </div>
                </article>
            `;
        }).join('');

        listEl.querySelectorAll('[data-edit-notice]').forEach((button) => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-edit-notice');
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
        deleteBtn.style.display = 'none';
    };

    const openModal = (notice) => {
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
        contentEl.value = notice.content || '';
        deleteBtn.style.display = 'inline-flex';
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
            const sessionResult = await window.supabaseClient.auth.getSession();
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
            created_by: userId,
            updated_at: new Date().toISOString(),
        };
    };

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

        showLoading('Salvando aviso...');
        try {
            if (useLocalFallback) {
                if (noticeId) updateLocal(noticeId, payload);
                else insertLocal(payload);
            } else if (noticeId) {
                const { error } = await window.supabaseClient
                    .from('notice_board_posts')
                    .update(payload)
                    .eq('id', noticeId);
                if (error) throw error;
            } else {
                const insertPayload = { ...payload };
                delete insertPayload.updated_at;
                const { error } = await window.supabaseClient
                    .from('notice_board_posts')
                    .insert([insertPayload]);
                if (error) throw error;
            }

            notify('Aviso salvo com sucesso.', 'success');
            closeModal();
            await loadNotices();
            applyFilters();
        } catch (error) {
            console.error('Erro ao salvar aviso:', error);
            notify(`Falha ao salvar aviso: ${error.message || 'erro inesperado'}`, 'error');
        } finally {
            hideLoading();
        }
    };

    const deleteNotice = async () => {
        const noticeId = idEl.value;
        if (!noticeId) return;
        if (!window.confirm('Deseja excluir este aviso?')) return;

        showLoading('Excluindo aviso...');
        try {
            if (useLocalFallback) {
                deleteLocal(noticeId);
            } else {
                const { error } = await window.supabaseClient
                    .from('notice_board_posts')
                    .delete()
                    .eq('id', noticeId);
                if (error) throw error;
            }

            notify('Aviso excluido com sucesso.', 'success');
            closeModal();
            await loadNotices();
            applyFilters();
        } catch (error) {
            console.error('Erro ao excluir aviso:', error);
            notify(`Falha ao excluir aviso: ${error.message || 'erro inesperado'}`, 'error');
        } finally {
            hideLoading();
        }
    };

    const attachEvents = () => {
        if (newBtn) newBtn.addEventListener('click', () => openModal(null));
        if (searchEl) searchEl.addEventListener('input', applyFilters);
        if (statusFilterEl) statusFilterEl.addEventListener('change', applyFilters);

        if (formEl) formEl.addEventListener('submit', (event) => void saveNotice(event));
        if (deleteBtn) deleteBtn.addEventListener('click', () => void deleteNotice());

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
