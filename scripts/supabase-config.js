// scripts/supabase-config.js
const SUPABASE_URL = 'https://bnrnmuhwmnaxbpvoeguk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJucm5tdWh3bW5heGJwdm9lZ3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MzYwNzEsImV4cCI6MjA3MTMxMjA3MX0.-LOwx3rBdEBExYoeH8Z2Thazpz0ZyOrRHurJBRQu8QE';

// Variável para controlar redirecionamentos
let isAuthChecked = false;

// Inicializar o cliente Supabase
try {
    const { createClient } = supabase;
    window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client inicializado com sucesso');
    
    // Verificar autenticação após inicializar
    initializeAuth();
} catch (error) {
    console.error('Erro ao inicializar Supabase client:', error);
}

async function initializeAuth() {
    // Verificar estado de autenticação
    await checkAuthState();
    
    // Ouvir mudanças de autenticação
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('Evento de auth:', event);
        handleAuthChange(session);
    });
}

async function checkAuthState() {
    if (isAuthChecked) return;
    
    try {
        const { data: { session }, error } = await window.supabaseClient.auth.getSession();
        
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
        // Usuário está logado
        if (isLoginPage) {
            // Se está na página de login, redireciona para o quadro
            setTimeout(() => {
                window.location.href = 'quadrodetarefas.html';
            }, 100);
        } else if (isQuadroPage) {
            // Se já está no quadro, atualiza a UI
            updateUserUI(session.user);
        }
    } else {
        // Usuário não está logado
        if (!isLoginPage) {
            // Se não está na página de login, redireciona
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 100);
        }
    }
}

function updateUserUI(user) {
    const userNameElement = document.getElementById("userName");
    if (userNameElement && user) {
        userNameElement.textContent = user.email || 'Usuário';
    }
}

// Função de logout global
window.logoutUser = async function() {
    try {
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) {
            console.error('Erro no logout:', error);
            alert('Erro ao fazer logout');
            return;
        }
        
        localStorage.removeItem("supabaseSession");
        console.log("Logout realizado com sucesso");
        
    } catch (err) {
        console.error('Erro no logout:', err);
        alert('Erro ao fazer logout');
    }
}

// Função para obter usuário atual
window.getCurrentUser = function() {
    return window.supabaseClient.auth.getUser().then(({ data: { user } }) => {
        return user;
    });
}