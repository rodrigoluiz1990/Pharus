// Módulo de autenticação
const AuthModule = (() => {
    // Verificar se o usuário está logado
    const checkAuth = () => {
        const currentUser = StorageModule.getCurrentUser();
        if (!currentUser && !window.location.href.includes('login.html')) {
            window.location.href = 'login.html';
            return false;
        }
        return !!currentUser;
    };

    // Fazer login
    const login = (email, password) => {
        const users = StorageModule.getUsers();
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            StorageModule.saveCurrentUser(user);
            return true;
        }
        return false;
    };

    // Fazer logout
    const logout = () => {
        StorageModule.removeCurrentUser();
        window.location.href = 'login.html';
    };

    // Registrar novo usuário
    const register = (userData) => {
        const users = StorageModule.getUsers();
        const newId = Math.max(0, ...users.map(u => u.id)) + 1;
        
        const newUser = {
            id: newId,
            ...userData
        };
        
        users.push(newUser);
        StorageModule.saveUsers(users);
        StorageModule.saveCurrentUser(newUser);
        
        return newUser;
    };

    // Inicializar a autenticação
    const initAuth = () => {
        // Configurar evento de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                if (login(email, password)) {
                    window.location.href = 'quadrodetarefas.html';
                } else {
                    alert('E-mail ou senha incorretos!');
                }
            });
        }
        
        // Configurar evento de logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
        
        // Verificar autenticação em páginas protegidas
        if (!window.location.href.includes('login.html')) {
            if (!checkAuth()) {
                return false;
            }
            
            // Exibir nome do usuário logado
            const currentUser = StorageModule.getCurrentUser();
            const userNameElement = document.getElementById('userName');
            if (userNameElement && currentUser) {
                userNameElement.textContent = currentUser.name;
            }
        }
        
        return true;
    };

    return {
        initAuth,
        login,
        logout,
        register,
        checkAuth
    };
})();

// Inicializar a autenticação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', AuthModule.initAuth);