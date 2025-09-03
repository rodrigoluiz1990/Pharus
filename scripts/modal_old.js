// Módulo de gerenciamento de modais
const ModalModule = (() => {
    const modalOverlay = document.getElementById('taskModal');
    const taskForm = document.getElementById('taskForm');
    const closeModalBtn = document.getElementById('closeModal');
    const cancelTaskBtn = document.getElementById('cancelTask');
    const deleteTaskBtn = document.getElementById('deleteTask');
    const taskAssignee = document.getElementById('taskAssignee');

    // Mostrar modal
    const showModal = (columnId, taskId = null) => {
        // Limpar formulário
        taskForm.reset();
        deleteTaskBtn.classList.add('hidden');
        
        // Popular dropdown de responsáveis
        populateAssignees();
        
        if (taskId) {
            // Modo edição
            const task = StorageModule.getTasks().find(t => t.id === taskId);
            if (task) {
                document.getElementById('taskId').value = task.id;
                document.getElementById('taskTitle').value = task.title;
                document.getElementById('taskDescription').value = task.description || '';
                document.getElementById('taskStatus').value = task.status;
                document.getElementById('taskPriority').value = task.priority;
                document.getElementById('taskAssignee').value = task.assignee;
                document.getElementById('taskRequestDate').value = task.requestDate || '';
                document.getElementById('taskDueDate').value = task.dueDate || '';
                document.getElementById('taskObservation').value = task.observation || '';
                document.getElementById('taskJira').value = task.jira || '';
                document.getElementById('taskClient').value = task.client || '';
                document.getElementById('taskType').value = task.type || 'task';
                
                document.getElementById('modalTitle').textContent = 'Editar Tarefa';
                deleteTaskBtn.classList.remove('hidden');
            }
        } else {
            // Modo criação
            document.getElementById('taskId').value = '';
            document.getElementById('taskStatus').value = UtilsModule.getColumnStatus(columnId);
            document.getElementById('modalTitle').textContent = 'Nova Tarefa';
        }
        
        modalOverlay.classList.add('visible');
    };

    // Esconder modal
    const hideModal = () => {
        modalOverlay.classList.remove('visible');
    };

    // Popular dropdown de responsáveis
    const populateAssignees = () => {
        if (!taskAssignee) return;
        
        taskAssignee.innerHTML = '';
        const users = StorageModule.getUsers();
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            taskAssignee.appendChild(option);
        });
    };

    // Salvar tarefa
    const saveTask = (e) => {
        e.preventDefault();
        
        const taskId = document.getElementById('taskId').value;
        const title = document.getElementById('taskTitle').value;
        
        if (!title) {
            alert('O título da tarefa é obrigatório!');
            return;
        }
        
        const taskData = {
            title: title,
            description: document.getElementById('taskDescription').value,
            status: document.getElementById('taskStatus').value,
            priority: document.getElementById('taskPriority').value,
            assignee: parseInt(document.getElementById('taskAssignee').value),
            requestDate: document.getElementById('taskRequestDate').value,
            dueDate: document.getElementById('taskDueDate').value,
            observation: document.getElementById('taskObservation').value,
            jira: document.getElementById('taskJira').value,
            client: document.getElementById('taskClient').value,
            type: document.getElementById('taskType').value
        };
        
        let tasks = StorageModule.getTasks();
        
        if (taskId) {
            // Editar tarefa existente
            const taskIndex = tasks.findIndex(t => t.id === parseInt(taskId));
            if (taskIndex !== -1) {
                tasks[taskIndex] = { ...tasks[taskIndex], ...taskData };
            }
        } else {
            // Criar nova tarefa
            const columns = StorageModule.getColumns();
            taskData.id = UtilsModule.generateId(tasks);
            taskData.columnId = columns.find(c => c.title === 'Pendente').id;
            tasks.push(taskData);
        }
        
        StorageModule.saveTasks(tasks);
        hideModal();
        
        // Disparar evento personalizado para atualizar a interface
        window.dispatchEvent(new CustomEvent('tasksUpdated'));
    };

    // Excluir tarefa
    const deleteTask = () => {
        if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
            const taskId = parseInt(document.getElementById('taskId').value);
            let tasks = StorageModule.getTasks();
            
            tasks = tasks.filter(t => t.id !== taskId);
            StorageModule.saveTasks(tasks);
            
            hideModal();
            
            // Disparar evento personalizado para atualizar a interface
            window.dispatchEvent(new CustomEvent('tasksUpdated'));
        }
    };

    // Inicializar módulo
    const initModal = () => {
        if (!modalOverlay) return;
        
        // Configurar event listeners
        closeModalBtn.addEventListener('click', hideModal);
        cancelTaskBtn.addEventListener('click', hideModal);
        taskForm.addEventListener('submit', saveTask);
        deleteTaskBtn.addEventListener('click', deleteTask);
        
        // Fechar modal ao clicar fora dele
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                hideModal();
            }
        });
    };

    return {
        initModal,
        showModal,
        hideModal
    };
})();

// Inicializar o módulo quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', ModalModule.initModal);