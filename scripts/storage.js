const StorageModule = (() => {
    const LS_KEYS = {
        CURRENT_USER: 'pharus_currentUser'
    };
    const TASK_AGENDA_MARKER_PREFIX = '[PHARUS_TASK_ID:';

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

    const buildTaskAgendaMarker = (taskId) => `${TASK_AGENDA_MARKER_PREFIX}${String(taskId)}]`;

    const parseDateOnlyToIsoRange = (dateValue) => {
        const raw = String(dateValue || '').trim();
        const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);

        const startLocal = new Date(year, month - 1, day, 0, 0, 0, 0);
        const endLocal = new Date(year, month - 1, day, 23, 59, 0, 0);

        if (Number.isNaN(startLocal.getTime()) || Number.isNaN(endLocal.getTime())) {
            return null;
        }

        return {
            startAt: startLocal.toISOString(),
            endAt: endLocal.toISOString(),
        };
    };

    const mapTaskStatusToAgendaStatus = (taskStatus) => {
        const safe = String(taskStatus || '').toLowerCase();
        if (safe === 'completed' || safe === 'done') return 'done';
        if (safe === 'cancelled' || safe === 'canceled') return 'cancelled';
        return 'pending';
    };

    const buildAgendaDescriptionFromTask = (task) => {
        const marker = buildTaskAgendaMarker(task.id);
        const parts = [];
        const taskDescription = String(task.description || '').trim();
        const taskObservation = String(task.observation || '').trim();

        if (taskDescription) parts.push(taskDescription);
        if (taskObservation) parts.push(`Observacao: ${taskObservation}`);
        parts.push(marker);

        return parts.join('\n\n');
    };

    const getCurrentUserId = async () => {
        try {
            const { data, error } = await supabaseClient.auth.getSession();
            if (error) return null;
            return data?.session?.user?.id || null;
        } catch (_error) {
            return null;
        }
    };

    const findAgendaEventByTaskId = async (taskId) => {
        const marker = buildTaskAgendaMarker(taskId);
        const { data, error } = await supabaseClient
            .from('agenda_events')
            .select('id, description, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;
        const rows = Array.isArray(data) ? data : [];
        return rows.find((row) => String(row?.description || '').includes(marker)) || null;
    };

    const syncTaskToAgenda = async (taskRecord) => {
        const taskId = String(taskRecord?.id || '').trim();
        if (!taskId) return;

        const dueDate = String(taskRecord?.due_date || '').trim();
        const linkedEvent = await findAgendaEventByTaskId(taskId);

        if (!dueDate) {
            if (linkedEvent?.id) {
                const { error: deleteError } = await supabaseClient
                    .from('agenda_events')
                    .delete()
                    .eq('id', linkedEvent.id);
                if (deleteError) throw deleteError;
            }
            return;
        }

        const range = parseDateOnlyToIsoRange(dueDate);
        if (!range) return;

        const payload = {
            title: String(taskRecord.title || 'Tarefa').trim() || 'Tarefa',
            description: buildAgendaDescriptionFromTask(taskRecord),
            event_type: 'task',
            status: mapTaskStatusToAgendaStatus(taskRecord.status),
            start_at: range.startAt,
            end_at: range.endAt,
            is_all_day: true,
            updated_at: new Date().toISOString(),
        };

        if (linkedEvent?.id) {
            const { error: updateError } = await supabaseClient
                .from('agenda_events')
                .update(payload)
                .eq('id', linkedEvent.id);
            if (updateError) throw updateError;
            return;
        }

        const createdBy = await getCurrentUserId();
        const insertPayload = {
            ...payload,
            created_by: createdBy,
        };

        const { error: insertError } = await supabaseClient
            .from('agenda_events')
            .insert([insertPayload]);
        if (insertError) throw insertError;
    };

    // --------- Users ----------
    const getUsers = async () => {
        try {
            const { data, error } = await supabaseClient
                .from('app_users') // Nome da view
                .select('id, email, raw_user_meta_data')
                .order('email');

            if (error) throw error;

            return data.map(user => ({
                id: user.id,
                name: user.raw_user_meta_data?.full_name || user.email,
                email: user.email
            }));
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            return [];
        }
    };

    // REMOVER ESTA FUN??O - usar auth do Supabase em vez disso
    const findUserByCredentials = async (email, password) => {
        console.warn('findUserByCredentials está obsoleta - use AuthModule.login');
        return null;
    };

    const createUser = async (userData) => {
        try {
            // Usar auth.signUp do Supabase em vez de inserir diretamente
            const { data, error } = await supabaseClient.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        full_name: userData.name
                    }
                }
            });

            if (error) throw error;
            return data.user;
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
            { title: 'Pendente', type: 'pending', position: 0 },
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

    // --------- Clients ----------
    const getClients = async () => {
        try {
            const { data, error } = await supabaseClient
                .from('clients')
                .select('id, name, acronym, status')
                .order('name', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            return [];
        }
    };

    // --------- Tasks ----------
    const getTasks = async () => {
        try {
            console.log('Buscando tasks do Supabase...');

            // Buscar tasks sem join
            const { data: tasksData, error: tasksError } = await supabaseClient
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (tasksError) {
                console.error('Erro ao buscar tasks:', tasksError);
                throw tasksError;
            }

            // Buscar usuários separadamente
            const { data: usersData, error: usersError } = await supabaseClient
                .from('app_users')
                .select('id, email, raw_user_meta_data');

            if (usersError) {
                console.error('Erro ao buscar usuários:', usersError);
                throw usersError;
            }

            // Combinar os dados manualmente
            const tasksWithUsers = tasksData.map(task => {
                const assigneeUser = task.assignee
                    ? usersData.find(user => user.id === task.assignee)
                    : null;

                return {
                    ...task,
                    assignee_user: assigneeUser ? {
                        id: assigneeUser.id,
                        name: assigneeUser.raw_user_meta_data?.full_name || assigneeUser.email,
                        email: assigneeUser.email
                    } : null
                };
            });

            console.log('Tasks carregadas:', tasksWithUsers.length);
            return tasksWithUsers;

        } catch (error) {
            console.error('Erro completo ao buscar tarefas:', error);
            return [];
        }
    };

    const saveTask = async (task) => {
        try {
            const taskData = {
                ...task,
                assignee: task.assignee || null
            };

            const { data, error } = await supabaseClient
                .from('tasks')
                .insert([taskData])
                .select('*')
                .single();

            if (error) throw error;

            try {
                await syncTaskToAgenda(data);
            } catch (agendaError) {
                console.warn('Falha ao sincronizar tarefa com agenda (saveTask):', agendaError);
            }

            return data;

        } catch (error) {
            console.error('Erro ao salvar tarefa:', error);
            return null;
        }
    };

    const updateTask = async (id, updates) => {
        try {
            const updateData = {
                ...updates,
                updated_at: new Date().toISOString(),
                assignee: updates.assignee || null
            };

            const { data, error } = await supabaseClient
                .from('tasks')
                .update(updateData)
                .eq('id', id)
                .select('*')
                .single();

            if (error) throw error;

            try {
                await syncTaskToAgenda(data);
            } catch (agendaError) {
                console.warn('Falha ao sincronizar tarefa com agenda (updateTask):', agendaError);
            }

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

    // Nova função para logout
    const logout = async () => {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
            removeCurrentUser();
            return true;
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
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
        getClients,

        // tarefas
        getTasks,
        saveTask,
        updateTask,
        deleteTask,

        // auth
        logout
    };
})();


