// Módulo do modal de perfil - Supabase
const ProfileModule = (() => {

    // Mostrar modal de perfil
    const showProfileModal = async () => {
        const profileModal = document.getElementById('profileModal');
        if (!profileModal) return;
    
        try {
            // Obter sessão atual
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;
    
            const user = session?.user;
            if (!user) throw new Error('Usuário não logado');
    
            // Buscar perfil completo na tabela profiles
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (profileError) throw profileError;
    
            // Preencher formulário
            document.getElementById('profileName').value = profile.full_name || '';
            document.getElementById('profileEmail').value = user.email || '';
            document.getElementById('profileCurrentPassword').value = '';
            document.getElementById('profileNewPassword').value = '';
            document.getElementById('profileConfirmPassword').value = '';
    
            profileModal.style.display = 'flex';
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            alert('Erro ao carregar dados do perfil: ' + error.message);
        }
    };
   

    // Fechar modal de perfil
    const hideProfileModal = () => {
        const profileModal = document.getElementById('profileModal');
        if (profileModal) profileModal.style.display = 'none';
    };

    // Salvar alterações do perfil
    const saveProfile = async (e) => {
        if (e) e.preventDefault();

        try {
            const name = document.getElementById('profileName').value;
            const email = document.getElementById('profileEmail').value;
            const currentPassword = document.getElementById('profileCurrentPassword').value;
            const newPassword = document.getElementById('profileNewPassword').value;
            const confirmPassword = document.getElementById('profileConfirmPassword').value;

            if (newPassword && !currentPassword) {
                throw new Error('Digite a senha atual para alterar a senha.');
            }
            if (newPassword && newPassword !== confirmPassword) {
                throw new Error('As novas senhas não coincidem.');
            }
            if (newPassword && newPassword.length < 6) {
                throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
            }

            // Obter usuário atual do Supabase
            const { data, error: authError } = await supabase.auth.getUser();
            if (authError) throw authError;
            const user = data.user;
            if (!user) throw new Error('Usuário não encontrado');

            // Atualizar email se necessário
            if (email !== user.email) {
                const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({ email });
                if (updateError) throw updateError;
            }

            // Atualizar senha se fornecida
            if (newPassword) {
                const { data: pwdData, error: pwdError } = await supabase.auth.updateUser({ password: newPassword });
                if (pwdError) throw pwdError;
            }

            // Atualizar nome na tabela profiles
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ full_name: name, updated_at: new Date().toISOString() })
                .eq('id', user.id);
            if (profileError) throw profileError;

            alert('Perfil atualizado com sucesso!');
            hideProfileModal();

            // Atualizar nome exibido
            const userNameElement = document.getElementById('userName');
            if (userNameElement) userNameElement.textContent = name;

        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            alert('Erro ao atualizar perfil: ' + error.message);
        }
    };

    // Inicializar módulo
    const initProfileModule = () => {
        const profileModal = document.getElementById('profileModal');
        if (!profileModal) return;

        const profileForm = document.getElementById('profileForm');
        const closeProfileModal = document.getElementById('closeProfileModal');
        const cancelProfile = document.getElementById('cancelProfile');
        const profileBtn = document.getElementById('profileBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (profileForm) profileForm.addEventListener('submit', saveProfile);
        if (closeProfileModal) closeProfileModal.addEventListener('click', hideProfileModal);
        if (cancelProfile) cancelProfile.addEventListener('click', hideProfileModal);
        if (profileModal) {
            profileModal.addEventListener('click', (e) => {
                if (e.target === profileModal) hideProfileModal();
            });
        }

        if (profileBtn) {
            profileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showProfileModal();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                AuthModule.logout();
            });
        }

        console.log('Módulo de perfil inicializado');
    };

    return {
        initProfileModule,
        showProfileModal,
        hideProfileModal
    };
})();

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', ProfileModule.initProfileModule);
