const AtendimentoModule = (() => {
    const tableBodyEl = document.getElementById('attendanceTableBody');
    const newBtn = document.getElementById('newAttendanceBtn');
    const searchEl = document.getElementById('attendanceSearch');
    const statusFilterEl = document.getElementById('attendanceStatusFilter');

    const modalEl = document.getElementById('attendanceModal');
    const modalTitleEl = document.getElementById('attendanceModalTitle');
    const closeModalBtn = document.getElementById('closeAttendanceModal');
    const cancelBtn = document.getElementById('cancelAttendanceBtn');
    const deleteBtn = document.getElementById('deleteAttendanceBtn');
    const formEl = document.getElementById('attendanceForm');
    const saveBtn = document.getElementById('saveAttendanceBtn');

    const idEl = document.getElementById('attendanceId');
    const titleEl = document.getElementById('attendanceTitle');
    const clientEl = document.getElementById('attendanceClient');
    const statusEl = document.getElementById('attendanceStatus');
    const priorityEl = document.getElementById('attendancePriority');
    const descriptionEl = document.getElementById('attendanceDescription');
    const responsiblesComboEl = document.getElementById('attendanceResponsiblesCombo');
    const responsiblesToggleEl = document.getElementById('attendanceResponsiblesToggle');
    const responsiblesSummaryEl = document.getElementById('attendanceResponsiblesSummary');
    const responsiblesPanelEl = document.getElementById('attendanceResponsiblesPanel');
    const responsiblesWrapEl = document.getElementById('attendanceResponsiblesOptions');
    const taskSearchEl = document.getElementById('attendanceTaskSearch');
    const taskSuggestionsEl = document.getElementById('attendanceTaskSuggestions');
    const taskSelectedEl = document.getElementById('attendanceTaskSelected');
    const createTaskFromDataEl = document.getElementById('attendanceCreateTaskFromData');
    const attachmentsInputEl = document.getElementById('attendanceAttachments');
    const newAttachmentsEl = document.getElementById('attendanceNewAttachments');
    const savedAttachmentsEl = document.getElementById('attendanceSavedAttachments');

    const commentsSectionEl = document.getElementById('attendanceCommentsSection');
    const commentsListEl = document.getElementById('attendanceCommentsList');
    const commentInputEl = document.getElementById('attendanceCommentInput');
    const addCommentBtn = document.getElementById('attendanceAddCommentBtn');

    let attendances = [];
    let filteredAttendances = [];
    let users = [];
    let tasks = [];
    let clients = [];
    let selectedResponsibles = new Set();
    let selectedTasks = new Set();
    let pendingFiles = [];
    let savedAttachments = [];
    let editingCommentId = null;
    let isInitialized = false;

    const ensurePermission = (optionKey, message) => {
        if (typeof PermissionService === 'undefined' || typeof PermissionService.ensure !== 'function') return true;
        return PermissionService.ensure('atendimento', optionKey, message || 'Voce nao tem permissao para executar esta acao.');
    };
    const hasPermission = (optionKey) => {
        if (typeof PermissionService === 'undefined' || typeof PermissionService.has !== 'function') return true;
        return PermissionService.has('atendimento', optionKey);
    };

    const showLoading = (message) => {
        if (window.UtilsModule && typeof window.UtilsModule.showLoading === 'function') {
            window.UtilsModule.showLoading(message || 'Carregando atendimento...');
        }
    };

    const hideLoading = () => {
        if (window.UtilsModule && typeof window.UtilsModule.hideLoading === 'function') {
            window.UtilsModule.hideLoading();
        }
    };

    const notify = (message, type = 'info') => {
        if (window.UtilsModule && typeof window.UtilsModule.showNotification === 'function') {
            window.UtilsModule.showNotification(message, type);
            return;
        }
        console.log(`[${type}] ${message}`);
    };

    const escapeHtml = (value) => {
        if (window.UtilsModule && typeof window.UtilsModule.escapeHtml === 'function') {
            return window.UtilsModule.escapeHtml(String(value ?? ''));
        }
        const div = document.createElement('div');
        div.textContent = String(value ?? '');
        return div.innerHTML;
    };

    const formatDateTime = (value) => {
        const date = new Date(value || '');
        if (Number.isNaN(date.getTime())) return '-';
        return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const statusText = (value) => {
        if (value === 'in_progress') return 'Em andamento';
        if (value === 'waiting_customer') return 'Aguardando cliente';
        if (value === 'resolved') return 'Resolvido';
        if (value === 'closed') return 'Cancelado';
        return 'Aberto';
    };

    const priorityText = (value) => {
        if (value === 'urgent') return 'Urgente';
        if (value === 'high') return 'Alta';
        if (value === 'low') return 'Baixa';
        return 'Media';
    };

    const fileSizeText = (bytes) => {
        const size = Number(bytes || 0);
        if (!Number.isFinite(size) || size <= 0) return '-';
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getUserLabel = (user) => {
        const fullName = String(user?.raw_user_meta_data?.full_name || '').trim();
        if (fullName) return fullName;
        const email = String(user?.email || '').trim();
        if (!email) return 'Usuario';
        return email.split('@')[0];
    };

    const getClientLabel = (clientId) => {
        const found = clients.find((item) => String(item.id) === String(clientId));
        if (!found) return '-';
        const acronym = String(found.acronym || '').trim();
        return acronym ? `${acronym} - ${found.name}` : String(found.name || '-');
    };

    const clearInvalid = () => {
        if (!formEl) return;
        formEl.querySelectorAll('.field-invalid').forEach((el) => {
            el.classList.remove('field-invalid');
            if (typeof el.setCustomValidity === 'function') {
                el.setCustomValidity('');
            }
        });
    };

    const markInvalid = (field, message) => {
        if (!field) return false;
        field.classList.add('field-invalid');
        if (typeof field.setCustomValidity === 'function') {
            field.setCustomValidity(message || 'Campo invalido.');
        }
        if (typeof field.reportValidity === 'function') {
            field.reportValidity();
        }
        field.focus();
        notify(message || 'Campo invalido.', 'error');
        return false;
    };

    const fileToDataUrl = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Falha ao ler anexo.'));
        reader.readAsDataURL(file);
    });

    const resolveCurrentUserId = async () => {
        try {
            const { data: sessionData } = await window.dbClient.auth.getSession();
            const sessionUser = sessionData?.session?.user;
            const rawId = String(sessionUser?.id || '').trim();
            if (/^[0-9]+$/.test(rawId)) return Number(rawId);
            const email = String(sessionUser?.email || '').trim().toLowerCase();
            if (!email) return null;
            const { data } = await window.dbClient
                .from('app_users')
                .select('id,email')
                .eq('email', email)
                .single();
            if (!data?.id) return null;
            return Number(data.id);
        } catch (_error) {
            return null;
        }
    };

    const setModalVisible = (visible) => {
        if (!modalEl) return;
        modalEl.style.display = visible ? 'flex' : 'none';
    };

    const renderResponsiblesSelector = () => {
        if (!responsiblesWrapEl) return;
        const canAssign = hasPermission('assign');
        responsiblesWrapEl.innerHTML = '';
        users.forEach((user) => {
            const id = String(user.id);
            const checked = selectedResponsibles.has(id) ? 'checked' : '';
            const item = document.createElement('label');
            item.className = 'attendance-check-item';
            item.innerHTML = `
                <input type="checkbox" data-responsible-id="${escapeHtml(id)}" ${checked} ${canAssign ? '' : 'disabled'}>
                <span>${escapeHtml(getUserLabel(user))}</span>
            `;
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) selectedResponsibles.add(id);
                    else selectedResponsibles.delete(id);
                });
            }
            responsiblesWrapEl.appendChild(item);
        });
        responsiblesWrapEl.classList.toggle('selector-readonly', !canAssign);
        updateResponsiblesSummary();
    };

    const updateResponsiblesSummary = () => {
        if (!responsiblesSummaryEl) return;
        const names = users
            .filter((user) => selectedResponsibles.has(String(user.id)))
            .map((user) => getUserLabel(user));
        responsiblesSummaryEl.textContent = names.length ? names.join(', ') : 'Selecionar responsaveis';
    };

    const setResponsiblesPanelVisible = (visible) => {
        if (!responsiblesPanelEl || !responsiblesToggleEl) return;
        responsiblesPanelEl.style.display = visible ? '' : 'none';
        if (!visible) {
            responsiblesPanelEl.style.position = '';
            responsiblesPanelEl.style.top = '';
            responsiblesPanelEl.style.left = '';
            responsiblesPanelEl.style.width = '';
            responsiblesPanelEl.classList.remove('open-upward');
        }
        responsiblesToggleEl.classList.toggle('open', visible);
        responsiblesToggleEl.classList.toggle('open-upward', false);
        if (visible) {
            positionResponsiblesPanel();
        }
    };

    const positionResponsiblesPanel = () => {
        if (!responsiblesPanelEl || !responsiblesToggleEl) return;
        if (responsiblesPanelEl.style.display === 'none') return;
        const rect = responsiblesToggleEl.getBoundingClientRect();
        const viewportPadding = 8;
        const panelHeight = Math.min(responsiblesWrapEl?.scrollHeight || 0, 220) + 12;
        const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
        const spaceAbove = rect.top - viewportPadding;
        const openUpward = panelHeight > spaceBelow && spaceAbove > spaceBelow;

        responsiblesPanelEl.style.position = 'fixed';
        responsiblesPanelEl.style.left = `${Math.round(rect.left)}px`;
        responsiblesPanelEl.style.width = `${Math.round(rect.width)}px`;
        responsiblesPanelEl.style.top = openUpward
            ? `${Math.max(viewportPadding, Math.round(rect.top - panelHeight + 1))}px`
            : `${Math.round(rect.bottom - 1)}px`;
        responsiblesPanelEl.classList.toggle('open-upward', openUpward);
        responsiblesToggleEl.classList.toggle('open-upward', openUpward);
    };

    const renderSelectedTaskChips = () => {
        if (!taskSelectedEl) return;
        const canLinkTask = hasPermission('link_task');
        const items = Array.from(selectedTasks)
            .map((id) => tasks.find((task) => String(task.id) === String(id)))
            .filter(Boolean);

        if (!items.length) {
            taskSelectedEl.innerHTML = '';
            return;
        }

        taskSelectedEl.innerHTML = items.map((task) => `
            <span class="attendance-task-chip">
                ${escapeHtml(task.title || `Tarefa #${task.id}`)}
                ${canLinkTask ? `<button type="button" data-remove-task-id="${escapeHtml(task.id)}"><i class="fas fa-times"></i></button>` : ''}
            </span>
        `).join('');

        taskSelectedEl.querySelectorAll('[data-remove-task-id]').forEach((button) => {
            button.addEventListener('click', () => {
                const id = String(button.getAttribute('data-remove-task-id') || '');
                if (!id) return;
                selectedTasks.delete(id);
                renderSelectedTaskChips();
            });
        });
    };

    const renderTaskSuggestions = () => {
        if (!taskSuggestionsEl || !taskSearchEl) return;
        const canLinkTask = hasPermission('link_task');
        const rawTerm = String(taskSearchEl.value || '').trim().toLowerCase();

        if (!canLinkTask || !rawTerm) {
            taskSuggestionsEl.style.display = 'none';
            taskSuggestionsEl.innerHTML = '';
            return;
        }

        const matches = tasks
            .filter((task) => !selectedTasks.has(String(task.id)))
            .filter((task) => String(task.title || '').toLowerCase().includes(rawTerm))
            .slice(0, 10);

        if (!matches.length) {
            taskSuggestionsEl.style.display = 'none';
            taskSuggestionsEl.innerHTML = '';
            return;
        }

        taskSuggestionsEl.innerHTML = matches.map((task) => `
            <div class="attendance-task-suggestion" data-task-suggestion-id="${escapeHtml(task.id)}">
                ${escapeHtml(task.title || `Tarefa #${task.id}`)}
            </div>
        `).join('');
        taskSuggestionsEl.style.display = '';

        taskSuggestionsEl.querySelectorAll('[data-task-suggestion-id]').forEach((item) => {
            item.addEventListener('click', () => {
                const id = String(item.getAttribute('data-task-suggestion-id') || '');
                if (!id) return;
                selectedTasks.add(id);
                taskSearchEl.value = '';
                taskSuggestionsEl.style.display = 'none';
                taskSuggestionsEl.innerHTML = '';
                renderSelectedTaskChips();
            });
        });
    };

    const renderClientOptions = () => {
        if (!clientEl) return;
        const currentValue = String(clientEl.value || '');
        clientEl.innerHTML = '<option value="">Sem cliente</option>';
        clients.forEach((item) => {
            const option = document.createElement('option');
            option.value = String(item.id);
            option.textContent = getClientLabel(item.id);
            clientEl.appendChild(option);
        });
        if (currentValue) clientEl.value = currentValue;
    };

    const renderPendingFiles = () => {
        if (!newAttachmentsEl) return;
        if (!pendingFiles.length) {
            newAttachmentsEl.innerHTML = '';
            return;
        }
        newAttachmentsEl.innerHTML = pendingFiles.map((file, index) => `
            <div class="attendance-file-item">
                <span>${escapeHtml(file.name)} (${escapeHtml(fileSizeText(file.size))})</span>
                <div class="attendance-file-actions">
                    <button type="button" class="attendance-file-btn" data-remove-pending="${index}">Remover</button>
                </div>
            </div>
        `).join('');
        newAttachmentsEl.querySelectorAll('[data-remove-pending]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const index = Number(btn.getAttribute('data-remove-pending'));
                if (!Number.isInteger(index) || !pendingFiles[index]) return;
                pendingFiles.splice(index, 1);
                renderPendingFiles();
            });
        });
    };

    const renderSavedAttachments = () => {
        if (!savedAttachmentsEl) return;
        if (!savedAttachments.length) {
            savedAttachmentsEl.innerHTML = '';
            return;
        }
        const canDeleteAttachment = typeof PermissionService === 'undefined' || typeof PermissionService.has !== 'function'
            ? true
            : PermissionService.has('atendimento', 'attachment');
        savedAttachmentsEl.innerHTML = savedAttachments.map((file) => `
            <div class="attendance-file-item">
                <span>${escapeHtml(file.file_name || 'Arquivo')} (${escapeHtml(fileSizeText(file.file_size))})</span>
                <div class="attendance-file-actions">
                    <button type="button" class="attendance-file-btn" data-download-attachment="${escapeHtml(file.id)}">Baixar</button>
                    ${canDeleteAttachment ? `<button type="button" class="attendance-file-btn" data-delete-attachment="${escapeHtml(file.id)}">Excluir</button>` : ''}
                </div>
            </div>
        `).join('');

        savedAttachmentsEl.querySelectorAll('[data-download-attachment]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = String(btn.getAttribute('data-download-attachment') || '');
                const file = savedAttachments.find((item) => String(item.id) === id);
                if (!file?.data_url) return;
                const link = document.createElement('a');
                link.href = file.data_url;
                link.download = file.file_name || 'anexo';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        });

        savedAttachmentsEl.querySelectorAll('[data-delete-attachment]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                if (!ensurePermission('attachment', 'Voce nao tem permissao para remover anexo do atendimento.')) return;
                const id = String(btn.getAttribute('data-delete-attachment') || '');
                if (!id) return;
                const { error } = await window.dbClient
                    .from('atendimento_attachments')
                    .delete()
                    .eq('id', id);
                if (error) {
                    notify(`Falha ao excluir anexo: ${error.message || 'erro'}`, 'error');
                    return;
                }
                savedAttachments = savedAttachments.filter((item) => String(item.id) !== id);
                renderSavedAttachments();
                notify('Anexo removido.', 'success');
            });
        });
    };

    const renderComments = async (attendanceId) => {
        if (!commentsListEl) return;
        const { data, error } = await window.dbClient
            .from('atendimento_comments')
            .select('id,atendimento_id,author_id,comment_text,created_at')
            .eq('atendimento_id', attendanceId)
            .order('created_at', { ascending: true });
        if (error) {
            commentsListEl.innerHTML = '<div class="status-hint">Falha ao carregar comentarios.</div>';
            return;
        }
        const items = Array.isArray(data) ? data : [];
        if (!items.length) {
            commentsListEl.innerHTML = '<div class="status-hint">Nenhum comentario.</div>';
            return;
        }

        commentsListEl.innerHTML = items.map((item) => {
            const author = users.find((u) => String(u.id) === String(item.author_id));
            const authorName = author ? getUserLabel(author) : `Usuario ${item.author_id || '-'}`;
            const isEditing = String(editingCommentId || '') === String(item.id);
            return `
                <div class="attendance-comment-item">
                    <div class="attendance-comment-head">
                        <strong>${escapeHtml(authorName)}</strong>
                        <div class="attendance-comment-head-right">
                            <span>${escapeHtml(formatDateTime(item.created_at))}</span>
                            ${hasPermission('comment') ? `<button type="button" class="attendance-file-btn" data-comment-edit="${escapeHtml(item.id)}">Editar</button>` : ''}
                        </div>
                    </div>
                    ${isEditing ? `
                        <div class="attendance-comment-edit-wrap">
                            <textarea class="form-control attendance-comment-edit-input" data-comment-edit-input="${escapeHtml(item.id)}" rows="3">${escapeHtml(item.comment_text || '')}</textarea>
                            <div class="attendance-comment-edit-actions">
                                <button type="button" class="attendance-file-btn" data-comment-save="${escapeHtml(item.id)}">Salvar</button>
                                <button type="button" class="attendance-file-btn" data-comment-cancel="${escapeHtml(item.id)}">Cancelar</button>
                            </div>
                        </div>
                    ` : `
                        <div class="attendance-comment-text">${escapeHtml(item.comment_text || '')}</div>
                    `}
                </div>
            `;
        }).join('');

        commentsListEl.querySelectorAll('[data-comment-edit]').forEach((button) => {
            button.addEventListener('click', () => {
                if (!ensurePermission('comment', 'Voce nao tem permissao para editar comentarios do atendimento.')) return;
                const id = String(button.getAttribute('data-comment-edit') || '');
                if (!id) return;
                editingCommentId = id;
                void renderComments(attendanceId);
            });
        });

        commentsListEl.querySelectorAll('[data-comment-cancel]').forEach((button) => {
            button.addEventListener('click', () => {
                editingCommentId = null;
                void renderComments(attendanceId);
            });
        });

        commentsListEl.querySelectorAll('[data-comment-save]').forEach((button) => {
            button.addEventListener('click', async () => {
                if (!ensurePermission('comment', 'Voce nao tem permissao para editar comentarios do atendimento.')) return;
                const id = String(button.getAttribute('data-comment-save') || '');
                if (!id) return;
                const input = commentsListEl.querySelector(`[data-comment-edit-input="${CSS.escape(id)}"]`);
                const newText = String(input?.value || '').trim();
                if (!newText) {
                    notify('Comentario nao pode ficar vazio.', 'warning');
                    return;
                }
                const { error: updateError } = await window.dbClient
                    .from('atendimento_comments')
                    .update({ comment_text: newText })
                    .eq('id', Number(id));
                if (updateError) {
                    notify(`Falha ao editar comentario: ${updateError.message || 'erro'}`, 'error');
                    return;
                }
                editingCommentId = null;
                await renderComments(attendanceId);
                notify('Comentario atualizado.', 'success');
            });
        });
    };

    const loadAttachments = async (attendanceId) => {
        const { data, error } = await window.dbClient
            .from('atendimento_attachments')
            .select('id,atendimento_id,file_name,file_type,file_size,data_url,created_at')
            .eq('atendimento_id', attendanceId)
            .order('created_at', { ascending: true });
        if (error) {
            savedAttachments = [];
            renderSavedAttachments();
            return;
        }
        savedAttachments = Array.isArray(data) ? data : [];
        renderSavedAttachments();
    };

    const loadLinksForAttendance = async (attendanceId) => {
        const [respResult, tasksResult] = await Promise.all([
            window.dbClient
                .from('atendimento_responsibles')
                .select('id,atendimento_id,user_id')
                .eq('atendimento_id', attendanceId),
            window.dbClient
                .from('atendimento_task_links')
                .select('id,atendimento_id,task_id')
                .eq('atendimento_id', attendanceId),
        ]);

        if (!respResult.error) {
            selectedResponsibles = new Set((respResult.data || []).map((item) => String(item.user_id)));
        }
        if (!tasksResult.error) {
            selectedTasks = new Set((tasksResult.data || []).map((item) => String(item.task_id)));
        }
    };

    const clearForm = () => {
        if (!formEl) return;
        formEl.reset();
        clearInvalid();
        idEl.value = '';
        clientEl.value = '';
        statusEl.value = 'open';
        priorityEl.value = 'medium';
        selectedResponsibles = new Set();
        selectedTasks = new Set();
        pendingFiles = [];
        savedAttachments = [];
        editingCommentId = null;
        renderResponsiblesSelector();
        renderSelectedTaskChips();
        if (taskSearchEl) taskSearchEl.value = '';
        if (taskSuggestionsEl) {
            taskSuggestionsEl.style.display = 'none';
            taskSuggestionsEl.innerHTML = '';
        }
        if (createTaskFromDataEl) createTaskFromDataEl.checked = false;
        setResponsiblesPanelVisible(false);
        renderPendingFiles();
        renderSavedAttachments();
        if (commentsSectionEl) commentsSectionEl.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';
    };

    const openNewModal = () => {
        if (!ensurePermission('create', 'Voce nao tem permissao para criar atendimento.')) return;
        clearForm();
        modalTitleEl.textContent = 'Novo atendimento';
        setModalVisible(true);
    };

    const openEditModal = async (item) => {
        if (!ensurePermission('edit', 'Voce nao tem permissao para editar atendimento.')) return;
        clearForm();
        idEl.value = String(item.id || '');
        titleEl.value = String(item.title || '');
        clientEl.value = item.client_id != null ? String(item.client_id) : '';
        statusEl.value = String(item.status || 'open');
        priorityEl.value = String(item.priority || 'medium');
        descriptionEl.value = String(item.description || '');
        modalTitleEl.textContent = 'Editar atendimento';

        await loadLinksForAttendance(item.id);
        renderResponsiblesSelector();
        renderSelectedTaskChips();
        await loadAttachments(item.id);
        if (commentsSectionEl) commentsSectionEl.style.display = '';
        await renderComments(item.id);
        if (deleteBtn) {
            const canDelete = typeof PermissionService === 'undefined' || typeof PermissionService.has !== 'function'
                ? true
                : PermissionService.has('atendimento', 'delete');
            deleteBtn.style.display = canDelete ? 'inline-flex' : 'none';
        }
        setModalVisible(true);
    };

    const closeModal = () => {
        editingCommentId = null;
        setModalVisible(false);
    };

    const applyFilters = () => {
        const term = String(searchEl?.value || '').trim().toLowerCase();
        const statusFilter = String(statusFilterEl?.value || '').trim();
        filteredAttendances = attendances.filter((item) => {
            if (statusFilter && String(item.status || '') !== statusFilter) return false;
            if (!term) return true;

            const respNames = (item._responsibleUsers || []).map((u) => getUserLabel(u)).join(' ');
            const clientName = getClientLabel(item.client_id);
            const haystack = [
                item.title,
                item.description,
                clientName,
                respNames,
            ].map((v) => String(v || '').toLowerCase()).join(' ');
            return haystack.includes(term);
        });
        renderTable();
    };
    const renderTable = () => {
        if (!tableBodyEl) return;
        if (!filteredAttendances.length) {
            tableBodyEl.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-attendance">
                        <div class="attendance-empty-state">
                            <i class="fas fa-headset"></i>
                            <span>Nenhum atendimento encontrado.</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBodyEl.innerHTML = filteredAttendances.map((item) => {
            const responsibleNames = (item._responsibleUsers || []).map((u) => getUserLabel(u)).join(', ') || '-';
            return `
                <tr>
                    <td>${escapeHtml(item.title || '-')}</td>
                    <td>${escapeHtml(getClientLabel(item.client_id))}</td>
                    <td><span class="attendance-status-badge status-${escapeHtml(item.status || 'open')}">${escapeHtml(statusText(item.status))}</span></td>
                    <td><span class="attendance-priority-badge priority-${escapeHtml(item.priority || 'medium')}">${escapeHtml(priorityText(item.priority))}</span></td>
                    <td>${escapeHtml(responsibleNames)}</td>
                    <td>${escapeHtml(formatDateTime(item.updated_at || item.created_at))}</td>
                    <td>
                        <div class="attendance-actions">
                            <button type="button" class="btn-edit-attendance" data-attendance-edit="${escapeHtml(item.id)}">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tableBodyEl.querySelectorAll('[data-attendance-edit]').forEach((button) => {
            button.addEventListener('click', () => {
                const id = String(button.getAttribute('data-attendance-edit') || '');
                const found = attendances.find((item) => String(item.id) === id);
                if (found) void openEditModal(found);
            });
        });
    };

    const syncResponsibles = async (attendanceId) => {
        await window.dbClient
            .from('atendimento_responsibles')
            .delete()
            .eq('atendimento_id', attendanceId);

        const ids = Array.from(selectedResponsibles);
        if (!ids.length) return;
        const rows = ids.map((userId) => ({
            atendimento_id: attendanceId,
            user_id: Number(userId),
        }));
        const { error } = await window.dbClient
            .from('atendimento_responsibles')
            .insert(rows);
        if (error) throw error;
    };

    const syncTaskLinks = async (attendanceId) => {
        await window.dbClient
            .from('atendimento_task_links')
            .delete()
            .eq('atendimento_id', attendanceId);

        const ids = Array.from(selectedTasks);
        if (!ids.length) return;
        const rows = ids.map((taskId) => ({
            atendimento_id: attendanceId,
            task_id: Number(taskId),
        }));
        const { error } = await window.dbClient
            .from('atendimento_task_links')
            .insert(rows);
        if (error) throw error;
    };

    const uploadPendingFiles = async (attendanceId, currentUserId) => {
        if (!pendingFiles.length) return;
        if (!ensurePermission('attachment', 'Voce nao tem permissao para anexar arquivos no atendimento.')) return;

        const rows = [];
        for (const file of pendingFiles) {
            if (Number(file.size || 0) > 10 * 1024 * 1024) {
                throw new Error(`Arquivo ${file.name} excede 10 MB.`);
            }
            const dataUrl = await fileToDataUrl(file);
            rows.push({
                atendimento_id: attendanceId,
                file_name: file.name,
                file_type: file.type || 'application/octet-stream',
                file_size: Number(file.size || 0),
                data_url: dataUrl,
                uploaded_by: Number.isFinite(currentUserId) ? currentUserId : null,
            });
        }

        const { error } = await window.dbClient
            .from('atendimento_attachments')
            .insert(rows);
        if (error) throw error;
        pendingFiles = [];
        renderPendingFiles();
    };

    const mapAttendancePriorityToTask = (priority) => {
        const key = String(priority || '').trim().toLowerCase();
        if (key === 'urgent') return 'high';
        if (key === 'high') return 'high';
        if (key === 'low') return 'low';
        return 'medium';
    };

    const createLinkedTaskFromAttendance = async (attendanceId) => {
        if (!createTaskFromDataEl || !createTaskFromDataEl.checked) return null;
        if (typeof PermissionService !== 'undefined' && typeof PermissionService.ensure === 'function') {
            const allowed = PermissionService.ensure('quadro_tarefas', 'create', 'Voce nao tem permissao para criar tarefas a partir do atendimento.');
            if (!allowed) {
                throw new Error('Permissao negada para criar tarefa.');
            }
        }

        const [columnsResult, attendanceResult] = await Promise.all([
            window.dbClient.from('columns').select('id,type,position').order('position', { ascending: true }),
            window.dbClient.from('atendimentos').select('id,title,description,client_id,priority').eq('id', Number(attendanceId)).single(),
        ]);
        if (columnsResult.error) throw columnsResult.error;
        if (attendanceResult.error) throw attendanceResult.error;

        const columns = Array.isArray(columnsResult.data) ? columnsResult.data : [];
        const attendance = attendanceResult.data || {};
        const pendingColumn = columns.find((column) => String(column.type || '').toLowerCase() === 'pending');
        const fallbackColumn = columns[0] || null;
        const client = clients.find((item) => String(item.id) === String(attendance.client_id));
        const clientText = String(client?.acronym || client?.name || '').trim() || null;
        const assigneeId = selectedResponsibles.size ? Number(Array.from(selectedResponsibles)[0]) : null;

        const taskPayload = {
            title: String(attendance.title || '').trim() || `Atendimento #${attendanceId}`,
            description: String(attendance.description || '').trim() || null,
            status: 'pending',
            priority: mapAttendancePriorityToTask(attendance.priority),
            assignee: Number.isFinite(assigneeId) ? assigneeId : null,
            request_date: null,
            due_date: null,
            observation: `Criada automaticamente a partir do atendimento #${attendanceId}.`,
            jira: null,
            client: clientText,
            type: 'new',
            board_column_id: pendingColumn?.id || fallbackColumn?.id || null,
            completed: false,
            is_pinned: false,
        };

        const { data, error } = await window.dbClient
            .from('tasks')
            .insert([taskPayload])
            .select('id,title')
            .single();
        if (error) throw error;
        if (data?.id) {
            const exists = tasks.some((task) => String(task.id) === String(data.id));
            if (!exists) {
                tasks.unshift({
                    id: data.id,
                    title: data.title || taskPayload.title,
                    status: taskPayload.status,
                });
            }
        }
        return data?.id ? String(data.id) : null;
    };

    const saveAttendance = async (event) => {
        event.preventDefault();
        const attendanceId = String(idEl?.value || '').trim();
        const isEdit = Boolean(attendanceId);
        const permissionKey = isEdit ? 'edit' : 'create';
        if (!ensurePermission(permissionKey, isEdit ? 'Voce nao tem permissao para editar atendimento.' : 'Voce nao tem permissao para criar atendimento.')) return;

        clearInvalid();
        const title = String(titleEl?.value || '').trim();
        if (!title) {
            markInvalid(titleEl, 'Preencha o campo obrigatorio: Titulo.');
            return;
        }

        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

        showLoading('Salvando atendimento...');
        try {
            const currentUserId = await resolveCurrentUserId();
            const payload = {
                title,
                description: String(descriptionEl?.value || '').trim() || null,
                client_id: clientEl?.value ? Number(clientEl.value) : null,
                status: String(statusEl?.value || 'open'),
                priority: String(priorityEl?.value || 'medium'),
                updated_at: new Date().toISOString(),
            };

            let savedId = attendanceId;
            if (isEdit) {
                const { error } = await window.dbClient
                    .from('atendimentos')
                    .update(payload)
                    .eq('id', Number(attendanceId));
                if (error) throw error;
            } else {
                if (Number.isFinite(currentUserId) && currentUserId > 0) {
                    payload.created_by = currentUserId;
                }
                const insertPayload = { ...payload };
                delete insertPayload.updated_at;
                const { data, error } = await window.dbClient
                    .from('atendimentos')
                    .insert([insertPayload])
                    .select('*')
                    .single();
                if (error) throw error;
                savedId = String(data?.id || '');
                if (!savedId) throw new Error('ID do atendimento nao retornado.');
            }

            if (hasPermission('assign')) {
                await syncResponsibles(Number(savedId));
            }
            const createdTaskId = await createLinkedTaskFromAttendance(Number(savedId));
            if (createdTaskId) {
                selectedTasks.add(createdTaskId);
                renderSelectedTaskChips();
            }
            if (hasPermission('link_task')) {
                await syncTaskLinks(Number(savedId));
            }
            await uploadPendingFiles(Number(savedId), currentUserId);

            saveBtn.innerHTML = '<i class="fas fa-check"></i> Salvo';
            saveBtn.classList.add('save-success-feedback');
            await new Promise((resolve) => setTimeout(resolve, 650));

            closeModal();
            await loadAttendances();
            notify('Atendimento salvo com sucesso.', 'success');
        } catch (error) {
            notify(`Falha ao salvar atendimento: ${error.message || 'erro'}`, 'error');
        } finally {
            hideLoading();
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
            saveBtn.classList.remove('save-success-feedback');
        }
    };

    const deleteAttendance = async () => {
        if (!ensurePermission('delete', 'Voce nao tem permissao para excluir atendimento.')) return;
        const attendanceId = String(idEl?.value || '').trim();
        if (!attendanceId) return;
        if (!window.confirm('Deseja excluir este atendimento?')) return;

        showLoading('Excluindo atendimento...');
        try {
            const { error } = await window.dbClient
                .from('atendimentos')
                .delete()
                .eq('id', Number(attendanceId));
            if (error) throw error;
            closeModal();
            await loadAttendances();
            notify('Atendimento excluido com sucesso.', 'success');
        } catch (error) {
            notify(`Falha ao excluir atendimento: ${error.message || 'erro'}`, 'error');
        } finally {
            hideLoading();
        }
    };

    const addComment = async () => {
        if (!ensurePermission('comment', 'Voce nao tem permissao para comentar no atendimento.')) return;
        const attendanceId = String(idEl?.value || '').trim();
        if (!attendanceId) return;

        const text = String(commentInputEl?.value || '').trim();
        if (!text) {
            notify('Digite um comentario antes de salvar.', 'warning');
            return;
        }
        const currentUserId = await resolveCurrentUserId();
        const payload = {
            atendimento_id: Number(attendanceId),
            comment_text: text,
            author_id: Number.isFinite(currentUserId) ? currentUserId : null,
        };
        const { error } = await window.dbClient
            .from('atendimento_comments')
            .insert([payload]);
        if (error) {
            notify(`Falha ao salvar comentario: ${error.message || 'erro'}`, 'error');
            return;
        }
        if (commentInputEl) commentInputEl.value = '';
        await renderComments(Number(attendanceId));
        notify('Comentario salvo.', 'success');
    };

    const loadReferenceData = async () => {
        const [usersResult, tasksResult, clientsResult] = await Promise.all([
            window.dbClient
                .from('app_users')
                .select('id,email,raw_user_meta_data,status')
                .order('email', { ascending: true }),
            window.dbClient
                .from('tasks')
                .select('id,title,status')
                .order('updated_at', { ascending: false }),
            window.dbClient
                .from('clients')
                .select('id,name,acronym,status')
                .order('name', { ascending: true }),
        ]);

        users = usersResult.error ? [] : (usersResult.data || []);
        tasks = tasksResult.error ? [] : (tasksResult.data || []);
        clients = clientsResult.error ? [] : (clientsResult.data || []);
        renderClientOptions();
        renderResponsiblesSelector();
        renderSelectedTaskChips();
        if (taskSearchEl) {
            const canLinkTask = hasPermission('link_task');
            taskSearchEl.disabled = !canLinkTask;
            if (!canLinkTask) taskSearchEl.value = '';
        }
    };

    const loadAttendances = async () => {
        if (!tableBodyEl) return;
        tableBodyEl.innerHTML = `
            <tr>
                <td colspan="7" class="loading-attendance"><i class="fas fa-spinner fa-spin"></i> Carregando atendimentos...</td>
            </tr>
        `;
        const [attendanceResult, respResult] = await Promise.all([
            window.dbClient
                .from('atendimentos')
                .select('*')
                .order('updated_at', { ascending: false }),
            window.dbClient
                .from('atendimento_responsibles')
                .select('id,atendimento_id,user_id'),
        ]);

        if (attendanceResult.error) {
            tableBodyEl.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-attendance" style="color:#c0392b;">
                        <i class="fas fa-exclamation-triangle"></i> Falha ao carregar atendimentos.
                    </td>
                </tr>
            `;
            notify(`Falha ao carregar atendimentos: ${attendanceResult.error.message || 'erro'}`, 'error');
            return;
        }

        const list = Array.isArray(attendanceResult.data) ? attendanceResult.data : [];
        const responsibles = respResult.error ? [] : (respResult.data || []);
        const mapByAttendance = new Map();
        responsibles.forEach((row) => {
            const key = String(row.atendimento_id);
            if (!mapByAttendance.has(key)) mapByAttendance.set(key, []);
            mapByAttendance.get(key).push(String(row.user_id));
        });

        attendances = list.map((item) => {
            const ids = mapByAttendance.get(String(item.id)) || [];
            const linkedUsers = ids
                .map((id) => users.find((u) => String(u.id) === id))
                .filter(Boolean);
            return {
                ...item,
                _responsibleIds: ids,
                _responsibleUsers: linkedUsers,
            };
        });
        applyFilters();
    };

    const attachEvents = () => {
        if (newBtn) newBtn.addEventListener('click', openNewModal);
        if (searchEl) searchEl.addEventListener('input', applyFilters);
        if (statusFilterEl) statusFilterEl.addEventListener('change', applyFilters);
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        if (formEl) formEl.addEventListener('submit', (event) => void saveAttendance(event));
        if (deleteBtn) deleteBtn.addEventListener('click', () => void deleteAttendance());
        if (addCommentBtn) addCommentBtn.addEventListener('click', () => void addComment());
        if (responsiblesToggleEl) {
            responsiblesToggleEl.addEventListener('click', () => {
                const visible = responsiblesPanelEl && responsiblesPanelEl.style.display !== 'none';
                setResponsiblesPanelVisible(!visible);
            });
        }
        window.addEventListener('resize', positionResponsiblesPanel);
        window.addEventListener('scroll', positionResponsiblesPanel, true);
        if (taskSearchEl) {
            taskSearchEl.addEventListener('input', renderTaskSuggestions);
            taskSearchEl.addEventListener('focus', renderTaskSuggestions);
        }
        if (createTaskFromDataEl) {
            const canCreateTask = typeof PermissionService === 'undefined' || typeof PermissionService.has !== 'function'
                ? true
                : PermissionService.has('quadro_tarefas', 'create');
            createTaskFromDataEl.disabled = !canCreateTask;
            if (!canCreateTask) createTaskFromDataEl.checked = false;
        }

        if (attachmentsInputEl) {
            attachmentsInputEl.addEventListener('change', () => {
                if (!ensurePermission('attachment', 'Voce nao tem permissao para anexar arquivos no atendimento.')) {
                    attachmentsInputEl.value = '';
                    return;
                }
                const files = Array.from(attachmentsInputEl.files || []);
                if (!files.length) return;
                pendingFiles.push(...files);
                attachmentsInputEl.value = '';
                renderPendingFiles();
            });
        }

        if (modalEl) {
            modalEl.addEventListener('click', (event) => {
                if (event.target === modalEl) closeModal();
            });
        }

        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (responsiblesComboEl && !responsiblesComboEl.contains(target)) {
                setResponsiblesPanelVisible(false);
            }
            const isTaskPickerTarget = Boolean(taskSearchEl && taskSearchEl.contains(target))
                || Boolean(taskSuggestionsEl && taskSuggestionsEl.contains(target))
                || Boolean(taskSelectedEl && taskSelectedEl.contains(target));
            if (!isTaskPickerTarget && taskSuggestionsEl) {
                taskSuggestionsEl.style.display = 'none';
            }
        });

        if (formEl) {
            formEl.addEventListener('input', (event) => {
                const target = event.target;
                if (!target || !(target instanceof HTMLElement)) return;
                if (target.classList.contains('field-invalid')) {
                    target.classList.remove('field-invalid');
                }
                if (typeof target.setCustomValidity === 'function') {
                    target.setCustomValidity('');
                }
            });
        }
    };

    const init = async () => {
        if (isInitialized) return;
        if (!ensurePermission('view', 'Voce nao tem permissao para visualizar atendimento.')) return;
        isInitialized = true;

        await loadReferenceData();
        attachEvents();
        await loadAttendances();
    };

    return { init };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        void AtendimentoModule.init();
    });
} else {
    void AtendimentoModule.init();
}
