// scripts/users.js
const UsersModule = (() => {
    const usersTableBody = document.getElementById("usersTableBody");
    const addUserBtn = document.getElementById("addUserBtn");
    const userModal = document.getElementById("userModal");
    const userForm = document.getElementById("userForm");
    const userModalTitle = document.getElementById("userModalTitle");
    const userIdField = document.getElementById("userId");
    const deleteUserBtn = document.getElementById("deleteUser");
    const closeUserModal = document.getElementById("closeUserModal");
    const cancelUserBtn = document.getElementById("cancelUser");

    let users = [];

    const loadUsers = async () => {
        try {
            showUsersLoading();

            const { data: { session }, error: sessionError } = await window.supabaseClient.auth.getSession();

            if (sessionError || !session) {
                throw new Error('Usuário não autenticado. Faça login primeiro.');
            }

            const { data: usersData, error } = await window.supabaseClient
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                throw new Error('Não foi possível carregar os usuários.');
            }

            users = (usersData || []).map(user => ({
                id: user.id,
                email: user.email || 'Não informado',
                name: user.full_name || user.email?.split('@')[0] || 'Usuário',
                role: user.role || 'user',
                status: user.status || 'active',
                last_sign_in_at: user.last_sign_in_at,
                created_at: user.created_at
            }));

            renderUsersTable();
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            showError(error.message);
        }
    };

    const renderUsersTable = () => {
        if (!usersTableBody) return;

        if (users.length === 0) {
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-users">
                        <i class="fas fa-users"></i>
                        <div>Nenhum usuário encontrado</div>
                    </td>
                </tr>
            `;
            return;
        }

        usersTableBody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');

            const lastAccess = user.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleDateString('pt-BR')
                : 'Nunca acessou';

            const createdAt = user.created_at
                ? new Date(user.created_at).toLocaleDateString('pt-BR')
                : '-';

            const statusClass = `status-${user.status}`;
            const roleClass = `role-${user.role}`;

            row.innerHTML = `
                <td>${escapeHtml(user.name)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td><span class="role-badge ${roleClass}">${getRoleText(user.role)}</span></td>
                <td><span class="user-status ${statusClass}">${getStatusText(user.status)}</span></td>
                <td>${lastAccess}</td>
                <td>${createdAt}</td>
                <td>
                    <div class="user-actions">
                        <button class="btn-chat" data-user-id="${user.id}" data-user-name="${escapeHtml(user.name)}" data-user-email="${escapeHtml(user.email)}">
                            <i class="fas fa-comment"></i> Chat
                        </button>
                        <button class="btn-edit" data-user-id="${user.id}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-delete" data-user-id="${user.id}">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </td>
            `;

            usersTableBody.appendChild(row);
        });

        addEditListeners();
        addDeleteListeners();
        addChatListeners();
    };

    // Adicione o event listener para o botão de chat
    const addChatListeners = () => {
        const chatButtons = document.querySelectorAll('.btn-chat');
        if (chatButtons.length === 0) return;
        
        chatButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.currentTarget.dataset.userId;
                const userName = e.currentTarget.dataset.userName;
                const userEmail = e.currentTarget.dataset.userEmail;
                openChatWithUser(userId, userName, userEmail);
            });
        });
    };

    // Adicione esta função para abrir o chat com um usuário específico
    const openChatWithUser = (userId, userName, userEmail) => {
        // Verificar se o módulo de chat está disponível
        if (typeof ChatModule !== 'undefined' && ChatModule.toggleChat) {
            ChatModule.toggleChat();

            // Simular clique no contato após um breve delay para garantir que o chat está carregado
            setTimeout(() => {
                // Tentar encontrar o elemento do contato na lista
                const contactElement = document.querySelector(`.contact-item[data-user-id="${userId}"]`);
                if (contactElement) {
                    contactElement.click();
                } else {
                    // Se o contato não estiver na lista, tentar abrir o chat diretamente
                    console.log('Contato não encontrado na lista, tentando abrir chat diretamente');
                    
                    // Esta função precisa ser exposta no ChatModule
                    if (typeof ChatModule.openChatWithUser === 'function') {
                        ChatModule.openChatWithUser(userId, userName, userEmail);
                    } else {
                        console.error('Função openChatWithUser não disponível no ChatModule');
                        UtilsModule.showNotification('Não foi possível iniciar o chat. Recarregue a página e tente novamente.', 'error');
                    }
                }
            }, 500);
        } else {
            console.error('Módulo de chat não disponível');
            UtilsModule.showNotification('O sistema de chat não está disponível no momento.', 'error');
            
            // Tentar carregar o módulo de chat dinamicamente
            loadChatModule().then(() => {
                if (typeof ChatModule !== 'undefined' && ChatModule.toggleChat) {
                    openChatWithUser(userId, userName, userEmail);
                }
            });
        }
    };

    // Função para carregar o módulo de chat dinamicamente
    const loadChatModule = () => {
        return new Promise((resolve) => {
            if (typeof ChatModule !== 'undefined') {
                resolve();
                return;
            }
            
            // Verificar se o script já está carregado
            if (document.querySelector('script[src*="chat.js"]')) {
                // Aguardar o carregamento
                const checkInterval = setInterval(() => {
                    if (typeof ChatModule !== 'undefined') {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                
                // Timeout após 5 segundos
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve();
                }, 5000);
            } else {
                // Carregar o script do chat
                const script = document.createElement('script');
                script.src = 'scripts/chat.js';
                script.onload = () => {
                    console.log('Módulo de chat carregado com sucesso');
                    resolve();
                };
                script.onerror = () => {
                    console.error('Falha ao carregar o módulo de chat');
                    resolve();
                };
                document.head.appendChild(script);
                
                // Carregar os estilos do chat
                if (!document.querySelector('link[href="styles/chat.css"]')) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = 'styles/chat.css';
                    document.head.appendChild(link);
                }
            }
        });
    };

    const addEditListeners = () => {
        const editButtons = document.querySelectorAll('.btn-edit');
        if (editButtons.length === 0) return;
        
        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.currentTarget.dataset.userId;
                openEditUserModal(userId);
            });
        });
    };

    const addDeleteListeners = () => {
        const deleteButtons = document.querySelectorAll('.btn-delete');
        if (deleteButtons.length === 0) return;
        
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.currentTarget.dataset.userId;
                deleteUser(userId);
            });
        });
    };

    const createUser = async (userData) => {
        try {
            UtilsModule.showLoading('Criando usuário...');

            const { data, error } = await window.supabaseClient.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        full_name: userData.name,
                        role: userData.role
                    }
                }
            });

            if (error) throw error;

            UtilsModule.hideLoading();
            UtilsModule.showNotification('Usuário criado com sucesso!', 'success');

            loadUsers();
            closeModal();

        } catch (error) {
            UtilsModule.hideLoading();
            console.error('Erro ao criar usuário:', error);
            UtilsModule.showNotification(`Erro ao criar usuário: ${error.message}`, 'error');
        }
    };

    const updateUser = async (userId, userData) => {
        try {
            UtilsModule.showLoading('Atualizando usuário...');

            const { error } = await window.supabaseClient.auth.updateUser({
                data: {
                    full_name: userData.name,
                    role: userData.role
                }
            });

            if (error) throw error;

            UtilsModule.hideLoading();
            UtilsModule.showNotification('Usuário atualizado com sucesso!', 'success');

            loadUsers();
            closeModal();

        } catch (error) {
            UtilsModule.hideLoading();
            console.error('Erro ao atualizar usuário:', error);
            UtilsModule.showNotification(`Erro ao atualizar usuário: ${error.message}`, 'error');
        }
    };

    const deleteUser = async (userId) => {
        if (!confirm('Tem certeza que deseja marcar este usuário como inativo?')) {
            return;
        }

        try {
            UtilsModule.showLoading('Atualizando usuário...');

            const { error } = await window.supabaseClient
                .from('user_profiles')
                .update({ status: 'inactive' })
                .eq('id', userId);

            if (error) throw error;

            UtilsModule.hideLoading();
            UtilsModule.showNotification('Usuário marcado como inativo!', 'success');

            loadUsers();

        } catch (error) {
            UtilsModule.hideLoading();
            console.error('Erro ao atualizar usuário:', error);
            UtilsModule.showNotification(`Erro ao atualizar usuário: ${error.message}`, 'error');
        }
    };

    const openAddUserModal = () => {
        userModalTitle.textContent = 'Novo Usuário';
        userIdField.value = '';
        userForm.reset();
        deleteUserBtn.style.display = 'none';
        userModal.style.display = 'flex';
    };

    const openEditUserModal = (userId) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        userModalTitle.textContent = 'Editar Usuário';
        userIdField.value = user.id;
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userRole').value = user.role;
        document.getElementById('userStatus').value = user.status;

        deleteUserBtn.style.display = 'block';
        userModal.style.display = 'flex';
    };

    const closeModal = () => {
        userModal.style.display = 'none';
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();

        const formData = {
            name: document.getElementById('userName').value.trim(),
            email: document.getElementById('userEmail').value.trim(),
            role: document.getElementById('userRole').value,
            status: document.getElementById('userStatus').value,
            password: document.getElementById('userPassword').value
        };

        if (!formData.name || !formData.email) {
            UtilsModule.showNotification('Nome e e-mail são obrigatórios', 'error');
            return;
        }

        if (!userIdField.value && !formData.password) {
            UtilsModule.showNotification('Senha é obrigatória para novo usuário', 'error');
            return;
        }

        if (formData.password && formData.password.length < 6) {
            UtilsModule.showNotification('A senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        if (formData.password !== document.getElementById('userConfirmPassword').value) {
            UtilsModule.showNotification('As senhas não coincidem', 'error');
            return;
        }

        if (userIdField.value) {
            await updateUser(userIdField.value, formData);
        } else {
            await createUser(formData);
        }
    };

    const showUsersLoading = () => {
        if (usersTableBody) {
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="loading-users">
                        <i class="fas fa-spinner fa-spin"></i> Carregando usuários...
                    </td>
                </tr>
            `;
        }
    };

    const showError = (message) => {
        if (usersTableBody) {
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: #dc3545; padding: 30px;">
                        <i class="fas fa-exclamation-triangle"></i> ${message}
                        <p style="font-size: 14px; margin-top: 10px;">
                            <button onclick="UsersModule.loadUsers()" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Tentar Novamente
                            </button>
                        </p>
                    </td>
                </tr>
            `;
        }
    };

    const getStatusText = (status) => {
        const statusMap = {
            'active': 'Ativo',
            'inactive': 'Inativo',
            'pending': 'Pendente'
        };
        return statusMap[status] || status;
    };

    const getRoleText = (role) => {
        const roleMap = {
            'user': 'Usuário',
            'manager': 'Gerente',
            'admin': 'Administrador'
        };
        return roleMap[role] || role;
    };

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const initUsersModule = () => {
        if (addUserBtn) addUserBtn.addEventListener('click', openAddUserModal);
        if (userForm) userForm.addEventListener('submit', handleUserSubmit);
        if (closeUserModal) closeUserModal.addEventListener('click', closeModal);
        if (cancelUserBtn) cancelUserBtn.addEventListener('click', closeModal);

        console.log('Módulo de usuários inicializado');
        loadUsers();
    };

    return {
        initUsersModule,
        loadUsers,
        openChatWithUser // Expor esta função para uso externo, se necessário
    };
})();

document.addEventListener('DOMContentLoaded', UsersModule.initUsersModule);