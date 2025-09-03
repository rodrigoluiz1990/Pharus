// scripts/auth.js
document.addEventListener("DOMContentLoaded", () => {
  // Só executa se estiver na página de login
  if (!window.location.pathname.includes('login.html')) {
      return;
  }

  const loginForm = document.getElementById("loginForm");
  const registerLink = document.getElementById("registerLink");
  const loginBtn = document.getElementById("loginBtn");

  // Verificar se já está logado (redirecionamento será tratado pelo supabase-config)
  checkIfAlreadyLoggedIn();

  if (loginForm) {
      loginForm.addEventListener("submit", handleLogin);
  }

  if (registerLink) {
      registerLink.addEventListener("click", handleRegister);
  }
});

async function checkIfAlreadyLoggedIn() {
  try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (session) {
          // Já está logado, mostrar mensagem e redirecionar
          console.log("Usuário já autenticado, redirecionando...");
      }
  } catch (error) {
      console.error("Erro ao verificar sessão:", error);
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
      console.error("Campos de login não encontrados no DOM.");
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
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
          email,
          password,
      });

      if (error) {
          alert("E-mail ou senha inválidos!");
          console.error(error.message);
          resetLoginButton(loginBtn, originalText);
          return;
      }

      console.log("Login realizado com sucesso, redirecionando...");
      // O redirecionamento será tratado pelo onAuthStateChange no supabase-config
      
  } catch (err) {
      console.error("Erro no login:", err.message);
      alert("Erro inesperado ao tentar logar.");
      resetLoginButton(loginBtn, originalText);
  }
}

function resetLoginButton(button, originalText) {
  button.innerHTML = originalText;
  button.disabled = false;
}

async function handleRegister(e) {
  e.preventDefault();

  const email = prompt("Digite seu e-mail:");
  if (!email) {
      alert("E-mail é obrigatório!");
      return;
  }

  const password = prompt("Digite sua senha:");
  if (!password) {
      alert("Senha é obrigatória!");
      return;
  }

  if (password.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres!");
      return;
  }

  const confirmPassword = prompt("Confirme sua senha:");
  if (password !== confirmPassword) {
      alert("As senhas não coincidem!");
      return;
  }

  try {
      const { data, error } = await window.supabaseClient.auth.signUp({
          email,
          password,
          options: {
              emailRedirectTo: window.location.origin + '/quadrodetarefas.html'
          }
      });

      if (error) {
          alert("Erro ao registrar: " + error.message);
          console.error(error);
          return;
      }

      alert("Cadastro realizado! Verifique seu e-mail para confirmar a conta.");
      
  } catch (err) {
      console.error("Erro no cadastro:", err.message);
      alert("Erro ao criar conta.");
  }
}