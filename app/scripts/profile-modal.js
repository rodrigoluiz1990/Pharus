// Módulo do modal de perfil - dbClient (usando apenas auth)
const ProfileModule = (() => {
    let dbApi = null;
    const DEFAULT_AVATAR_COLOR = '#3498db';
    const ALLOWED_AVATAR_COLORS = new Set(['#3498db', '#4f46e5', '#16a34a', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7', '#334155']);
    const ALLOWED_AVATAR_ICONS = new Set(['', 'user', 'user-tie', 'headset', 'code', 'wrench', 'briefcase', 'star', 'bolt']);

    const normalizeAvatarColor = (value) => {
        const color = String(value || '').trim().toLowerCase();
        return ALLOWED_AVATAR_COLORS.has(color) ? color : DEFAULT_AVATAR_COLOR;
    };

    const normalizeAvatarIcon = (value) => {
        const icon = String(value || '').trim();
        return ALLOWED_AVATAR_ICONS.has(icon) ? icon : '';
    };

    const getProfileInitials = (name, email) => {
        const base = String(name || email || 'U').trim();
        if (!base) return 'U';
        return base
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join('') || 'U';
    };

    const updateProfileAvatarPreview = () => {
        const preview = document.getElementById('profileAvatarPreview');
        if (!preview) return;

        const name = document.getElementById('profileName')?.value || '';
        const email = document.getElementById('profileEmail')?.value || '';
        const avatarColor = normalizeAvatarColor(document.getElementById('profileAvatarColor')?.value);
        const avatarIcon = normalizeAvatarIcon(document.getElementById('profileAvatarIcon')?.value);

        preview.style.background = avatarColor;
        if (avatarIcon) {
            preview.innerHTML = `<i class="fas fa-${avatarIcon}"></i>`;
            return;
        }

        preview.textContent = getProfileInitials(name, email);
    };

    const fillProfileAccessFields = async (userId) => {
        const permissionSelect = document.getElementById('profilePermissionGroup');
        const statusSelect = document.getElementById('profileStatus');
        if (!permissionSelect || !statusSelect || !userId || !dbApi) return;

        permissionSelect.innerHTML = '<option value="">Sem grupo</option>';
        statusSelect.value = 'active';

        try {
            const { data: appUser, error: appUserError } = await dbApi
                .from('app_users')
                .select('permission_group_id,status')
                .eq('id', userId)
                .single();

            if (appUserError || !appUser) return;

            const statusValue = String(appUser.status || 'active');
            const allowedStatuses = new Set(['active', 'inactive', 'pending']);
            statusSelect.value = allowedStatuses.has(statusValue) ? statusValue : 'active';

            const groupId = String(appUser.permission_group_id || '').trim();
            if (!groupId) return;

            const { data: groupData, error: groupError } = await dbApi
                .from('permission_groups')
                .select('id,name')
                .eq('id', groupId)
                .single();

            if (groupError || !groupData) return;

            permissionSelect.innerHTML = '';
            const option = document.createElement('option');
            option.value = String(groupData.id || '');
            option.textContent = String(groupData.name || 'Grupo');
            option.selected = true;
            permissionSelect.appendChild(option);
        } catch (error) {
            console.warn('Não foi possível carregar grupo de permissão do perfil:', error);
        }
    };

    // Função para aguardar o dbClient estar disponível
    const waitForDbClient = () => {
        return new Promise((resolve) => {
            if (window.dbClient) {
                dbApi = window.dbClient;
                resolve(window.dbClient);
            } else {
                const checkInterval = setInterval(() => {
                    if (window.dbClient) {
                        clearInterval(checkInterval);
                        dbApi = window.dbClient;
                        resolve(window.dbClient);
                    }
                }, 100);
            }
        });
    };

    // Mostrar modal de perfil
    const showProfileModal = async () => {
        const profileModal = document.getElementById('profileModal');
        if (!profileModal) {
            console.error('Modal de perfil não encontrado');
            return;
        }

        try {
            // Aguardar dbClient estar disponível
            await waitForDbClient();

            // Obter usuário atual
            const { data: { user }, error: userError } = await dbApi.auth.getUser();
            if (userError) throw userError;
            if (!user) throw new Error('Usuário não logado');

            // Preencher formulário com dados do auth
            document.getElementById('profileName').value = 
                user.user_metadata?.full_name || 
                user.email?.split('@')[0] || 
                '';

            document.getElementById('profileEmail').value = user.email || '';
            document.getElementById('profileCurrentPassword').value = '';
            document.getElementById('profileNewPassword').value = '';
            document.getElementById('profileConfirmPassword').value = '';
            document.getElementById('profileAvatarColor').value = normalizeAvatarColor(user.user_metadata?.avatar_color);
            document.getElementById('profileAvatarIcon').value = normalizeAvatarIcon(user.user_metadata?.avatar_icon);
            await fillProfileAccessFields(user.id);
            updateProfileAvatarPreview();

            profileModal.style.display = 'flex';
            
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            alert('Erro ao carregar dados do perfil: ' + error.message);
        }
    };

    // Fechar modal de perfil
    const hideProfileModal = () => {
        const profileModal = document.getElementById('profileModal');
        if (profileModal) {
            profileModal.style.display = 'none';
            // Limpar formulário ao fechar
            const form = document.getElementById('profileForm');
            if (form) form.reset();
        }
    };

    // Salvar alterações do perfil
    const saveProfile = async (e) => {
        if (e) e.preventDefault();

        const submitBtn = document.querySelector('#profileForm button[type="submit"]');
        if (!submitBtn) return;

        const originalText = submitBtn.innerHTML;

        try {
            // Mostrar loading
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            submitBtn.disabled = true;

            // Aguardar dbClient estar disponível
            await waitForDbClient();

            const name = document.getElementById('profileName').value.trim();
            const email = document.getElementById('profileEmail').value.trim();
            const currentPassword = document.getElementById('profileCurrentPassword').value;
            const newPassword = document.getElementById('profileNewPassword').value;
            const confirmPassword = document.getElementById('profileConfirmPassword').value;
            const avatarColor = normalizeAvatarColor(document.getElementById('profileAvatarColor').value);
            const avatarIcon = normalizeAvatarIcon(document.getElementById('profileAvatarIcon').value);

            // Validações
            if (!name) {
                throw new Error('Nome é obrigatório');
            }

            if (!email) {
                throw new Error('Email é obrigatório');
            }

            if (newPassword && !currentPassword) {
                throw new Error('Digite a senha atual para alterar a senha.');
            }

            if (newPassword && newPassword !== confirmPassword) {
                throw new Error('As novas senhas não coincidem.');
            }

            if (newPassword && newPassword.length < 6) {
                throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
            }

            // Obter usuário atual
            const { data: { user }, error: userError } = await dbApi.auth.getUser();
            if (userError) throw userError;
            if (!user) throw new Error('Usuário não encontrado');

            // Preparar dados de atualização (igual ao users.js)
            const updateData = {};

            // Atualizar email se necessário
            if (email !== user.email) {
                updateData.email = email;
            }

            // Atualizar senha se fornecida
            if (newPassword) {
                updateData.password = newPassword;
            }

            // Atualizar metadata (nome) - igual ao users.js
            const currentName = user.user_metadata?.full_name || '';
            const currentAvatarColor = normalizeAvatarColor(user.user_metadata?.avatar_color);
            const currentAvatarIcon = normalizeAvatarIcon(user.user_metadata?.avatar_icon);
            const shouldUpdateProfileMetadata =
                name !== currentName ||
                avatarColor !== currentAvatarColor ||
                avatarIcon !== currentAvatarIcon;
            if (shouldUpdateProfileMetadata) {
                updateData.data = { 
                    ...user.user_metadata, 
                    full_name: name,
                    avatar_color: avatarColor,
                    avatar_icon: avatarIcon,
                    avatar_emoji_code: ''
                };
            }

            // Fazer update se houver dados para atualizar
            if (Object.keys(updateData).length > 0) {
                const { data: updatedUser, error: updateError } = await dbApi.auth.updateUser(updateData);
                if (updateError) throw updateError;
                
                console.log('Perfil atualizado com sucesso:', updatedUser);
            }

            const { error: syncProfileError } = await dbApi
                .from('app_users')
                .update({
                    email,
                    raw_user_meta_data: {
                        ...user.user_metadata,
                        full_name: name,
                        avatar_color: avatarColor,
                        avatar_icon: avatarIcon,
                        avatar_emoji_code: ''
                    },
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);
            if (syncProfileError) throw syncProfileError;

            alert('Perfil atualizado com sucesso!');
            
            // Atualizar informações no sidebar
            updateSidebarUserInfo(name, email, avatarColor, avatarIcon);
            window.dispatchEvent(new CustomEvent('pharus:user-profile-updated', {
                detail: {
                    userId: String(user.id || ''),
                    name,
                    email,
                    avatar_color: avatarColor,
                    avatar_icon: avatarIcon,
                }
            }));
            
            hideProfileModal();

        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            
            // Tratamento de erros específicos do dbApi
            let errorMessage = error.message;
            if (error.message.includes('Email rate limit exceeded')) {
                errorMessage = 'Muitas tentativas de alteração de email. Tente novamente mais tarde.';
            } else if (error.message.includes('Password should be at least 6 characters')) {
                errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
            } else if (error.message.includes('Invalid login credentials')) {
                errorMessage = 'Senha atual incorreta.';
            }
            
            alert('Erro ao atualizar perfil: ' + errorMessage);
        } finally {
            // Restaurar botão
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    };

    // Atualizar informações do usuário no sidebar
    const updateSidebarUserInfo = (name, email, avatarColor, avatarIcon) => {
        const userNameElement = document.getElementById('sidebarUserName');
        const userEmailElement = document.getElementById('sidebarUserEmail');
        const userAvatarElement = document.getElementById('sidebarUserAvatar');

        if (userNameElement) userNameElement.textContent = name;
        if (userEmailElement) userEmailElement.textContent = email;
        if (userAvatarElement) {
            const normalizedColor = normalizeAvatarColor(avatarColor);
            const normalizedIcon = normalizeAvatarIcon(avatarIcon);
            userAvatarElement.style.background = normalizedColor;
            if (normalizedIcon) {
                userAvatarElement.innerHTML = `<i class="fas fa-${normalizedIcon}"></i>`;
                return;
            }

            userAvatarElement.textContent = name.split(' ')
                .map(part => part.charAt(0))
                .join('')
                .toUpperCase()
                .substring(0, 2);
        }
    };

    // Função para logout (mantida para compatibilidade)
    const logout = async () => {
        try {
            await waitForDbClient();
            const { error } = await dbApi.auth.signOut();
            if (error) throw error;

            localStorage.removeItem('pharus_local_session');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Erro no logout:', error);
            alert('Erro ao fazer logout: ' + error.message);
        }
    };

    // Inicializar módulo
    const initProfileModule = () => {
        console.log('Inicializando módulo de perfil (apenas auth)...');
        
        // Aguardar elementos do DOM
        const checkForElements = setInterval(() => {
            const profileModal = document.getElementById('profileModal');
            const profileForm = document.getElementById('profileForm');
            const closeProfileModal = document.getElementById('closeProfileModal');
            const cancelProfile = document.getElementById('cancelProfile');
            
            if (profileModal && profileForm && closeProfileModal && cancelProfile) {
                clearInterval(checkForElements);
                
                // Configurar event listeners
                closeProfileModal.addEventListener('click', hideProfileModal);
                cancelProfile.addEventListener('click', hideProfileModal);
                profileForm.addEventListener('submit', saveProfile);
                
                // Fechar modal ao clicar fora
                profileModal.addEventListener('click', (e) => {
                    if (e.target === profileModal) hideProfileModal();
                });

                const profileName = document.getElementById('profileName');
                const profileEmail = document.getElementById('profileEmail');
                const profileAvatarColor = document.getElementById('profileAvatarColor');
                const profileAvatarIcon = document.getElementById('profileAvatarIcon');

                profileName?.addEventListener('input', updateProfileAvatarPreview);
                profileEmail?.addEventListener('input', updateProfileAvatarPreview);
                profileAvatarColor?.addEventListener('change', updateProfileAvatarPreview);
                profileAvatarIcon?.addEventListener('change', updateProfileAvatarPreview);
                
                console.log('Módulo de perfil inicializado com sucesso (apenas auth)');
            }
        }, 100);
    };

    return {
        initProfileModule,
        showProfileModal,
        hideProfileModal,
        saveProfile,
        logout
    };
})();

// Inicializar quando o DOM estiver carregado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ProfileModule.initProfileModule);
} else {
    ProfileModule.initProfileModule();
}

// Exportar para uso global
window.ProfileModule = ProfileModule;






