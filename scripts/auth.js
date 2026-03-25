// scripts/auth.js
document.addEventListener("DOMContentLoaded", () => {
  // SÃ³ executa se estiver na pÃ¡gina de login
  if (!window.location.pathname.includes('login.html')) {
      return;
  }

  const loginForm = document.getElementById("loginForm");
  const loginBtn = document.getElementById("loginBtn");

  // Verificar se jÃ¡ estÃ¡ logado (redirecionamento serÃ¡ tratado pelo supabase-config)
  checkIfAlreadyLoggedIn();

  if (loginForm) {
      loginForm.addEventListener("submit", handleLogin);
  }
});

async function checkIfAlreadyLoggedIn() {
  try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (session) {
          // JÃ¡ estÃ¡ logado, mostrar mensagem e redirecionar
          console.log("UsuÃ¡rio jÃ¡ autenticado, redirecionando...");
      }
  } catch (error) {
      console.error("Erro ao verificar sessÃ£o:", error);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  
  const loginBtn = document.getElementById("loginBtn");
  const originalText = loginBtn.innerHTML;
  loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
  loginBtn.disabled = true;

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (!emailInput || !passwordInput) {
      console.error("Campos de login nÃ£o encontrados no DOM.");
      resetLoginButton(loginBtn, originalText);
      return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
      alert("Preencha todos os campos!");
      resetLoginButton(loginBtn, originalText);
      return;
  }

  try {
      if (!window.supabaseClient || !window.supabaseClient.auth) {
          alert("Cliente de autenticacao nao inicializado. Recarregue a pagina.");
          resetLoginButton(loginBtn, originalText);
          return;
      }

      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
          email,
          password,
      });

      if (error) {
          const message = error.message || "E-mail ou senha invalidos!";
          alert("Erro no login: " + message);
          console.error(error.message);
          resetLoginButton(loginBtn, originalText);
          return;
      }

      sessionStorage.setItem('pharus_open_notices_after_login', '1');
      console.log("Login realizado com sucesso, redirecionando...");
      // O redirecionamento serÃ¡ tratado pelo onAuthStateChange no supabase-config
      
  } catch (err) {
      console.error("Erro no login:", err);
      const message = err?.message || "Erro inesperado ao tentar logar.";
      alert("Erro no login: " + message);
      resetLoginButton(loginBtn, originalText);
  }
}

function resetLoginButton(button, originalText) {
  button.innerHTML = originalText;
  button.disabled = false;
}



