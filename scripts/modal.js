// Módulo de gerenciamento de modais
const ModalModule = (() => {
    const modalOverlay = document.getElementById('taskModal');
    const taskForm = document.getElementById('taskForm');
    const closeModalBtn = document.getElementById('closeModal');
    const cancelTaskBtn = document.getElementById('cancelTask');
    const deleteTaskBtn = document.getElementById('deleteTask');
    const taskAssignee = document.getElementById('taskAssignee');
    const taskClient = document.getElementById('taskClient');
    const taskIsPinned = document.getElementById('taskIsPinned');
    const taskFocusOrder = document.getElementById('taskFocusOrder');
    let isInitialized = false;
    let startedOutsideModal = false;

    // Mostrar modal
    const showModal = async (columnId, taskId = null) => {
        if (!modalOverlay) return;

        // Limpar formulário
        taskForm.reset();

        // Esconder botão de excluir inicialmente
        if (deleteTaskBtn) {
            deleteTaskBtn.style.display = 'none';
        }

        // Popular dropdown de responsáveis
        await populateAssignees();
        await populateClients();

        if (taskId) {
            // Modo edição - Buscar tarefa do Supabase
            try {
                const tasks = await StorageModule.getTasks();
                const task = tasks.find(t => t.id === taskId);

                if (task) {
                    document.getElementById('taskId').value = task.id;
                    document.getElementById('taskTitle').value = task.title || '';
                    document.getElementById('taskDescription').value = task.description || '';
                    document.getElementById('taskStatus').value = task.status || 'pending';
                    document.getElementById('taskPriority').value = task.priority || 'medium';
                    document.getElementById('taskAssignee').value = task.assignee || '';
                    document.getElementById('taskRequestDate').value = task.request_date ? UtilsModule.formatDateForInput(task.request_date) : '';
                    document.getElementById('taskDueDate').value = task.due_date ? UtilsModule.formatDateForInput(task.due_date) : '';
                    document.getElementById('taskObservation').value = task.observation || '';
                    document.getElementById('taskJira').value = task.jira || '';
                    if (taskIsPinned) taskIsPinned.checked = Boolean(task.is_pinned);
                    if (taskFocusOrder) taskFocusOrder.value = task.focus_order || '';
                    if (taskClient) {
                        const savedClient = task.client || '';
                        const exists = Array.from(taskClient.options).some((opt) => opt.value === savedClient);
                        if (savedClient && !exists) {
                            const legacyOption = document.createElement('option');
                            legacyOption.value = savedClient;
                            legacyOption.textContent = `${savedClient} (legado)`;
                            taskClient.appendChild(legacyOption);
                        }
                        taskClient.value = savedClient;
                    }
                    document.getElementById('taskType').value = task.type || 'task';

                    document.getElementById('modalTitle').textContent = 'Editar Tarefa';
                    if (deleteTaskBtn) {
                        deleteTaskBtn.style.display = 'inline-flex';
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar tarefa:', error);
                UtilsModule.showNotification('Erro ao carregar tarefa para edição.', 'error');
            }
        } else {
            // Modo criação
            document.getElementById('taskId').value = '';
            document.getElementById('taskStatus').value = 'pending';
            document.getElementById('modalTitle').textContent = 'Nova Tarefa';

            // Se columnId foi fornecido, usar o status correspondente
            if (columnId) {
                try {
                    const status = await UtilsModule.getColumnStatus(columnId);
                    document.getElementById('taskStatus').value = status;
                } catch (error) {
                    console.error('Erro ao buscar status da coluna:', error);
                }
            }

            // Definir data de solicitação como hoje
            document.getElementById('taskRequestDate').value = new Date().toISOString().split('T')[0];
            if (taskIsPinned) taskIsPinned.checked = false;
            if (taskFocusOrder) taskFocusOrder.value = '';
        }

        modalOverlay.classList.add('visible');
    };

    // Esconder modal
    const hideModal = () => {
        if (modalOverlay) {
            modalOverlay.classList.remove('visible');
        }
    };

    // Popular dropdown de responsáveis
    const populateAssignees = async (selectedValue = null) => {
        if (!taskAssignee) return;
    
        taskAssignee.innerHTML = '<option value="">Selecionar responsável</option>';
    
        try {
            const users = await StorageModule.getUsers();
    
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id; // UUID agora
                option.textContent = user.name;
                
                if (selectedValue && user.id === selectedValue) {
                    option.selected = true;
                }
                
                taskAssignee.appendChild(option);
            });
    
            // Fallback para garantir que o valor seja definido
            if (selectedValue && taskAssignee.value !== selectedValue) {
                taskAssignee.value = selectedValue;
            }
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        }
    };

    // Salvar tarefa
    const saveTask = async (e) => {
        e.preventDefault();

        const taskId = document.getElementById('taskId').value;
        const title = document.getElementById('taskTitle').value;

        if (!title) {
            UtilsModule.showNotification('O título da tarefa é obrigatório!', 'error');
            return;
        }

        if (taskFocusOrder && taskFocusOrder.value) {
            const parsedFocusOrder = Number(taskFocusOrder.value);
            if (!Number.isFinite(parsedFocusOrder) || parsedFocusOrder < 1) {
                UtilsModule.showNotification('A ordem do post-it deve ser um número maior que zero.', 'error');
                return;
            }
        }

        // Preparar dados da tarefa
        const taskData = {
            title: title,
            description: document.getElementById('taskDescription').value || null,
            status: document.getElementById('taskStatus').value,
            priority: document.getElementById('taskPriority').value,
            assignee: document.getElementById('taskAssignee').value || null,
            request_date: document.getElementById('taskRequestDate').value || null,
            due_date: document.getElementById('taskDueDate').value || null,
            observation: document.getElementById('taskObservation').value || null,
            jira: document.getElementById('taskJira').value || null,
            client: document.getElementById('taskClient').value || null,
            is_pinned: taskIsPinned ? taskIsPinned.checked : false,
            focus_order: taskFocusOrder && taskFocusOrder.value ? Number(taskFocusOrder.value) : null,
            type: document.getElementById('taskType').value
        };

        // Mostrar loading
        const submitBtn = taskForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        submitBtn.disabled = true;

        try {
            let result;

            if (taskId) {
                // Editar tarefa existente
                result = await StorageModule.updateTask(taskId, taskData);
            } else {
                // Criar nova tarefa - Buscar column_id baseado no status
                const columns = await StorageModule.getColumns();
                const column = columns.find(c => c.type === taskData.status);

                if (column) {
                    taskData.column_id = column.id;
                } else {
                    // Fallback: usar primeira coluna
                    taskData.column_id = columns[0]?.id;
                }

                result = await StorageModule.saveTask(taskData);
            }

            if (result) {
                hideModal();
                UtilsModule.showNotification(
                    taskId ? 'Tarefa atualizada com sucesso!' : 'Tarefa criada com sucesso!',
                    'success'
                );

                // Disparar evento personalizado para atualizar a interface
                window.dispatchEvent(new CustomEvent('tasksUpdated'));
            } else {
                throw new Error('Falha na operação');
            }

        } catch (error) {
            UtilsModule.handleApiError(error, 'salvar tarefa');
        } finally {
            // Restaurar botão
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    };

    // Excluir tarefa
    const deleteTask = async () => {
        if (!confirm('Tem certeza que deseja excluir esta tarefa?')) {
            return;
        }

        const taskId = document.getElementById('taskId').value;

        if (!taskId) {
            UtilsModule.showNotification('ID da tarefa não encontrado.', 'error');
            return;
        }

        // Mostrar loading
        if (deleteTaskBtn) {
            const originalText = deleteTaskBtn.textContent;
            deleteTaskBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
            deleteTaskBtn.disabled = true;
        }

        try {
            const success = await StorageModule.deleteTask(taskId);

            if (success) {
                hideModal();
                UtilsModule.showNotification('Tarefa excluída com sucesso!', 'success');

                // Disparar evento personalizado para atualizar a interface
                window.dispatchEvent(new CustomEvent('tasksUpdated'));
            } else {
                UtilsModule.showNotification('Erro ao excluir tarefa.', 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir tarefa:', error);
            UtilsModule.showNotification('Erro ao excluir tarefa. Verifique o console para mais detalhes.', 'error');
        } finally {
            // Restaurar botão
            if (deleteTaskBtn) {
                deleteTaskBtn.textContent = 'Excluir';
                deleteTaskBtn.disabled = false;
            }
        }
    };

    // Inicializar módulo
    const initModal = () => {
        if (!modalOverlay || isInitialized) return;

        // Configurar event listeners
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', hideModal);
        }

        if (cancelTaskBtn) {
            cancelTaskBtn.addEventListener('click', hideModal);
        }

        if (taskForm) {
            taskForm.addEventListener('submit', saveTask);
        }

        if (deleteTaskBtn) {
            deleteTaskBtn.addEventListener('click', deleteTask);
        }

        const modal = modalOverlay.querySelector('.modal');

        // Só fecha quando o clique começa E termina fora do modal.
        // Isso evita fechar durante seleção de texto/campo dentro do formulário.
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

        // Prevenir fechamento ao clicar dentro do modal
        if (modal) {
            modal.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        isInitialized = true;
    };

    const populateClients = async (selectedValue = null) => {
        if (!taskClient) return;

        taskClient.innerHTML = '<option value="">Selecionar cliente</option>';

        try {
            const { data, error } = await window.supabaseClient
                .from('clients')
                .select('name, status')
                .order('name', { ascending: true });

            if (error) throw error;

            (data || []).forEach((client) => {
                if (!client || !client.name) return;

                const option = document.createElement('option');
                option.value = client.name;
                option.textContent = client.status === 'inactive'
                    ? `${client.name} (inativo)`
                    : client.name;

                if (selectedValue && selectedValue === client.name) {
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
        hideModal
    };
})();

// Inicializar o módulo quando o DOM estiver carregado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ModalModule.initModal);
} else {
    ModalModule.initModal();
}
