// scripts/sidebar.js
class SidebarManager {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.init();
    }

    // Função para obter a página atual
    getCurrentPage() {
        const pathParts = window.location.pathname.split('/');
        return pathParts[pathParts.length - 1];
    }

    // Inicialização principal
    init() {
        console.log('Inicializando sidebar...');
        console.log('Página atual detectada:', this.currentPage);

        this.setupNavigation();
        this.setupViewToggle();
        this.initSidebarUserProfile();

        console.log('Sidebar inicializado com sucesso');
    }

    // Configurar navegação do menu
    setupNavigation() {
        const menuItems = document.querySelectorAll('.menu-item');

        menuItems.forEach(item => {
            const targetPage = item.getAttribute('data-page');

            // Destacar item do menu atual
            if (targetPage === this.currentPage) {
                item.classList.add('active');
                console.log('Destacando menu:', targetPage);
            }

            // Adicionar evento de clique para navegação
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const clickedPage = item.getAttribute('data-page');
                console.log('Clicou no menu:', clickedPage);

                if (clickedPage && clickedPage !== this.currentPage) {
                    console.log('Navegando para:', clickedPage);
                    window.location.href = clickedPage;
                }
            });
        });
    }

    // Configurar toggle de visualização
    setupViewToggle() {
        // Mostrar/ocultar toggle de visualização apenas na página de quadro de tarefas
        const toggleElement = document.getElementById('boardViewToggle');
        if (toggleElement && this.currentPage === 'quadrodetarefas.html') {
            toggleElement.style.display = 'block';
            console.log('Mostrando toggle de visualização');

            // Configurar botões de toggle se existirem
            this.setupToggleButtons();
        }
    }

    // Configurar botões de toggle de visualização
    setupToggleButtons() {
        const boardViewBtn = document.getElementById('boardViewBtn');
        const sociousViewBtn = document.getElementById('sociousViewBtn');

        if (boardViewBtn && sociousViewBtn) {
            boardViewBtn.addEventListener('click', () => this.switchView('board'));
            sociousViewBtn.addEventListener('click', () => this.switchView('socious'));
        }
    }

    // Alternar entre visualizações
    switchView(viewType) {
        const boardView = document.getElementById('taskBoard');
        const sociousView = document.getElementById('sociousView');
        const boardViewBtn = document.getElementById('boardViewBtn');
        const sociousViewBtn = document.getElementById('sociousViewBtn');

        if (viewType === 'board') {
            if (boardView) boardView.style.display = 'flex';
            if (sociousView) sociousView.style.display = 'none';
            if (boardViewBtn) boardViewBtn.classList.add('active');
            if (sociousViewBtn) sociousViewBtn.classList.remove('active');
        } else if (viewType === 'socious') {
            if (boardView) boardView.style.display = 'none';
            if (sociousView) sociousView.style.display = 'block';
            if (boardViewBtn) boardViewBtn.classList.remove('active');
            if (sociousViewBtn) sociousViewBtn.classList.add('active');
        }
    }

    // No método initSidebarUserProfile()
    initSidebarUserProfile() {
        const userDropdown = document.getElementById('sidebarUserDropdown');
        const userMenu = document.getElementById('sidebarUserMenu');
        const userInfo = document.getElementById('sidebarUserInfo');

        if (userInfo && userMenu) {
            // Tornar toda a área do usuário clicável
            userInfo.addEventListener('click', (e) => {
                // Não disparar se o clique foi no dropdown
                if (!e.target.closest('.dropdown')) {
                    userMenu.classList.toggle('show');
                }
            });

            // Alternar menu dropdown pelo botão também
            if (userDropdown) {
                userDropdown.addEventListener('click', (e) => {
                    e.stopPropagation();
                    userMenu.classList.toggle('show');
                });
            }

            // Fechar menu ao clicar fora
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.sidebar-user-section')) {
                    userMenu.classList.remove('show');
                }
            });

            // Prevenir que cliques no menu fechem ele
            userMenu.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // Configurar ações do menu
            const menuItems = userMenu.querySelectorAll('.dropdown-item');
            menuItems.forEach(item => {
                item.addEventListener('click', () => {
                    const action = item.getAttribute('data-action');
                    this.handleUserMenuAction(action);
                    userMenu.classList.remove('show');
                });
            });

            // Carregar informações do usuário
            this.loadUserInfo();
        }
    }

    // Atualize também a função loadUserInfo() para incluir o email
    async loadUserInfo() {
        try {
            if (!window.supabaseClient) {
                console.warn('Supabase client não disponível');
                return;
            }

            const { data: { session } } = await window.supabaseClient.auth.getSession();

            if (session && session.user) {
                const userNameElement = document.getElementById('sidebarUserName');
                const userEmailElement = document.getElementById('sidebarUserEmail');
                const userAvatarElement = document.getElementById('sidebarUserAvatar');

                if (userNameElement) {
                    userNameElement.textContent = session.user.user_metadata?.full_name ||
                        session.user.email.split('@')[0] ||
                        'Usuário';
                }

                if (userEmailElement) {
                    userEmailElement.textContent = session.user.email || '';
                }

                if (userAvatarElement) {
                    // Usar iniciais para o avatar
                    const name = session.user.user_metadata?.full_name || session.user.email;
                    userAvatarElement.textContent = this.getInitials(name);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar informações do usuário:', error);
        }
    }

    // Função para obter iniciais do nome
    getInitials(name) {
        return name.split(' ')
            .map(part => part.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    // Função para lidar com ações do menu do usuário
    handleUserMenuAction(action) {
        switch (action) {
            case 'profile':
                // Use o ProfileModule em vez da função local
                if (window.ProfileModule && window.ProfileModule.showProfileModal) {
                    window.ProfileModule.showProfileModal();
                }
                break;
            case 'settings':
                alert('Configurações - Em desenvolvimento');
                break;
            case 'logout':
                this.logoutUser();
                break;
        }
    }

    // Função para logout
    async logoutUser() {
        try {
            if (!window.supabaseClient) {
                console.warn('Supabase client não disponível');
                return;
            }

            const { error } = await window.supabaseClient.auth.signOut();
            if (error) throw error;

            window.location.href = 'login.html';
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            alert('Erro ao sair. Tente novamente.');
        }
    }
}

// Inicializar o sidebar quando o DOM estiver pronto
function initSidebar() {
    // Aguardar o Supabase estar disponível se necessário
    if (window.supabaseClient) {
        new SidebarManager();
    } else {
        // Se o Supabase não estiver disponível, tentar novamente após um delay
        const checkSupabase = setInterval(() => {
            if (window.supabaseClient) {
                clearInterval(checkSupabase);
                new SidebarManager();
            }
        }, 100);

        // Timeout após 5 segundos
        setTimeout(() => {
            clearInterval(checkSupabase);
            if (!window.supabaseClient) {
                console.warn('Supabase client não carregado após 5 segundos');
                new SidebarManager(); // Inicializar mesmo sem Supabase para funcionalidades básicas
            }
        }, 5000);
    }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebar);
} else {
    initSidebar();
}