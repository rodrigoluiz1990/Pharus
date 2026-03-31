// Modulo de gerenciamento de modais
const ModalModule = (() => {
    const modalOverlay = document.getElementById('taskModal');
    const taskForm = document.getElementById('taskForm');
    const closeModalBtn = document.getElementById('closeModal');
    const cancelTaskBtn = document.getElementById('cancelTask');
    const deleteTaskBtn = document.getElementById('deleteTask');
    const taskAssignee = document.getElementById('taskAssignee');
    const taskClient = document.getElementById('taskClient');
    const taskIsPinned = document.getElementById('taskIsPinned');
    const taskPinToggleBtn = document.getElementById('taskPinToggleBtn');
    const taskFocusOrder = document.getElementById('taskFocusOrder');
    const taskAttachmentInput = document.getElementById('taskAttachment');
    const taskAttachmentInfo = document.getElementById('taskAttachmentInfo');
    const taskAttachmentName = document.getElementById('taskAttachmentName');
    const taskAttachmentDownloadBtn = document.getElementById('taskAttachmentDownloadBtn');
    const taskAttachmentRemoveBtn = document.getElementById('taskAttachmentRemoveBtn');
    const taskPrioritySelect = document.getElementById('taskPriority');
    const taskTypeSelect = document.getElementById('taskType');
    let isInitialized = false;
    let startedOutsideModal = false;
    let currentTaskAttachment = null;
    let selectedAttachmentFile = null;
    let isUploadingAttachment = false;
    let isSavingTask = false;
    const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
    const ensureTaskPermission = (optionKey, message) => {
        if (typeof PermissionService === 'undefined' || typeof PermissionService.ensure !== 'function') return true;
        return PermissionService.ensure('quadro_tarefas', optionKey, message || 'Você não tem permissão para executar esta ação.');
    };

    const getTaskIdFromForm = () => String(document.getElementById('taskId')?.value || '').trim();

    const normalizePriorityValue = (value) => {
        if (window.UtilsModule && typeof window.UtilsModule.normalizePriorityKey === 'function') {
            return window.UtilsModule.normalizePriorityKey(value);
        }
        return String(value || 'medium');
    };

    const normalizeTypeValue = (value) => {
        if (window.UtilsModule && typeof window.UtilsModule.normalizeTypeKey === 'function') {
            return window.UtilsModule.normalizeTypeKey(value);
        }
        return String(value || 'new');
    };

    const getPriorityDefinitions = () => {
        if (window.UtilsModule && typeof window.UtilsModule.getPriorityDefinitions === 'function') {
            return window.UtilsModule.getPriorityDefinitions();
        }
        return [
            { value: 'very_high', label: 'Muito Alta' },
            { value: 'high', label: 'Alta' },
            { value: 'medium', label: 'Média' },
            { value: 'low', label: 'Baixa' },
            { value: 'very_low', label: 'Muito Baixa' },
        ];
    };

    const getTypeDefinitions = () => {
        if (window.UtilsModule && typeof window.UtilsModule.getTypeDefinitions === 'function') {
            return window.UtilsModule.getTypeDefinitions();
        }
        return [
            { value: 'new', label: 'Novo' },
            { value: 'optimization', label: 'Otimização' },
            { value: 'improvement', label: 'Melhoria' },
            { value: 'discussion', label: 'Para Discutir' },
            { value: 'suggestion', label: 'Sugestão' },
            { value: 'issue', label: 'Problema' },
            { value: 'epic', label: 'Épico' },
        ];
    };

    const populateTaskTaxonomySelects = () => {
        if (taskPrioritySelect) {
            const selected = String(taskPrioritySelect.value || 'medium');
            taskPrioritySelect.innerHTML = getPriorityDefinitions()
                .map((item) => `<option value="${String(item.value)}">${String(item.label)}</option>`)
                .join('');
            setSelectValueWithFallback(taskPrioritySelect, normalizePriorityValue(selected), selected);
        }

        if (taskTypeSelect) {
            const selected = String(taskTypeSelect.value || 'new');
            taskTypeSelect.innerHTML = getTypeDefinitions()
                .map((item) => `<option value="${String(item.value)}">${String(item.label)}</option>`)
                .join('');
            setSelectValueWithFallback(taskTypeSelect, normalizeTypeValue(selected), selected);
        }
    };

    const setSelectValueWithFallback = (selectEl, preferredValue, legacyValue = '') => {
        if (!selectEl) return;
        const normalizedPreferred = String(preferredValue || '').trim();
        const normalizedLegacy = String(legacyValue || '').trim();

        const hasPreferred = Array.from(selectEl.options).some((opt) => String(opt.value) === normalizedPreferred);
        if (hasPreferred) {
            selectEl.value = normalizedPreferred;
            return;
        }

        if (normalizedLegacy) {
            const hasLegacy = Array.from(selectEl.options).some((opt) => String(opt.value) === normalizedLegacy);
            if (!hasLegacy) {
                const legacyOption = document.createElement('option');
                legacyOption.value = normalizedLegacy;
                legacyOption.textContent = `${normalizedLegacy} (legado)`;
                selectEl.appendChild(legacyOption);
            }
            selectEl.value = normalizedLegacy;
            return;
        }

        if (selectEl.options.length > 0) {
            selectEl.value = selectEl.options[0].value;
        }
    };

    const resetAttachmentState = () => {
        selectedAttachmentFile = null;
        currentTaskAttachment = null;
        isUploadingAttachment = false;
        if (taskAttachmentInput) taskAttachmentInput.value = '';
    };

    const getFileExtension = (fileName) => {
        const name = String(fileName || '').toLowerCase();
        const index = name.lastIndexOf('.');
        if (index < 0) return '';
        return name.slice(index);
    };

    const isAllowedAttachmentExtension = (extension) => {
        const allowed = new Set([
            '.jpg', '.jpeg', '.png', '.webp', '.pdf', '.txt', '.zip',
            '.patch', '.diff', '.doc', '.docx', '.xls', '.xlsx',
            '.log', '.json', '.csv', '.xml', '.sql', '.ps1', '.sh', '.md',
        ]);
        return allowed.has(String(extension || '').toLowerCase());
    };

    const inferMimeTypeFromName = (fileName) => {
        const name = String(fileName || '').toLowerCase();
        if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
        if (name.endsWith('.png')) return 'image/png';
        if (name.endsWith('.webp')) return 'image/webp';
        if (name.endsWith('.pdf')) return 'application/pdf';
        if (name.endsWith('.txt')) return 'text/plain';
        if (name.endsWith('.patch')) return 'text/x-patch';
        if (name.endsWith('.diff')) return 'text/x-diff';
        if (name.endsWith('.zip')) return 'application/zip';
        if (name.endsWith('.log')) return 'text/plain';
        if (name.endsWith('.json')) return 'application/json';
        if (name.endsWith('.csv')) return 'text/csv';
        if (name.endsWith('.xml')) return 'application/xml';
        if (name.endsWith('.sql')) return 'application/sql';
        if (name.endsWith('.ps1')) return 'application/x-powershell';
        if (name.endsWith('.sh')) return 'text/x-shellscript';
        if (name.endsWith('.md')) return 'text/markdown';
        if (name.endsWith('.doc')) return 'application/msword';
        if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (name.endsWith('.xls')) return 'application/vnd.ms-excel';
        if (name.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        return 'application/octet-stream';
    };

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = String(reader.result || '');
                const base64Data = result.includes(',') ? result.split(',')[1] : result;
                resolve(base64Data);
            };
            reader.onerror = () => reject(new Error('Falha ao ler arquivo para upload.'));
            reader.readAsDataURL(file);
        });
    };

    const uploadAttachmentWithProgress = async (file, mimeType, onProgress) => {
        const base64Data = await fileToBase64(file);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/tasks/upload', true);
            xhr.setRequestHeader('Content-Type', 'application/json');

            xhr.upload.onprogress = (event) => {
                if (!event.lengthComputable) return;
                const percent = Math.round((event.loaded / event.total) * 100);
                if (typeof onProgress === 'function') onProgress(percent);
            };

            xhr.onload = () => {
                try {
                    const payload = JSON.parse(xhr.responseText || '{}');
                    if (xhr.status >= 200 && xhr.status < 300 && !payload.error) {
                        resolve(payload.data || {});
                        return;
                    }
                    reject(new Error(payload?.error?.message || `Falha no upload (${xhr.status})`));
                } catch (_parseError) {
                    reject(new Error('Resposta invalida do upload'));
                }
            };

            xhr.onerror = () => reject(new Error('Falha de rede no upload do anexo'));
            xhr.send(JSON.stringify({
                fileName: file.name,
                mimeType,
                base64Data,
            }));
        });
    };

    const formatFileSize = (bytes) => {
        if (!Number.isFinite(bytes) || bytes <= 0) return '-';
        const units = ['B', 'KB', 'MB', 'GB'];
        let value = bytes;
        let unitIndex = 0;
        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex += 1;
        }
        return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
    };

    const updateAttachmentInfo = (uploadPercent = null, uploadStatus = '') => {
        if (!taskAttachmentInfo || !taskAttachmentName) return;

        const selected = selectedAttachmentFile;
        const existing = currentTaskAttachment;

        if (!selected && (!existing || !existing.name)) {
            taskAttachmentInfo.style.display = 'none';
            taskAttachmentName.textContent = '';
            if (taskAttachmentDownloadBtn) taskAttachmentDownloadBtn.disabled = true;
            return;
        }

        const activeName = selected?.name || existing?.name || 'Anexo';
        const activeSize = selected?.size || Number(existing?.size || 0);
        const metaLabel = activeSize > 0 ? ` (${formatFileSize(activeSize)})` : '';

        const statusLabel = uploadStatus
            ? ` - ${uploadStatus}`
            : (uploadPercent !== null && isUploadingAttachment ? ` - Enviando ${uploadPercent}%` : '');

        taskAttachmentName.textContent = `${activeName}${metaLabel}${statusLabel}`;
        taskAttachmentInfo.style.display = 'flex';

        if (taskAttachmentDownloadBtn) {
            const hasDownloadable = Boolean(existing?.path || existing?.data);
            taskAttachmentDownloadBtn.disabled = !hasDownloadable;
        }
    };

    const openAttachmentDownload = (attachment) => {
        if (!attachment) return;

        const taskId = getTaskIdFromForm();
        if (attachment.path && taskId) {
            const url = `${window.location.origin}/api/tasks/attachment/${encodeURIComponent(taskId)}`;
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
        }

        if (attachment.data) {
            const link = document.createElement('a');
            link.href = attachment.data;
            link.download = attachment.name || 'anexo';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const syncPinToggleUI = () => {
        if (!taskPinToggleBtn || !taskIsPinned) return;
        const isPinned = Boolean(taskIsPinned.checked);
        taskPinToggleBtn.classList.toggle('active', isPinned);
        taskPinToggleBtn.setAttribute('aria-pressed', isPinned ? 'true' : 'false');
        const title = isPinned ? 'Remover destaque do post-it' : 'Destacar no post-it';
        taskPinToggleBtn.setAttribute('title', title);
        taskPinToggleBtn.setAttribute('aria-label', title);
        if (taskFocusOrder) {
            taskFocusOrder.disabled = !isPinned;
            taskFocusOrder.title = isPinned
                ? 'Ordem no post-it (menor aparece primeiro)'
                : 'Marque o pin para definir a ordem no post-it';
        }
    };

    const showModal = async (columnId, taskId = null) => {
        if (!modalOverlay) return;
        if (taskId) {
            if (!ensureTaskPermission('edit', 'Você não tem permissão para editar tarefas.')) return;
        } else if (!ensureTaskPermission('create', 'Você não tem permissão para criar tarefas.')) {
            return;
        }

        taskForm.reset();
        syncPinToggleUI();
        resetAttachmentState();
        updateAttachmentInfo();

        if (deleteTaskBtn) {
            deleteTaskBtn.style.display = 'none';
        }

        await populateAssignees();
        await populateClients();
        populateTaskTaxonomySelects();

        if (taskId) {
            try {
                const tasks = await StorageModule.getTasks();
                const task = tasks.find((t) => String(t.id) === String(taskId));

                if (task) {
                    document.getElementById('taskId').value = task.id;
                    document.getElementById('taskTitle').value = task.title || '';
                    document.getElementById('taskDescription').value = task.description || '';
                    document.getElementById('taskStatus').value = task.status || 'pending';
                    const prioritySelect = document.getElementById('taskPriority');
                    const typeSelect = document.getElementById('taskType');
                    const resolvedPriority = window.UtilsModule && typeof window.UtilsModule.getPriorityText === 'function'
                        ? window.UtilsModule.getPriorityText(task.priority || 'medium').key
                        : normalizePriorityValue(task.priority || 'medium');
                    const resolvedType = window.UtilsModule && typeof window.UtilsModule.getTypeText === 'function'
                        ? window.UtilsModule.getTypeText(task.type || 'new').key
                        : normalizeTypeValue(task.type || 'new');
                    setSelectValueWithFallback(prioritySelect, resolvedPriority, task.priority || '');
                    document.getElementById('taskAssignee').value = task.assignee || '';
                    document.getElementById('taskRequestDate').value = task.request_date ? UtilsModule.formatDateForInput(task.request_date) : '';
                    document.getElementById('taskDueDate').value = task.due_date ? UtilsModule.formatDateForInput(task.due_date) : '';
                    document.getElementById('taskObservation').value = task.observation || '';
                    document.getElementById('taskJira').value = task.jira || '';
                    setSelectValueWithFallback(typeSelect, resolvedType, task.type || '');

                    currentTaskAttachment = task.attachment_name
                        ? {
                            name: task.attachment_name,
                            path: task.attachment_path || null,
                            type: task.attachment_type || '',
                            size: Number(task.attachment_size || 0) || 0,
                            data: task.attachment_data || null,
                        }
                        : null;

                    updateAttachmentInfo();
                    if (taskIsPinned) taskIsPinned.checked = Boolean(task.is_pinned);
                    syncPinToggleUI();
                    if (taskFocusOrder) taskFocusOrder.value = task.focus_order || '';

                    if (taskClient) {
                        const savedClient = task.client || '';
                        const matchOption = Array.from(taskClient.options).find((opt) => {
                            if (opt.value === savedClient) return true;
                            const optName = String(opt.dataset.clientName || '').trim();
                            return optName && optName === savedClient;
                        });

                        if (savedClient && matchOption) {
                            taskClient.value = matchOption.value;
                        } else if (savedClient) {
                            const legacyOption = document.createElement('option');
                            legacyOption.value = savedClient;
                            legacyOption.textContent = `${savedClient} (legado)`;
                            taskClient.appendChild(legacyOption);
                            taskClient.value = savedClient;
                        }
                    }

                    document.getElementById('modalTitle').textContent = 'Editar Tarefa';
                    if (deleteTaskBtn) {
                        const canDelete = typeof PermissionService === 'undefined' || typeof PermissionService.has !== 'function'
                            ? true
                            : PermissionService.has('quadro_tarefas', 'delete');
                        deleteTaskBtn.style.display = canDelete ? 'inline-flex' : 'none';
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar tarefa:', error);
                UtilsModule.showNotification('Erro ao carregar tarefa para edição.', 'error');
            }
        } else {
            document.getElementById('taskId').value = '';
            document.getElementById('taskStatus').value = 'pending';
            setSelectValueWithFallback(taskPrioritySelect, 'medium');
            setSelectValueWithFallback(taskTypeSelect, 'new');
            document.getElementById('modalTitle').textContent = 'Nova Tarefa';

            if (columnId) {
                try {
                    const status = await UtilsModule.getColumnStatus(columnId);
                    document.getElementById('taskStatus').value = status;
                } catch (error) {
                    console.error('Erro ao buscar status da coluna:', error);
                }
            }

            document.getElementById('taskRequestDate').value = new Date().toISOString().split('T')[0];
            if (taskIsPinned) taskIsPinned.checked = false;
            syncPinToggleUI();
            if (taskFocusOrder) taskFocusOrder.value = '';
            updateAttachmentInfo();
        }

        modalOverlay.classList.add('visible');
    };

    const hideModal = () => {
        if (modalOverlay) {
            modalOverlay.classList.remove('visible');
        }
    };

    const populateAssignees = async (selectedValue = null) => {
        if (!taskAssignee) return;

        taskAssignee.innerHTML = '<option value="">Selecionar responsável</option>';

        try {
            const users = await StorageModule.getUsers();

            users.forEach((user) => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.name;

                if (selectedValue && user.id === selectedValue) {
                    option.selected = true;
                }

                taskAssignee.appendChild(option);
            });

            if (selectedValue && taskAssignee.value !== selectedValue) {
                taskAssignee.value = selectedValue;
            }
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        }
    };

    const saveTask = async (e) => {
        e.preventDefault();
        if (!modalOverlay || !modalOverlay.classList.contains('visible')) {
            return;
        }
        if (isSavingTask) return;

        const taskId = getTaskIdFromForm();
        const permissionKey = taskId ? 'edit' : 'create';
        if (!ensureTaskPermission(permissionKey, taskId ? 'Você não tem permissão para editar tarefas.' : 'Você não tem permissão para criar tarefas.')) {
            return;
        }
        const title = document.getElementById('taskTitle').value;

        if (!title) {
            UtilsModule.showNotification('O título da tarefa é obrigatório!', 'error');
            return;
        }

        if (taskIsPinned && taskIsPinned.checked && taskFocusOrder && taskFocusOrder.value) {
            const parsedFocusOrder = Number(taskFocusOrder.value);
            if (!Number.isFinite(parsedFocusOrder) || parsedFocusOrder < 1) {
                UtilsModule.showNotification('A ordem do post-it deve ser um número maior que zero.', 'error');
                return;
            }
        }

        const taskData = {
            title,
            description: document.getElementById('taskDescription').value || null,
            status: document.getElementById('taskStatus').value,
            priority: normalizePriorityValue(document.getElementById('taskPriority').value),
            assignee: document.getElementById('taskAssignee').value || null,
            request_date: document.getElementById('taskRequestDate').value || null,
            due_date: document.getElementById('taskDueDate').value || null,
            observation: document.getElementById('taskObservation').value || null,
            jira: document.getElementById('taskJira').value || null,
            client: document.getElementById('taskClient').value || null,
            is_pinned: taskIsPinned ? taskIsPinned.checked : false,
            focus_order: taskIsPinned && taskIsPinned.checked && taskFocusOrder && taskFocusOrder.value
                ? Number(taskFocusOrder.value)
                : null,
            type: normalizeTypeValue(document.getElementById('taskType').value),
        };

        const selectedAttachment = taskAttachmentInput && taskAttachmentInput.files && taskAttachmentInput.files[0]
            ? taskAttachmentInput.files[0]
            : null;

        const submitBtn = taskForm.querySelector('button[type="submit"]');
        if (!submitBtn) return;
        const originalText = submitBtn.innerHTML;
        const originalBackground = submitBtn.style.backgroundColor;
        const originalBorderColor = submitBtn.style.borderColor;
        const originalColor = submitBtn.style.color;
        isSavingTask = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        submitBtn.disabled = true;

        try {
            if (selectedAttachment) {
                const extension = getFileExtension(selectedAttachment.name);
                if (!isAllowedAttachmentExtension(extension)) {
                    throw new Error('Tipo de arquivo não permitido para anexo da tarefa.');
                }
                if (selectedAttachment.size > MAX_ATTACHMENT_SIZE_BYTES) {
                    throw new Error('O anexo deve ter no máximo 10 MB.');
                }

                const resolvedMimeType = (selectedAttachment.type && selectedAttachment.type.trim())
                    ? selectedAttachment.type
                    : inferMimeTypeFromName(selectedAttachment.name);

                isUploadingAttachment = true;
                updateAttachmentInfo(0, 'Preparando upload...');
                const uploadData = await uploadAttachmentWithProgress(selectedAttachment, resolvedMimeType, (percent) => {
                    updateAttachmentInfo(percent, `Enviando ${percent}%`);
                });
                isUploadingAttachment = false;

                currentTaskAttachment = {
                    name: uploadData.attachment_name || selectedAttachment.name,
                    path: uploadData.attachment_path || null,
                    type: uploadData.attachment_type || resolvedMimeType,
                    size: Number(uploadData.attachment_size || selectedAttachment.size || 0),
                    data: null,
                };

                taskData.attachment_name = currentTaskAttachment.name;
                taskData.attachment_path = currentTaskAttachment.path;
                taskData.attachment_type = currentTaskAttachment.type;
                taskData.attachment_size = currentTaskAttachment.size;
                taskData.attachment_data = null;
            } else if (currentTaskAttachment) {
                taskData.attachment_name = currentTaskAttachment.name || null;
                taskData.attachment_path = currentTaskAttachment.path || null;
                taskData.attachment_type = currentTaskAttachment.type || null;
                taskData.attachment_size = currentTaskAttachment.size || null;
                taskData.attachment_data = currentTaskAttachment.data || null;
            } else {
                taskData.attachment_name = null;
                taskData.attachment_path = null;
                taskData.attachment_type = null;
                taskData.attachment_size = null;
                taskData.attachment_data = null;
            }

            const columns = await StorageModule.getColumns();
            const targetColumn = columns.find((c) => c.type === taskData.status);
            if (targetColumn) {
                taskData.board_column_id = targetColumn.id;
            } else if (!taskId) {
                taskData.board_column_id = columns[0]?.id || null;
            }

            let result;
            if (taskId) {
                result = await StorageModule.updateTask(taskId, taskData);
            } else {
                result = await StorageModule.saveTask(taskData);
            }

            if (!result) {
                throw new Error('Falha na operação');
            }

            submitBtn.innerHTML = '<i class="fas fa-check"></i> Salvo';
            submitBtn.style.backgroundColor = '#16a34a';
            submitBtn.style.borderColor = '#16a34a';
            submitBtn.style.color = '#ffffff';
            submitBtn.disabled = true;
            await new Promise((resolve) => setTimeout(resolve, 650));
            hideModal();
            UtilsModule.showNotification(taskId ? 'Tarefa atualizada com sucesso!' : 'Tarefa criada com sucesso!', 'success');
            window.dispatchEvent(new CustomEvent('tasksUpdated'));
        } catch (error) {
            isUploadingAttachment = false;
            UtilsModule.handleApiError(error, 'salvar tarefa');
        } finally {
            updateAttachmentInfo();
            submitBtn.innerHTML = originalText;
            submitBtn.style.backgroundColor = originalBackground;
            submitBtn.style.borderColor = originalBorderColor;
            submitBtn.style.color = originalColor;
            submitBtn.disabled = false;
            isSavingTask = false;
        }
    };

    const deleteTask = async () => {
        if (!ensureTaskPermission('delete', 'Você não tem permissão para excluir tarefas.')) return;
        if (!confirm('Tem certeza que deseja excluir esta tarefa?')) {
            return;
        }

        const taskId = getTaskIdFromForm();
        if (!taskId) {
            UtilsModule.showNotification('ID da tarefa não encontrado.', 'error');
            return;
        }

        if (deleteTaskBtn) {
            deleteTaskBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
            deleteTaskBtn.disabled = true;
        }

        try {
            const success = await StorageModule.deleteTask(taskId);
            if (success) {
                hideModal();
                UtilsModule.showNotification('Tarefa excluída com sucesso!', 'success');
                window.dispatchEvent(new CustomEvent('tasksUpdated'));
            } else {
                UtilsModule.showNotification('Erro ao excluir tarefa.', 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir tarefa:', error);
            UtilsModule.showNotification('Erro ao excluir tarefa. Verifique o console para mais detalhes.', 'error');
        } finally {
            if (deleteTaskBtn) {
                deleteTaskBtn.textContent = 'Excluir';
                deleteTaskBtn.disabled = false;
            }
        }
    };

    const initModal = () => {
        if (!modalOverlay || isInitialized) return;

        if (closeModalBtn) {
            closeModalBtn.setAttribute('type', 'button');
            closeModalBtn.addEventListener('click', hideModal);
        }

        if (cancelTaskBtn) {
            cancelTaskBtn.addEventListener('click', hideModal);
        }

        if (taskForm) {
            taskForm.noValidate = true;
            taskForm.addEventListener('submit', saveTask);
            taskForm.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter') return;
                const target = e.target;
                if (!target || !(target instanceof HTMLElement)) return;
                const tag = target.tagName.toLowerCase();
                if (tag === 'textarea') return;
                if (tag === 'button') return;
                e.preventDefault();
            });
        }

        if (deleteTaskBtn) {
            deleteTaskBtn.addEventListener('click', deleteTask);
        }

        if (taskPinToggleBtn && taskIsPinned) {
            taskPinToggleBtn.addEventListener('click', () => {
                if (!ensureTaskPermission('pin', 'Você não tem permissão para alterar destaque das tarefas.')) return;
                taskIsPinned.checked = !taskIsPinned.checked;
                syncPinToggleUI();
            });
        }

        if (taskAttachmentInput) {
            taskAttachmentInput.addEventListener('change', () => {
                if (!ensureTaskPermission('attachment', 'Você não tem permissão para anexar arquivos em tarefas.')) {
                    taskAttachmentInput.value = '';
                    return;
                }
                const file = taskAttachmentInput.files && taskAttachmentInput.files[0]
                    ? taskAttachmentInput.files[0]
                    : null;

                selectedAttachmentFile = file;
                if (!file) {
                    updateAttachmentInfo();
                    return;
                }

                const extension = getFileExtension(file.name);
                if (!isAllowedAttachmentExtension(extension)) {
                    UtilsModule.showNotification('Tipo de arquivo não permitido para anexo da tarefa.', 'error');
                    taskAttachmentInput.value = '';
                    selectedAttachmentFile = null;
                    updateAttachmentInfo();
                    return;
                }

                if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
                    UtilsModule.showNotification('O anexo deve ter no máximo 10 MB.', 'error');
                    taskAttachmentInput.value = '';
                    selectedAttachmentFile = null;
                    updateAttachmentInfo();
                    return;
                }

                updateAttachmentInfo();
            });
        }

        if (taskAttachmentDownloadBtn) {
            taskAttachmentDownloadBtn.addEventListener('click', () => {
                if (!currentTaskAttachment) return;
                openAttachmentDownload(currentTaskAttachment);
            });
        }

        if (taskAttachmentRemoveBtn) {
            taskAttachmentRemoveBtn.addEventListener('click', () => {
                if (!ensureTaskPermission('attachment', 'Você não tem permissão para anexar arquivos em tarefas.')) return;
                selectedAttachmentFile = null;
                currentTaskAttachment = null;
                if (taskAttachmentInput) taskAttachmentInput.value = '';
                updateAttachmentInfo();
            });
        }

        const modal = modalOverlay.querySelector('.modal');
        modalOverlay.addEventListener('pointerdown', (e) => {
            startedOutsideModal = (e.target === modalOverlay);
        });

        modalOverlay.addEventListener('click', (e) => {
            const endedOutsideModal = (e.target === modalOverlay);
            if (startedOutsideModal && endedOutsideModal) {
                hideModal();
            }
            startedOutsideModal = false;
        });

        if (modal) {
            modal.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        isInitialized = true;
        window.addEventListener('pharus:task-taxonomy-icons-updated', populateTaskTaxonomySelects);
        populateTaskTaxonomySelects();
    };

    const populateClients = async (selectedValue = null) => {
        if (!taskClient) return;

        taskClient.innerHTML = '<option value="">Selecionar cliente</option>';

        try {
            const { data, error } = await window.dbClient
                .from('clients')
                .select('name, acronym, status')
                .order('name', { ascending: true });

            if (error) throw error;

            (data || []).forEach((client) => {
                if (!client || !client.name) return;

                const option = document.createElement('option');
                const acronym = String(client.acronym || '').trim();
                const optionValue = acronym || client.name;
                option.value = optionValue;
                option.dataset.clientName = client.name;
                option.dataset.clientAcronym = acronym;
                const baseLabel = acronym ? `${acronym} - ${client.name}` : client.name;
                option.textContent = client.status === 'inactive'
                    ? `${baseLabel} (inativo)`
                    : baseLabel;

                if (selectedValue && (selectedValue === optionValue || selectedValue === client.name)) {
                    option.selected = true;
                }

                taskClient.appendChild(option);
            });

            if (selectedValue && taskClient.value !== selectedValue) {
                const legacyOption = document.createElement('option');
                legacyOption.value = selectedValue;
                legacyOption.textContent = `${selectedValue} (legado)`;
                taskClient.appendChild(legacyOption);
                taskClient.value = selectedValue;
            }
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    };

    return {
        initModal,
        showModal,
        hideModal,
    };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ModalModule.initModal);
} else {
    ModalModule.initModal();
}


