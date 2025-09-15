// Módulo do modal de perfil - Supabase
const ProfileModule = (() => {

    // Função para aguardar o supabaseClient estar disponível
    const waitForSupabaseClient = () => {
        return new Promise((resolve) => {
            if (window.supabaseClient) {
                resolve(window.supabaseClient);
            } else {
                const checkInterval = setInterval(() => {
                    if (window.supabaseClient) {
                        clearInterval(checkInterval);
                        resolve(window.supabaseClient);
                    }
                }, 100);
            }
        });
    };

    // Mostrar modal de perfil
    const showProfileModal = async () => {
        const profileModal = document.getElementById('profileModal');
        if (!profileModal) return;

        try {
            // Aguardar supabaseClient estar disponível
            const supabase = await waitForSupabaseClient();

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

            // Se não encontrar perfil, usar dados básicos do auth
            if (profileError) {
                console.warn('Perfil não encontrado na tabela profiles, usando dados do auth:', profileError);
            }

            // Preencher formulário
            document.getElementById('profileName').value = profile?.full_name || user.user_metadata?.full_name || '';
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

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            // Mostrar loading
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            submitBtn.disabled = true;

            // Aguardar supabaseClient estar disponível
            const supabase = await waitForSupabaseClient();

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

            // Preparar dados de atualização
            const updateData = {};

            // Atualizar email se necessário
            if (email !== user.email) {
                updateData.email = email;
            }

            // Atualizar senha se fornecida
            if (newPassword) {
                updateData.password = newPassword;
            }

            // Atualizar metadata se nome for diferente
            const currentName = user.user_metadata?.full_name || '';
            if (name !== currentName) {
                updateData.data = { full_name: name };
            }

            // Fazer update se houver dados para atualizar
            if (Object.keys(updateData).length > 0) {
                const { data: updatedUser, error: updateError } = await supabase.auth.updateUser(updateData);
                if (updateError) throw updateError;
            }

            // Tentar atualizar na tabela profiles (se existir)
            try {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        full_name: name,
                        updated_at: new Date().toISOString()
                    });
                if (profileError) {
                    console.warn('Não foi possível atualizar tabela profiles:', profileError);
                }
            } catch (dbError) {
                console.warn('Tabela profiles não disponível:', dbError);
            }

            alert('Perfil atualizado com sucesso!');
            hideProfileModal();

            // Atualizar nome exibido
            const userNameElement = document.getElementById('userName');
            if (userNameElement) userNameElement.textContent = name;

        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            alert('Erro ao atualizar perfil: ' + error.message);
        } finally {
            // Restaurar botão
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    };

    // Logout function
    const logout = async () => {
        try {
            const supabase = await waitForSupabaseClient();
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            localStorage.removeItem('supabaseSession');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Erro no logout:', error);
            alert('Erro ao fazer logout: ' + error.message);
        }
    };

    // Inicializar módulo
    const initProfileModule = () => {
        // Aguardar o sidebar ser carregado
        const checkForElements = setInterval(() => {
            const profileModal = document.getElementById('profileModal');
            const closeProfileModal = document.getElementById('closeProfileModal');
            const cancelProfile = document.getElementById('cancelProfile');
            
            if (profileModal && closeProfileModal && cancelProfile) {
                clearInterval(checkForElements);
                
                // Configurar event listeners
                closeProfileModal.addEventListener('click', hideProfileModal);
                cancelProfile.addEventListener('click', hideProfileModal);
                
                // Fechar modal ao clicar fora
                profileModal.addEventListener('click', (e) => {
                    if (e.target === profileModal) hideProfileModal();
                });
                
                console.log('Módulo de perfil inicializado no sidebar');
            }
        }, 100);
    };

    return {
        initProfileModule,
        showProfileModal,
        hideProfileModal,
        logout
    };
})();

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', ProfileModule.initProfileModule);

// Exportar para uso global
window.ProfileModule = ProfileModule;