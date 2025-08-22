// Módulo de armazenamento de dados
const StorageModule = (() => {
    // Chaves para localStorage
    const STORAGE_KEYS = {
        USERS: 'pharus_users',
        CURRENT_USER: 'pharus_currentUser',
        COLUMNS: 'pharus_columns',
        TASKS: 'pharus_tasks'
    };

    // Dados iniciais
    const initialUsers = [
        { id: 1, name: "Admin", email: "admin@pharus.com", password: "admin123" },
        { id: 2, name: "João Silva", email: "joao@pharus.com", password: "joao123" },
        { id: 3, name: "Maria Santos", email: "maria@pharus.com", password: "maria123" }
    ];

    const initialColumns = [
        { id: 1, title: "Pendente", type: "status" },
        { id: 2, title: "Em Andamento", type: "status" },
        { id: 3, title: "Em Teste", type: "status" },
        { id: 4, title: "Concluído", type: "status" }
    ];

    const initialTasks = [
        { 
            id: 1, 
            title: "Implementar login", 
            description: "Criar sistema de autenticação de usuários", 
            status: "in_progress", // Alterado para string
            priority: "medium", // Alterado para string
            assignee: 2, 
            requestDate: "2023-05-10", 
            dueDate: "2023-05-20", 
            observation: "Prioridade máxima", 
            jira: "PHAR-123", 
            client: "Interno", 
            type: "task", // Alterado para string
            columnId: 2
        },
        { 
            id: 2, 
            title: "Corrigir bug relatório", 
            description: "Relatório não está exibindo dados corretamente", 
            status: "pending", // Alterado para string
            priority: "medium", // Alterado para string
            assignee: 2, 
            requestDate: "2023-05-15", 
            dueDate: "2023-05-25", 
            observation: "Verificar com equipe de dados", 
            jira: "PHAR-456", 
            client: "Cliente A", 
            type: "bug", // Alterado para string
            columnId: 1
        },
        {
            id: 3,
            title: 'Atualizar documentação',
            description: 'Atualizar documentação do projeto',
            status: "completed", // Alterado para string
            priority: "low", // Alterado para string
            assignee: 3,
            requestDate: '2023-05-18',
            dueDate: '2023-05-30',
            observation: 'Documentação técnica',
            jira: 'PHAR-789',
            client: 'Interno',
            type: "task", // Alterado para string
            columnId: 3
        }
    ];

    // Inicializar dados se não existirem
    const initializeData = () => {
        if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initialUsers));
        }
        
        if (!localStorage.getItem(STORAGE_KEYS.COLUMNS)) {
            localStorage.setItem(STORAGE_KEYS.COLUMNS, JSON.stringify(initialColumns));
        }
        
        if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
            localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(initialTasks));
        }
    };

    // Obter dados
    const getData = (key) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    };

    // Salvar dados
    const saveData = (key, data) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    // Obter usuários
    const getUsers = () => getData(STORAGE_KEYS.USERS) || [];

    // Salvar usuários
    const saveUsers = (users) => saveData(STORAGE_KEYS.USERS, users);

    // Obter usuário atual
    const getCurrentUser = () => getData(STORAGE_KEYS.CURRENT_USER);

    // Salvar usuário atual
    const saveCurrentUser = (user) => saveData(STORAGE_KEYS.CURRENT_USER, user);

    // Remover usuário atual (logout)
    const removeCurrentUser = () => localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);

    // Obter colunas
    const getColumns = () => getData(STORAGE_KEYS.COLUMNS) || [];

    // Salvar colunas
    const saveColumns = (columns) => saveData(STORAGE_KEYS.COLUMNS, columns);

    // Obter tarefas
    const getTasks = () => getData(STORAGE_KEYS.TASKS) || [];

    // Salvar tarefas
    const saveTasks = (tasks) => saveData(STORAGE_KEYS.TASKS, tasks);

    // Inicializar os dados ao carregar o script
    initializeData();

    return {
        getUsers,
        saveUsers,
        getCurrentUser,
        saveCurrentUser,
        removeCurrentUser,
        getColumns,
        saveColumns,
        getTasks,
        saveTasks
    };
})();