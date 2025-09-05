// Módulo de gerenciamento de modais
const ModalModule = (() => {
    const modalOverlay = document.getElementById('taskModal');
    const taskForm = document.getElementById('taskForm');
    const closeModalBtn = document.getElementById('closeModal');
    const cancelTaskBtn = document.getElementById('cancelTask');
    const deleteTaskBtn = document.getElementById('deleteTask');
    const taskAssignee = document.getElementById('taskAssignee');

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
                    document.getElementById('taskClient').value = task.client || '';
                    document.getElementById('taskType').value = task.type || 'task';

                    document.getElementById('modalTitle').textContent = 'Editar Tarefa';
                    if (deleteTaskBtn) {
                        deleteTaskBtn.style.display = 'block';
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
        if (!modalOverlay) return;

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

        // Fechar modal ao clicar fora dele
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                hideModal();
            }
        });

        // Prevenir fechamento ao clicar dentro do modal
        const modal = modalOverlay.querySelector('.modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    };

    return {
        initModal,
        showModal,
        hideModal
    };
})();

// Inicializar o módulo quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', ModalModule.initModal);