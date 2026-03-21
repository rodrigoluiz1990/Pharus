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
    const userAvatarPreview = document.getElementById("userAvatarPreview");
    const userAvatarColor = document.getElementById("userAvatarColor");
    const userAvatarIcon = document.getElementById("userAvatarIcon");

    let users = [];
    let currentUser = null;
    let isInitialized = false;
    const DEFAULT_AVATAR_COLOR = '#3498db';
    const ALLOWED_AVATAR_ICONS = new Set(['', 'user', 'user-tie', 'headset', 'code', 'wrench', 'briefcase', 'star', 'bolt']);

    const loadUsers = async () => {
        try {
            showUsersLoading();

            const { data: { session }, error: sessionError } = await window.supabaseClient.auth.getSession();

            if (sessionError || !session) {
                throw new Error('Usuário não autenticado. Faça login primeiro.');
            }

            // Obter usuário atual
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            currentUser = user;

            // Buscar usuários - tentar view primeiro
            try {
                await loadUsersFromView();
            } catch (viewError) {
                console.warn('Falha na view, tentando abordagem alternativa:', viewError);
                // Fallback: usar apenas o usuário atual
                users = [{
                    id: currentUser.id,
                    email: currentUser.email,
                    name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0],
                    role: currentUser.user_metadata?.role || 'user',
                    status: 'active',
                    last_sign_in_at: currentUser.last_sign_in_at,
                    created_at: currentUser.created_at,
                    avatar_color: sanitizeAvatarColor(currentUser.user_metadata?.avatar_color),
                    avatar_icon: sanitizeAvatarIcon(currentUser.user_metadata?.avatar_icon),
                }];
                renderUsersTable();
            }

        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            showError(error.message);
        }
    };

    const sanitizeAvatarColor = (color) => {
        const value = String(color || '').trim();
        return /^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_AVATAR_COLOR;
    };

    const sanitizeAvatarIcon = (icon) => {
        const value = String(icon || '').trim();
        return ALLOWED_AVATAR_ICONS.has(value) ? value : '';
    };

    const getUserInitials = (name, email) => {
        const base = String(name || email || 'U').trim();
        if (!base) return 'U';
        return base
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join('') || 'U';
    };

    const renderAvatarBadgeHtml = (user) => {
        const color = sanitizeAvatarColor(user.avatar_color);
        const icon = sanitizeAvatarIcon(user.avatar_icon);
        const initials = escapeHtml(getUserInitials(user.name, user.email));
        const safeColor = escapeHtml(color);

        if (icon) {
            return `<span class="user-avatar-badge" style="background:${safeColor}"><i class="fas fa-${icon}"></i></span>`;
        }
        return `<span class="user-avatar-badge" style="background:${safeColor}">${initials}</span>`;
    };

    const updateAvatarPreview = () => {
        if (!userAvatarPreview) return;
        const color = sanitizeAvatarColor(userAvatarColor?.value);
        const icon = sanitizeAvatarIcon(userAvatarIcon?.value);
        const name = document.getElementById('userName')?.value || '';
        const email = document.getElementById('userEmail')?.value || '';

        userAvatarPreview.style.background = color;
        if (icon) {
            userAvatarPreview.innerHTML = `<i class="fas fa-${icon}"></i>`;
        } else {
            userAvatarPreview.textContent = getUserInitials(name, email);
        }
    };

    const loadUsersFromView = async () => {
        try {
            const { data: usersData, error } = await window.supabaseClient
                .from('app_users')
                .select('id,email,raw_user_meta_data,role,status,last_sign_in_at,created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            users = (usersData || []).map(user => ({
                id: user.id,
                email: user.email || 'Não informado',
                name: user.raw_user_meta_data?.full_name || user.email?.split('@')[0] || 'Usuário',
                role: user.role || 'user',
                status: user.status || 'active',
                last_sign_in_at: user.last_sign_in_at,
                created_at: user.created_at,
                avatar_color: sanitizeAvatarColor(user.raw_user_meta_data?.avatar_color),
                avatar_icon: sanitizeAvatarIcon(user.raw_user_meta_data?.avatar_icon),
            }));

            renderUsersTable();
        } catch (error) {
            throw new Error('Não foi possível carregar os usuários: ' + error.message);
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
                ? new Date(user.last_sign_in_at).toLocaleDateString('pt-BR') + ' ' + 
                  new Date(user.last_sign_in_at).toLocaleTimeString('pt-BR')
                : 'Nunca acessou';

            const createdAt = user.created_at
                ? new Date(user.created_at).toLocaleDateString('pt-BR')
                : '-';

            const safeStatusClass = `status-${getSafeStatusKey(user.status)}`;
            const safeRoleClass = `role-${getSafeRoleKey(user.role)}`;
            const avatarHtml = renderAvatarBadgeHtml(user);

            row.innerHTML = `
                <td>
                    <div class="user-name-cell">
                        ${avatarHtml}
                        <span>${escapeHtml(user.name)}</span>
                    </div>
                </td>
                <td>${escapeHtml(user.email)}</td>
                <td><span class="role-badge ${safeRoleClass}">${getRoleText(user.role)}</span></td>
                <td><span class="user-status ${safeStatusClass}">${getStatusText(user.status)}</span></td>
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
                    </div>
                </td>
            `;

            usersTableBody.appendChild(row);
        });

        setTimeout(() => {
            addEditListeners();
            addChatListeners();
        }, 100);
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
                        role: userData.role,
                        avatar_color: userData.avatar_color,
                        avatar_icon: userData.avatar_icon,
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
            
            let errorMessage = error.message;
            if (error.message.includes('User already registered')) {
                errorMessage = 'Este e-mail já está cadastrado.';
            } else if (error.message.includes('Invalid email')) {
                errorMessage = 'E-mail inválido.';
            } else if (error.message.includes('Password should be at least 6 characters')) {
                errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
            }
            
            UtilsModule.showNotification(`Erro ao criar usuário: ${errorMessage}`, 'error');
        }
    };

    const updateUser = async (userId, userData) => {
        try {
            UtilsModule.showLoading('Atualizando usuário...');
            
            if (currentUser && currentUser.id === userId) {
                // Atualizar usuário atual via auth API
                const updatePayload = {
                    email: userData.email,
                    data: {
                        full_name: userData.name,
                        role: userData.role,
                        avatar_color: userData.avatar_color,
                        avatar_icon: userData.avatar_icon,
                    }
                };

                if (userData.password && String(userData.password).trim()) {
                    updatePayload.password = userData.password;
                }

                const { error: authError } = await window.supabaseClient.auth.updateUser(updatePayload);
                
                if (authError) throw authError;
                
                UtilsModule.hideLoading();
                UtilsModule.showNotification('Seu perfil foi atualizado com sucesso!', 'success');
            } else {
                // Para outros usuários, mostrar mensagem informativa
                UtilsModule.hideLoading();
                UtilsModule.showNotification(
                    'Para editar outros usuários, use o painel de Authentication do Supabase.', 
                    'info'
                );
                return;
            }

            loadUsers();
            closeModal();

        } catch (error) {
            UtilsModule.hideLoading();
            console.error('Erro ao atualizar usuário:', error);
            
            let errorMessage = 'Erro ao atualizar usuário';
            if (error.message.includes('Email rate limit exceeded')) {
                errorMessage = 'Muitas tentativas de alteração. Tente novamente mais tarde.';
            } else if (error.message.includes('Invalid login credentials')) {
                errorMessage = 'Credenciais inválidas.';
            }
            
            UtilsModule.showNotification(errorMessage, 'error');
        }
    };

    const openEditUserModal = async (userId) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        userModalTitle.textContent = 'Editar Usuário';
        userIdField.value = user.id;
        
        // Resetar todos os campos primeiro
        const fields = ['userName', 'userEmail', 'userRole', 'userStatus', 'userAvatarColor', 'userAvatarIcon'];
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.disabled = false;
                element.style.opacity = '1';
            }
        });

        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userRole').value = user.role;
        document.getElementById('userStatus').value = user.status;
        if (userAvatarColor) userAvatarColor.value = sanitizeAvatarColor(user.avatar_color);
        if (userAvatarIcon) userAvatarIcon.value = sanitizeAvatarIcon(user.avatar_icon);
        updateAvatarPreview();

        // Verificar se é o usuário atual
        const isCurrentUser = currentUser && currentUser.id === userId;

        if (!isCurrentUser) {
            // Desabilitar campos para usuários que não são o atual
            fields.forEach(field => {
                const element = document.getElementById(field);
                if (element) {
                    element.disabled = true;
                    element.style.opacity = '0.6';
                }
            });
            UtilsModule.showNotification('Apenas edição do próprio usuário é permitida', 'warning');
        }

        // Limpar e tornar opcionais os campos de senha na edição
        document.getElementById('userPassword').value = '';
        document.getElementById('userConfirmPassword').value = '';
        document.getElementById('userPassword').required = false;
        document.getElementById('userConfirmPassword').required = false;

        userModal.style.display = 'flex';
    };

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

    const openChatWithUser = (userId, userName, userEmail) => {
        const targetId = encodeURIComponent(String(userId || '').trim());
        if (!targetId) {
            UtilsModule.showNotification('Contato invalido para abrir chat.', 'error');
            return;
        }
        window.location.href = `chatconversas.html?userId=${targetId}`;
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

    const openAddUserModal = () => {
        userModalTitle.textContent = 'Novo Usuário';
        userIdField.value = '';
        userForm.reset();
        
        // Habilitar todos os campos
        const fields = ['userName', 'userEmail', 'userRole', 'userStatus', 'userAvatarColor', 'userAvatarIcon'];
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.disabled = false;
                element.style.opacity = '1';
            }
        });

        // Limpar campos de senha
        document.getElementById('userPassword').value = '';
        document.getElementById('userConfirmPassword').value = '';
        
        // Mostrar campos de senha como obrigatórios para novo usuário
        document.getElementById('userPassword').required = true;
        document.getElementById('userConfirmPassword').required = true;
        if (userAvatarColor) userAvatarColor.value = DEFAULT_AVATAR_COLOR;
        if (userAvatarIcon) userAvatarIcon.value = '';
        updateAvatarPreview();
        
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
            password: document.getElementById('userPassword').value,
            avatar_color: sanitizeAvatarColor(userAvatarColor?.value),
            avatar_icon: sanitizeAvatarIcon(userAvatarIcon?.value),
        };

        const confirmPassword = document.getElementById('userConfirmPassword').value;

        // Validações
        if (!formData.name || !formData.email) {
            UtilsModule.showNotification('Nome e e-mail são obrigatórios', 'error');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            UtilsModule.showNotification('Por favor, insira um e-mail válido', 'error');
            return;
        }

        const isNewUser = !userIdField.value;

        if (isNewUser && !formData.password) {
            UtilsModule.showNotification('Senha é obrigatória para novo usuário', 'error');
            return;
        }

        if (formData.password && formData.password.length < 6) {
            UtilsModule.showNotification('A senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        if (formData.password && formData.password !== confirmPassword) {
            UtilsModule.showNotification('As senhas não coincidem. Por favor, digite a mesma senha nos dois campos.', 'error');
            return;
        }

        try {
            if (userIdField.value) {
                await updateUser(userIdField.value, formData);
            } else {
                await createUser(formData);
            }
        } catch (error) {
            console.error('Erro ao processar formulário:', error);
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
            const safeMessage = escapeHtml(message || 'Erro ao carregar usuários');
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: #dc3545; padding: 30px;">
                        <i class="fas fa-exclamation-triangle"></i> ${safeMessage}
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

    const getSafeStatusKey = (status) => {
        const allowed = new Set(['active', 'inactive', 'pending']);
        return allowed.has(status) ? status : 'inactive';
    };

    const getSafeRoleKey = (role) => {
        const allowed = new Set(['user', 'manager', 'admin']);
        return allowed.has(role) ? role : 'user';
    };

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    const initUsersModule = () => {
        if (isInitialized) return;

        const usersView = document.querySelector('.users-view');
        if (usersView) {
            usersView.style.display = 'block';
        }

        if (addUserBtn) addUserBtn.addEventListener('click', openAddUserModal);
        if (userForm) userForm.addEventListener('submit', handleUserSubmit);
        if (closeUserModal) closeUserModal.addEventListener('click', closeModal);
        if (cancelUserBtn) cancelUserBtn.addEventListener('click', closeModal);
        if (userAvatarColor) userAvatarColor.addEventListener('change', updateAvatarPreview);
        if (userAvatarIcon) userAvatarIcon.addEventListener('change', updateAvatarPreview);
        const userNameInput = document.getElementById('userName');
        const userEmailInput = document.getElementById('userEmail');
        if (userNameInput) userNameInput.addEventListener('input', updateAvatarPreview);
        if (userEmailInput) userEmailInput.addEventListener('input', updateAvatarPreview);
        isInitialized = true;

        console.log('Módulo de usuários inicializado');
        loadUsers();
    };

    return {
        initUsersModule,
        loadUsers,
        openChatWithUser
    };
})();

// Inicializar quando o DOM estiver carregado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', UsersModule.initUsersModule);
} else {
    UsersModule.initUsersModule();
}


