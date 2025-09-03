// Módulo do modal de perfil - Versão Simplificada
const ProfileModule = (() => {
    
    // Mostrar modal de perfil
    const showProfileModal = () => {
        const profileModal = document.getElementById('profileModal');
        const currentUser = JSON.parse(localStorage.getItem('pharus_currentUser'));
        
        if (profileModal && currentUser) {
            // Preencher formulário com dados atuais
            document.getElementById('profileName').value = currentUser.name || '';
            document.getElementById('profileEmail').value = currentUser.email || '';
            
            // Limpar campos de senha
            document.getElementById('profileCurrentPassword').value = '';
            document.getElementById('profileNewPassword').value = '';
            document.getElementById('profileConfirmPassword').value = '';
            
            profileModal.style.display = 'flex';
        }
    };
    
    // Fechar modal de perfil
    const hideProfileModal = () => {
        const profileModal = document.getElementById('profileModal');
        if (profileModal) {
            profileModal.style.display = 'none';
        }
    };
    
    // Salvar alterações do perfil
    const saveProfile = async (e) => {
        if (e) e.preventDefault();
        
        const currentUser = JSON.parse(localStorage.getItem('pharus_currentUser'));
        if (!currentUser) {
            alert('Usuário não encontrado. Faça login novamente.');
            return;
        }
        
        const name = document.getElementById('profileName').value;
        const email = document.getElementById('profileEmail').value;
        const currentPassword = document.getElementById('profileCurrentPassword').value;
        const newPassword = document.getElementById('profileNewPassword').value;
        const confirmPassword = document.getElementById('profileConfirmPassword').value;
        
        try {
            // Validar alterações de senha
            if (newPassword && !currentPassword) {
                throw new Error('Digite a senha atual para alterar a senha.');
            }
            
            if (newPassword !== confirmPassword) {
                throw new Error('As novas senhas não coincidem.');
            }
            
            if (newPassword && newPassword.length < 6) {
                throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
            }
            
            // Verificar senha atual se for alterar a senha
            if (newPassword && currentPassword !== currentUser.password) {
                throw new Error('Senha atual incorreta.');
            }
            
            // Atualizar usuário
            const users = await StorageModule.getUsers();
            const userIndex = users.findIndex(u => u.id === currentUser.id);
            
            if (userIndex === -1) {
                throw new Error('Usuário não encontrado.');
            }
            
            // Atualizar dados
            users[userIndex].name = name;
            users[userIndex].email = email;
            
            // Atualizar senha se fornecida
            if (newPassword) {
                users[userIndex].password = newPassword;
            }
            
            // Salvar alterações
            await StorageModule.saveUsers(users);
            
            // Atualizar usuário atual na sessão
            if (currentUser.id === users[userIndex].id) {
                localStorage.setItem('pharus_currentUser', JSON.stringify(users[userIndex]));
                
                // Atualizar nome exibido
                const userNameElement = document.getElementById('userName');
                if (userNameElement) {
                    userNameElement.textContent = users[userIndex].name;
                }
            }
            
            alert('Perfil atualizado com sucesso!');
            hideProfileModal();
            
        } catch (error) {
            alert('Erro ao atualizar perfil: ' + error.message);
        }
    };
    
    // Inicializar módulo
    const initProfileModule = () => {
        const profileModal = document.getElementById('profileModal');
        if (!profileModal) return;
        
        // Configurar event listeners
        const profileForm = document.getElementById('profileForm');
        const closeProfileModal = document.getElementById('closeProfileModal');
        const cancelProfile = document.getElementById('cancelProfile');
        
        if (profileForm) {
            profileForm.addEventListener('submit', saveProfile);
        }
        
        if (closeProfileModal) {
            closeProfileModal.addEventListener('click', hideProfileModal);
        }
        
        if (cancelProfile) {
            cancelProfile.addEventListener('click', hideProfileModal);
        }
        
        // Fechar modal ao clicar fora dele
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                hideProfileModal();
            }
        });
        
        // Configurar item de menu "Meu Perfil" - CORREÇÃO PRINCIPAL
        const profileMenuItems = document.querySelectorAll('.dropdown-item');
        if (profileMenuItems.length > 0) {
            // O primeiro item é "Meu Perfil"
            profileMenuItems[0].addEventListener('click', (e) => {
                e.preventDefault();
                showProfileModal();
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