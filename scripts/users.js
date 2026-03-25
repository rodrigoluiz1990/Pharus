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
    const userPermissionGroup = document.getElementById("userPermissionGroup");

    let users = [];
    let currentUser = null;
    let permissionGroups = [];
    let canEditOtherUsers = false;
    let isInitialized = false;
    let usersSortKey = 'created_at';
    let usersSortDirection = 'desc';
    const DEFAULT_AVATAR_COLOR = '#3498db';
    const ALLOWED_AVATAR_ICONS = new Set(['', 'user', 'user-tie', 'headset', 'code', 'wrench', 'briefcase', 'star', 'bolt']);
    const USER_SORTABLE_HEADERS = [
        { index: 0, key: 'name' },
        { index: 1, key: 'email' },
        { index: 2, key: 'permission_group' },
        { index: 3, key: 'status' },
        { index: 4, key: 'last_sign_in_at' },
        { index: 5, key: 'created_at' },
    ];

    const loadUsers = async () => {
        try {
            showUsersLoading();
            await loadPermissionGroups();

            const { data: { session }, error: sessionError } = await window.supabaseClient.auth.getSession();

            if (sessionError || !session) {
                throw new Error('Usuário não autenticado. Faáa login primeiro.');
            }

            // Obter usuário atual
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            currentUser = user;
            await loadCurrentUserPermissions();

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
                    permission_group_id: null,
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

    const loadCurrentUserPermissions = async () => {
        canEditOtherUsers = false;
        if (!window.supabaseClient || !currentUser?.id) return;

        try {
            const { data: userRow, error: userError } = await window.supabaseClient
                .from('app_users')
                .select('id, role, permission_group_id')
                .eq('id', currentUser.id)
                .single();

            if (userError) throw userError;

            const role = String(userRow?.role || currentUser?.user_metadata?.role || '').toLowerCase();
            if (role === 'admin') {
                canEditOtherUsers = true;
                return;
            }

            const groupId = userRow?.permission_group_id;
            if (!groupId) return;

            const { data: ruleRows, error: ruleError } = await window.supabaseClient
                .from('permission_group_rules')
                .select('allowed')
                .eq('group_id', groupId)
                .eq('screen_key', 'usuarios')
                .eq('option_key', 'edit');

            if (ruleError) throw ruleError;
            canEditOtherUsers = Array.isArray(ruleRows) && ruleRows.some((row) => row.allowed !== false);
        } catch (error) {
            canEditOtherUsers = false;
            console.warn('Não foi possável carregar permissáes do usuário atual:', error);
        }
    };

    const loadPermissionGroups = async () => {
        if (!window.supabaseClient || !userPermissionGroup) return;
        try {
            const { data, error } = await window.supabaseClient
                .from('permission_groups')
                .select('id, name, status')
                .order('name', { ascending: true });
            if (error) throw error;
            permissionGroups = (data || []).filter((item) => String(item.status || 'active') === 'active');
        } catch (error) {
            permissionGroups = [];
            console.warn('Não foi possável carregar grupos de permissáo:', error);
        }
        renderPermissionGroupOptions();
    };

    const renderPermissionGroupOptions = (selectedId = '') => {
        if (!userPermissionGroup) return;
        userPermissionGroup.innerHTML = '<option value="">Sem grupo</option>';
        permissionGroups.forEach((group) => {
            const option = document.createElement('option');
            option.value = String(group.id);
            option.textContent = String(group.name || 'Grupo');
            if (selectedId && String(selectedId) === String(group.id)) {
                option.selected = true;
            }
            userPermissionGroup.appendChild(option);
        });
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

    const getPermissionGroupName = (groupId) => {
        const id = String(groupId || '').trim();
        if (!id) return 'Sem grupo';
        const group = permissionGroups.find((item) => String(item.id) === id);
        return group ? String(group.name || 'Sem grupo') : 'Sem grupo';
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
                .select('id,email,raw_user_meta_data,role,status,permission_group_id,last_sign_in_at,created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            users = (usersData || []).map(user => ({
                id: user.id,
                email: user.email || 'Não informado',
                name: user.raw_user_meta_data?.full_name || user.email?.split('@')[0] || 'Usuário',
                role: user.role || 'user',
                status: user.status || 'active',
                permission_group_id: user.permission_group_id || null,
                last_sign_in_at: user.last_sign_in_at,
                created_at: user.created_at,
                avatar_color: sanitizeAvatarColor(user.raw_user_meta_data?.avatar_color),
                avatar_icon: sanitizeAvatarIcon(user.raw_user_meta_data?.avatar_icon),
            }));

            renderUsersTable();
        } catch (error) {
            throw new Error('Não foi possável carregar os usuários: ' + error.message);
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
        const sortedUsers = getSortedUsers(users);

        sortedUsers.forEach(user => {
            const row = document.createElement('tr');

            const lastAccess = user.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleDateString('pt-BR') + ' ' + 
                  new Date(user.last_sign_in_at).toLocaleTimeString('pt-BR')
                : 'Nunca acessou';

            const createdAt = user.created_at
                ? new Date(user.created_at).toLocaleDateString('pt-BR')
                : '-';

            const safeStatusClass = `status-${getSafeStatusKey(user.status)}`;
            const avatarHtml = renderAvatarBadgeHtml(user);
            const permissionGroupName = getPermissionGroupName(user.permission_group_id);

            row.innerHTML = `
                <td>
                    <div class="user-name-cell">
                        ${avatarHtml}
                        <span>${escapeHtml(user.name)}</span>
                    </div>
                </td>
                <td>${escapeHtml(user.email)}</td>
                <td>${escapeHtml(permissionGroupName)}</td>
                <td><span class="user-status ${safeStatusClass}">${getStatusText(user.status)}</span></td>
                <td>${lastAccess}</td>
                <td>${createdAt}</td>
                <td>
                    <div class="user-actions">
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
        }, 100);
    };

    const normalizeComparableDate = (value) => {
        const date = value ? new Date(value) : null;
        if (!date || Number.isNaN(date.getTime())) return 0;
        return date.getTime();
    };

    const normalizeComparableString = (value) => String(value || '').trim().toLowerCase();

    const getComparableValue = (user, sortKey) => {
        if (!user) return '';
        switch (sortKey) {
            case 'name':
                return normalizeComparableString(user.name);
            case 'email':
                return normalizeComparableString(user.email);
            case 'permission_group':
                return normalizeComparableString(getPermissionGroupName(user.permission_group_id));
            case 'status':
                return normalizeComparableString(getStatusText(user.status));
            case 'last_sign_in_at':
                return normalizeComparableDate(user.last_sign_in_at);
            case 'created_at':
                return normalizeComparableDate(user.created_at);
            default:
                return normalizeComparableString(user.name);
        }
    };

    const getSortedUsers = (rawUsers) => {
        const directionFactor = usersSortDirection === 'asc' ? 1 : -1;
        const source = Array.isArray(rawUsers) ? [...rawUsers] : [];

        source.sort((a, b) => {
            const aValue = getComparableValue(a, usersSortKey);
            const bValue = getComparableValue(b, usersSortKey);

            if (aValue < bValue) return -1 * directionFactor;
            if (aValue > bValue) return 1 * directionFactor;
            return normalizeComparableString(a?.name).localeCompare(normalizeComparableString(b?.name));
        });

        return source;
    };

    const updateUsersSortHeaderStyles = () => {
        const headers = document.querySelectorAll('.users-table thead th');
        if (!headers || !headers.length) return;

        headers.forEach((header) => {
            const key = String(header.dataset.sortKey || '').trim();
            const isSortable = Boolean(key);
            header.classList.toggle('users-sortable-header', isSortable);
            header.classList.toggle('users-sort-asc', isSortable && key === usersSortKey && usersSortDirection === 'asc');
            header.classList.toggle('users-sort-desc', isSortable && key === usersSortKey && usersSortDirection === 'desc');
        });
    };

    const setupUsersTableSorting = () => {
        const table = document.querySelector('.users-table');
        if (!table) return;
        const headers = table.querySelectorAll('thead th');
        if (!headers || !headers.length) return;

        USER_SORTABLE_HEADERS.forEach(({ index, key }) => {
            const header = headers[index];
            if (!header) return;

            header.dataset.sortKey = key;
            header.classList.add('users-sortable-header');
            if (header.dataset.sortBound === 'true') return;

            header.addEventListener('click', () => {
                if (usersSortKey === key) {
                    usersSortDirection = usersSortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    usersSortKey = key;
                    usersSortDirection = key === 'created_at' || key === 'last_sign_in_at' ? 'desc' : 'asc';
                }
                updateUsersSortHeaderStyles();
                renderUsersTable();
            });
            header.dataset.sortBound = 'true';
        });

        updateUsersSortHeaderStyles();
    };

    const createUser = async (userData) => {
        try {
            UtilsModule.showLoading('Criando usuário...');
            const metadata = {
                full_name: userData.name,
                role: userData.role,
                avatar_color: userData.avatar_color,
                avatar_icon: userData.avatar_icon,
            };

            const { error } = await window.supabaseClient
                .from('app_users')
                .insert([{
                    email: String(userData.email || '').trim().toLowerCase(),
                    password: String(userData.password || ''),
                    raw_user_meta_data: metadata,
                    role: userData.role,
                    status: userData.status,
                    permission_group_id: userData.permission_group_id || null,
                    last_sign_in_at: null,
                }]);

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
            
            const isCurrentUser = Boolean(currentUser && currentUser.id === userId);
            const canEditTarget = isCurrentUser || canEditOtherUsers;
            if (!canEditTarget) {
                UtilsModule.hideLoading();
                if (typeof UtilsModule.showPermissionDeniedModal === 'function') {
                    UtilsModule.showPermissionDeniedModal('Vocá não tem permissáo para editar outros usuários.');
                } else {
                    UtilsModule.showNotification('Vocá não tem permissáo para editar outros usuários.', 'warning');
                }
                return;
            }

            if (isCurrentUser) {
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

                const { error: profileError } = await window.supabaseClient
                    .from('app_users')
                    .update({
                        role: userData.role,
                        status: userData.status,
                        permission_group_id: userData.permission_group_id || null,
                    })
                    .eq('id', userId);
                if (profileError) throw profileError;
                
                UtilsModule.hideLoading();
                UtilsModule.showNotification('Seu perfil foi atualizado com sucesso!', 'success');
            } else {
                const targetUser = users.find((item) => String(item.id) === String(userId));
                const effectiveRole = String(userData.role || targetUser?.role || 'user');
                const metadata = {
                    full_name: userData.name,
                    role: effectiveRole,
                    avatar_color: userData.avatar_color,
                    avatar_icon: userData.avatar_icon,
                };

                const payload = {
                    email: userData.email,
                    role: effectiveRole,
                    status: userData.status,
                    permission_group_id: userData.permission_group_id || null,
                    raw_user_meta_data: metadata,
                };

                if (userData.password && String(userData.password).trim()) {
                    payload.password = userData.password;
                }

                const { error: updateError } = await window.supabaseClient
                    .from('app_users')
                    .update(payload)
                    .eq('id', userId);
                if (updateError) throw updateError;

                UtilsModule.hideLoading();
                UtilsModule.showNotification('Usuário atualizado com sucesso!', 'success');
            }

            loadUsers();
            closeModal();

        } catch (error) {
            UtilsModule.hideLoading();
            console.error('Erro ao atualizar usuário:', error);
            
            let errorMessage = 'Erro ao atualizar usuário';
            if (error.message.includes('Email rate limit exceeded')) {
                errorMessage = 'Muitas tentativas de alteraááo. Tente novamente mais tarde.';
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
        const fields = ['userName', 'userEmail', 'userStatus', 'userPermissionGroup', 'userAvatarColor', 'userAvatarIcon'];
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.disabled = false;
                element.style.opacity = '1';
            }
        });

        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userStatus').value = user.status;
        if (userPermissionGroup) {
            renderPermissionGroupOptions(user.permission_group_id || '');
            userPermissionGroup.value = user.permission_group_id || '';
        }
        if (userAvatarColor) userAvatarColor.value = sanitizeAvatarColor(user.avatar_color);
        if (userAvatarIcon) userAvatarIcon.value = sanitizeAvatarIcon(user.avatar_icon);
        updateAvatarPreview();

        // Verificar se á o usuário atual
        const isCurrentUser = currentUser && currentUser.id === userId;
        const canEditTarget = Boolean(isCurrentUser || canEditOtherUsers);

        if (!canEditTarget) {
            if (typeof UtilsModule.showPermissionDeniedModal === 'function') {
                UtilsModule.showPermissionDeniedModal('Apenas usuários com permissáo de editar usuários podem alterar outros perfis.');
            } else {
                UtilsModule.showNotification('Apenas usuários com permissáo de editar usuários podem alterar outros perfis.', 'warning');
            }
            return;
        }

        // Limpar e tornar opcionais os campos de senha na ediááo
        document.getElementById('userPassword').value = '';
        document.getElementById('userConfirmPassword').value = '';
        document.getElementById('userPassword').required = false;
        document.getElementById('userConfirmPassword').required = false;

        userModal.style.display = 'flex';
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
        const fields = ['userName', 'userEmail', 'userStatus', 'userPermissionGroup', 'userAvatarColor', 'userAvatarIcon'];
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
        
        // Mostrar campos de senha como obrigatários para novo usuário
        document.getElementById('userPassword').required = true;
        document.getElementById('userConfirmPassword').required = true;
        if (userAvatarColor) userAvatarColor.value = DEFAULT_AVATAR_COLOR;
        if (userAvatarIcon) userAvatarIcon.value = '';
        if (userPermissionGroup) {
            renderPermissionGroupOptions('');
            userPermissionGroup.value = '';
        }
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
            role: (userIdField.value
                ? (users.find((u) => String(u.id) === String(userIdField.value))?.role || 'user')
                : 'user'),
            status: document.getElementById('userStatus').value,
            permission_group_id: userPermissionGroup ? (userPermissionGroup.value || null) : null,
            password: document.getElementById('userPassword').value,
            avatar_color: sanitizeAvatarColor(userAvatarColor?.value),
            avatar_icon: sanitizeAvatarIcon(userAvatarIcon?.value),
        };

        const confirmPassword = document.getElementById('userConfirmPassword').value;

        // Validaááes
        if (!formData.name || !formData.email) {
            UtilsModule.showNotification('Nome e e-mail sáo obrigatários', 'error');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            UtilsModule.showNotification('Por favor, insira um e-mail válido', 'error');
            return;
        }

        const isNewUser = !userIdField.value;

        if (isNewUser && !formData.password) {
            UtilsModule.showNotification('Senha á obrigatária para novo usuário', 'error');
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
        setupUsersTableSorting();
        isInitialized = true;

        console.log('Mádulo de usuários inicializado');
        loadUsers();
    };

    return {
        initUsersModule,
        loadUsers
    };
})();

// Inicializar quando o DOM estiver carregado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', UsersModule.initUsersModule);
} else {
    UsersModule.initUsersModule();
}





