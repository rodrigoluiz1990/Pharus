// scripts/sidebar.js
let sidebarInitialized = false;
class SidebarManager {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.sidebarElement = document.querySelector('#sidebar-container .sidebar, .sidebar');
        this.bodyElement = document.body;
        this.collapseStorageKey = 'pharus_sidebar_collapsed';
        this.projectTitleStorageKey = 'pharus_project_display_name';
        this.defaultProjectTitle = 'Pharus';
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
        this.setupCollapseToggle();
        this.setupViewToggle();
        this.initSidebarUserProfile();
        this.applyProjectDisplayName();
        this.applyPageHeaderProjectName();
        this.applyBrowserTabTitle();
        this.setupProjectNameListeners();
        this.setupChatMenuItem(); // MOVER para depois do setupNavigation

        console.log('Sidebar inicializado com sucesso');
    }

    setupCollapseToggle() {
        const collapseBtn = document.getElementById('sidebarCollapseBtn');
        if (!collapseBtn || !this.sidebarElement) return;

        const savedCollapsed = localStorage.getItem(this.collapseStorageKey) === 'true';
        this.applySidebarCollapsedState(savedCollapsed);

        collapseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const isCollapsed = this.sidebarElement.classList.contains('sidebar-collapsed');
            this.applySidebarCollapsedState(!isCollapsed);
        });
    }

    applySidebarCollapsedState(collapsed) {
        if (!this.sidebarElement) return;

        this.sidebarElement.classList.toggle('sidebar-collapsed', collapsed);
        if (this.bodyElement) {
            this.bodyElement.classList.toggle('sidebar-collapsed', collapsed);
        }

        localStorage.setItem(this.collapseStorageKey, String(collapsed));
        this.updateCollapseButtonIcon(collapsed);
    }

    updateCollapseButtonIcon(collapsed) {
        const collapseBtn = document.getElementById('sidebarCollapseBtn');
        if (!collapseBtn) return;

        const icon = collapseBtn.querySelector('i');
        if (icon) {
            icon.className = collapsed ? 'fas fa-angle-double-right' : 'fas fa-angle-double-left';
        }

        collapseBtn.setAttribute(
            'aria-label',
            collapsed ? 'Expandir menu' : 'Recolher menu'
        );
    }

    setupChatMenuItem() {
        const chatMenuItem = document.getElementById('chatMenuItem');
        if (chatMenuItem) {
            // Remover qualquer event listener existente para evitar duplicação
            chatMenuItem.replaceWith(chatMenuItem.cloneNode(true));
            const newChatMenuItem = document.getElementById('chatMenuItem');
            
            newChatMenuItem.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Clicou no menu de chat');
                if (typeof ChatModule !== 'undefined' && ChatModule.toggleChat) {
                    ChatModule.toggleChat();
                } else {
                    console.log('Módulo de chat não disponível, carregando...');
                    // Carregar o módulo de chat se necessário
                    this.loadChatModule();
                }
            });
        }
    }

    loadChatModule() {
        // Verificar se o script já está carregado
        if (typeof ChatModule === 'undefined') {
            // Carregar dinamicamente o script do chat
            const script = document.createElement('script');
            script.src = 'scripts/chat.js';
            script.onload = () => {
                console.log('Módulo de chat carregado com sucesso');
                if (typeof ChatModule.initChatModule === 'function') {
                    ChatModule.initChatModule();
                    // Abrir o chat após carregar
                    setTimeout(() => {
                        if (typeof ChatModule.toggleChat === 'function') {
                            ChatModule.toggleChat();
                        }
                    }, 100);
                }
            };
            script.onerror = () => {
                console.error('Falha ao carregar o módulo de chat');
                alert('Não foi possível carregar o sistema de chat. Recarregue a página e tente novamente.');
            };
            document.head.appendChild(script);

            // Carregar os estilos do chat
            if (!document.querySelector('link[href="styles/chat.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'styles/chat.css';
                document.head.appendChild(link);
            }
        } else if (typeof ChatModule.toggleChat === 'function') {
            // Se já estiver carregado, apenas abrir o chat
            ChatModule.toggleChat();
        }
    }

    normalizeProjectDisplayName(value) {
        const cleaned = String(value || '').trim().replace(/\s+/g, ' ');
        if (!cleaned) return this.defaultProjectTitle;
        return cleaned.slice(0, 40);
    }

    applyProjectDisplayName(projectName) {
        const titleElement = document.getElementById('sidebarProjectTitle');
        if (!titleElement) return;

        const resolvedName = typeof projectName === 'string'
            ? projectName
            : localStorage.getItem(this.projectTitleStorageKey);
        titleElement.textContent = this.normalizeProjectDisplayName(resolvedName);
    }

    applyPageHeaderProjectName(projectName) {
        const headerTitleElement = document.querySelector('.project-title h2');
        if (!headerTitleElement) return;

        const resolvedName = this.normalizeProjectDisplayName(
            typeof projectName === 'string'
                ? projectName
                : localStorage.getItem(this.projectTitleStorageKey)
        );

        if (!headerTitleElement.dataset.baseTitle) {
            headerTitleElement.dataset.baseTitle = String(headerTitleElement.textContent || '').trim();
        }

        const baseTitle = String(headerTitleElement.dataset.baseTitle || '').trim();
        if (!baseTitle || baseTitle.toLowerCase() === 'pharus') {
            headerTitleElement.textContent = resolvedName;
            return;
        }

        headerTitleElement.textContent = `${resolvedName} - ${baseTitle}`;
    }

    applyBrowserTabTitle(projectName) {
        const resolvedName = this.normalizeProjectDisplayName(
            typeof projectName === 'string'
                ? projectName
                : localStorage.getItem(this.projectTitleStorageKey)
        );
        document.title = `Pharus - ${resolvedName}`;
    }

    setupProjectNameListeners() {
        window.addEventListener('pharus:project-name-updated', (event) => {
            const projectName = event?.detail?.projectName;
            this.applyProjectDisplayName(projectName);
            this.applyPageHeaderProjectName(projectName);
            this.applyBrowserTabTitle(projectName);
        });

        window.addEventListener('storage', (event) => {
            if (event.key !== this.projectTitleStorageKey) return;
            this.applyProjectDisplayName(event.newValue);
            this.applyPageHeaderProjectName(event.newValue);
            this.applyBrowserTabTitle(event.newValue);
        });
    }

    // Configurar navegação do menu
    setupNavigation() {
        const menuItems = document.querySelectorAll('.menu-item');

        menuItems.forEach(item => {
            const targetPage = item.getAttribute('data-page');

            // Destacar item do menu atual (apenas para itens com data-page)
            if (targetPage && targetPage === this.currentPage) {
                item.classList.add('active');
                console.log('Destacando menu:', targetPage);
            }

            // Adicionar evento de clique para navegação (apenas para itens com data-page)
            if (targetPage) {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const clickedPage = item.getAttribute('data-page');
                    console.log('Clicou no menu:', clickedPage);

                    if (clickedPage && clickedPage !== this.currentPage) {
                        console.log('Navegando para:', clickedPage);
                        window.location.href = clickedPage;
                    }
                });
            }
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
        const titleOnlyViewBtn = document.getElementById('titleOnlyViewBtn');

        if (boardViewBtn && sociousViewBtn) {
            boardViewBtn.addEventListener('click', () => this.switchView('board'));
            sociousViewBtn.addEventListener('click', () => this.switchView('socious'));
            if (titleOnlyViewBtn) {
                titleOnlyViewBtn.addEventListener('click', () => this.switchView('title_only'));
            }
        }
    }

    // Alternar entre visualizações
    switchView(viewType) {
        const boardView = document.getElementById('taskBoard');
        const sociousView = document.getElementById('sociousView');
        const boardViewBtn = document.getElementById('boardViewBtn');
        const sociousViewBtn = document.getElementById('sociousViewBtn');
        const titleOnlyViewBtn = document.getElementById('titleOnlyViewBtn');

        if (viewType === 'board') {
            if (boardView) boardView.style.display = 'flex';
            if (sociousView) sociousView.style.display = 'none';
            if (boardViewBtn) boardViewBtn.classList.add('active');
            if (sociousViewBtn) sociousViewBtn.classList.remove('active');
            if (titleOnlyViewBtn) titleOnlyViewBtn.classList.remove('active');
        } else if (viewType === 'socious') {
            if (boardView) boardView.style.display = 'none';
            if (sociousView) sociousView.style.display = 'block';
            if (boardViewBtn) boardViewBtn.classList.remove('active');
            if (sociousViewBtn) sociousViewBtn.classList.add('active');
            if (titleOnlyViewBtn) titleOnlyViewBtn.classList.remove('active');
        } else if (viewType === 'title_only') {
            if (boardView) boardView.style.display = 'none';
            if (sociousView) sociousView.style.display = 'block';
            if (boardViewBtn) boardViewBtn.classList.remove('active');
            if (sociousViewBtn) sociousViewBtn.classList.remove('active');
            if (titleOnlyViewBtn) titleOnlyViewBtn.classList.add('active');
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
                    const metadata = session.user.user_metadata || {};
                    const name = metadata.full_name || session.user.email;
                    const avatarColor = /^#[0-9a-fA-F]{6}$/.test(String(metadata.avatar_color || '').trim())
                        ? String(metadata.avatar_color).trim()
                        : '#3498db';
                    const allowedIcons = new Set(['user', 'user-tie', 'headset', 'code', 'wrench', 'briefcase', 'star', 'bolt']);
                    const avatarIcon = allowedIcons.has(String(metadata.avatar_icon || '').trim())
                        ? String(metadata.avatar_icon).trim()
                        : '';

                    userAvatarElement.style.background = avatarColor;
                    if (avatarIcon) {
                        userAvatarElement.innerHTML = `<i class="fas fa-${avatarIcon}"></i>`;
                    } else {
                        userAvatarElement.textContent = this.getInitials(name);
                    }
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
    const sidebarExists = !!document.querySelector('#sidebar-container .sidebar, .sidebar');
    if (!sidebarExists || sidebarInitialized) {
        return;
    }

    const startSidebar = () => {
        if (sidebarInitialized) return;
        sidebarInitialized = true;
        new SidebarManager();
    };

    // Aguardar o Supabase estar disponivel se necessario
    if (window.supabaseClient) {
        startSidebar();
    } else {
        const checkSupabase = setInterval(() => {
            if (window.supabaseClient) {
                clearInterval(checkSupabase);
                startSidebar();
            }
        }, 100);

        setTimeout(() => {
            clearInterval(checkSupabase);
            if (!window.supabaseClient) {
                console.warn('Supabase client nao carregado apos 5 segundos');
                startSidebar();
            }
        }, 5000);
    }
}

window.initSidebar = initSidebar;

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebar);
} else {
    initSidebar();
}

