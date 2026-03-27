// scripts/db-client-config.js
const DB_API_URL = window.location.origin;
const DB_API_KEY = 'local-postgres';

let isAuthChecked = false;

try {
    const clientFactorySource = window.postgres || window.supabase;
    if (!clientFactorySource || typeof clientFactorySource.createClient !== 'function') {
        throw new Error('Factory de cliente local não disponível');
    }

    const { createClient } = clientFactorySource;
    window.dbClient = createClient(DB_API_URL, DB_API_KEY);
    window.postgresClient = window.dbClient;
    // Compatibilidade com módulos legados
    window.supabaseClient = window.dbClient;

    console.log('DB client local inicializado com sucesso');
    initializeAuth();
} catch (error) {
    console.error('Erro ao inicializar DB client local:', error);
}

async function initializeAuth() {
    await checkAuthState();

    window.dbClient.auth.onAuthStateChange((event, session) => {
        console.log('Evento de auth:', event);
        handleAuthChange(session);
    });
}

async function checkAuthState() {
    if (isAuthChecked) return;

    try {
        const { data: { session }, error } = await window.dbClient.auth.getSession();

        if (error) {
            console.error('Erro ao verificar sessão:', error);
            return;
        }

        handleAuthChange(session);
    } catch (error) {
        console.error('Erro inesperado ao verificar auth:', error);
    } finally {
        isAuthChecked = true;
    }
}

function handleAuthChange(session) {
    const isLoginPage = window.location.pathname.includes('login.html');
    const isQuadroPage = window.location.pathname.includes('quadrodetarefas.html');

    if (session) {
        if (isLoginPage) {
            setTimeout(() => {
                window.location.href = 'quadrodetarefas.html';
            }, 100);
        } else if (isQuadroPage) {
            updateUserUI(session.user);
        }
    } else if (!isLoginPage) {
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 100);
    }
}

function updateUserUI(user) {
    const userNameElement = document.getElementById('userName');
    if (userNameElement && user) {
        userNameElement.textContent = user.email || 'Usuário';
    }
}

window.logoutUser = async function () {
    try {
        const { error } = await window.dbClient.auth.signOut();
        if (error) {
            console.error('Erro no logout:', error);
            alert('Erro ao fazer logout');
            return;
        }

        localStorage.removeItem('pharus_local_session');
        console.log('Logout realizado com sucesso');
    } catch (err) {
        console.error('Erro no logout:', err);
        alert('Erro ao fazer logout');
    }
};

window.getCurrentUser = function () {
    return window.dbClient.auth.getUser().then(({ data: { user } }) => user);
};

