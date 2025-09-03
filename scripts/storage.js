const StorageModule = (() => {
    const LS_KEYS = {
        CURRENT_USER: 'pharus_currentUser'
    };

    // --------- Sessão ----------
    const getCurrentUser = () => {
        const raw = localStorage.getItem(LS_KEYS.CURRENT_USER);
        return raw ? JSON.parse(raw) : null;
    };

    const saveCurrentUser = (user) => {
        localStorage.setItem(LS_KEYS.CURRENT_USER, JSON.stringify(user));
    };

    const removeCurrentUser = () => {
        localStorage.removeItem(LS_KEYS.CURRENT_USER);
    };

    // --------- Users ----------
    const getUsers = async () => {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('id, name, email')
                .order('name');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            return [];
        }
    };

    const findUserByCredentials = async (email, password) => {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('id, name, email')
                .eq('email', email)
                .eq('password', password)
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao autenticar:', error);
            return null;
        }
    };

    const createUser = async (userData) => {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .insert([userData])
                .select('id, name, email')
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            return null;
        }
    };

    // --------- Columns ----------
    const getColumns = async () => {
        try {
            const { data, error } = await supabaseClient
                .from('columns')
                .select('*')
                .order('position');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erro ao buscar colunas:', error);
            return [];
        }
    };

    const createDefaultColumns = async () => {
        const defaultColumns = [
            { title: 'A Fazer', type: 'pending', position: 0 },
            { title: 'Em Andamento', type: 'in_progress', position: 1 },
            { title: 'Em Teste', type: 'review', position: 2 },
            { title: 'Concluído', type: 'completed', position: 3 }
        ];

        try {
            const { data, error } = await supabaseClient
                .from('columns')
                .insert(defaultColumns)
                .select('*');
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao criar colunas padrão:', error);
            return [];
        }
    };

    // --------- Tasks ----------
    const getTasks = async () => {
        try {
            const { data, error } = await supabaseClient
                .from('tasks')
                .select(`
                    *,
                    assignee:users(id, name, email)
                `)
                .order('created_at');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erro ao buscar tarefas:', error);
            return [];
        }
    };

    const saveTask = async (task) => {
        try {
            const { data, error } = await supabaseClient
                .from('tasks')
                .insert([task])
                .select(`
                    *,
                    assignee:users(id, name, email)
                `)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao salvar tarefa:', error);
            return null;
        }
    };

    const updateTask = async (id, updates) => {
        try {
            const { data, error } = await supabaseClient
                .from('tasks')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select(`
                    *,
                    assignee:users(id, name, email)
                `)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao atualizar tarefa:', error);
            return null;
        }
    };

    const deleteTask = async (id) => {
        try {
            const { error } = await supabaseClient
                .from('tasks')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erro ao deletar tarefa:', error);
            return false;
        }
    };

    return {
        // sessão
        getCurrentUser,
        saveCurrentUser,
        removeCurrentUser,
        
        // users
        getUsers,
        createUser,
        findUserByCredentials,
        
        // colunas
        getColumns,
        createDefaultColumns,
        
        // tarefas
        getTasks,
        saveTask,
        updateTask,
        deleteTask
    };
})();