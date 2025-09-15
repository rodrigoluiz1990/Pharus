// scripts/utils.js
const UtilsModule = (() => {
  // Formatar data - Corrigindo problema de fuso horário
  const formatDate = (dateString) => {
      if (!dateString) return "-";
      try {
          // Se for uma string ISO (com timezone info)
          if (dateString.includes('T')) {
              const date = new Date(dateString);
              return isNaN(date.getTime()) ? "-" : date.toLocaleDateString("pt-BR");
          }
          
          // Dividir a data em partes para evitar problemas de fuso horário
          const [year, month, day] = dateString.split("-");
          if (year && month && day) {
              const date = new Date(year, month - 1, day); // Mês é 0-indexed no JavaScript
              return isNaN(date.getTime()) ? "-" : date.toLocaleDateString("pt-BR");
          }
          
          // Tentar o método original como fallback
          const date = new Date(dateString);
          return isNaN(date.getTime()) ? "-" : date.toLocaleDateString("pt-BR");
      } catch (e) {
          console.error("Erro ao formatar data:", e, dateString);
          return "-";
      }
  };

  // Obter texto do status
  const getStatusText = (status) => {
      const statusMap = {
          pending: { text: "Pendente", class: "pending" },
          in_progress: { text: "Em Andamento", class: "in_progress" },
          review: { text: "Em Teste", class: "review" },
          completed: { text: "Concluído", class: "completed" },
          active: { text: "Ativo", class: "active" },
          inactive: { text: "Inativo", class: "inactive" }
      };
      return statusMap[status] || { text: status, class: "desconhecido" };
  };

  // Obter texto da prioridade
  const getPriorityText = (priority) => {
      const priorityMap = {
          low: { text: "Baixa", class: "baixa" },
          medium: { text: "Média", class: "media" },
          high: { text: "Alta", class: "alta" },
      };
      return priorityMap[priority] || { text: priority, class: "desconhecida" };
  };

  // Obter texto do tipo
  const getTypeText = (type) => {
      const typeMap = {
          task: { text: "Novo", class: "task" },
          bug: { text: "Erro", class: "bug" },
          improvement: { text: "Melhoria", class: "improvement" },
          user: { text: "Usuário", class: "user" },
          manager: { text: "Gerente", class: "manager" },
          admin: { text: "Administrador", class: "admin" }
      };
      return typeMap[type] || { text: type, class: "outro" };
  };

  // Obter status baseado na coluna
  const getColumnStatus = (columnId) => {
      // Verificar se StorageModule está disponível
      if (typeof StorageModule !== 'undefined' && StorageModule.getColumns) {
          const columns = StorageModule.getColumns();
          const column = columns.find((c) => c.id === columnId);

          if (column) {
              switch (column.title) {
                  case "Pendente":
                      return "pending";
                  case "Em Andamento":
                      return "in_progress";
                  case "Em Teste":
                      return "review";
                  case "Concluído":
                      return "completed";
                  default:
                      return "pending";
              }
          }
      }
      return "pending";
  };

  // Gerar ID único
  const generateId = (items) => {
      if (!items || items.length === 0) return 1;
      return Math.max(0, ...items.map((item) => item.id || 0)) + 1;
  };

  // Validar e-mail
  const validateEmail = (email) => {
      if (!email) return false;
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
  };

  // Mostrar notificação
  const showNotification = (message, type = "info") => {
      // Verificar se existe um sistema de notificação na página
      const notificationEl = document.getElementById('notification');
      const messageEl = document.getElementById('notificationMessage');
      
      if (notificationEl && messageEl) {
          // Remover classes anteriores
          notificationEl.classList.remove('notification-info', 'notification-success', 'notification-error', 'notification-warning');
          
          // Adicionar classe apropriada
          notificationEl.classList.add(`notification-${type}`);
          
          // Definir mensagem
          messageEl.textContent = message;
          
          // Mostrar notificação
          notificationEl.style.display = 'block';
          
          // Ocultar após 5 segundos
          setTimeout(() => {
              notificationEl.style.display = 'none';
          }, 5000);
      } else {
          // Fallback para alerta básico
          console.log(`${type.toUpperCase()}: ${message}`);
      }
  };

  // Mostrar loading global
  const showLoading = (message = 'Carregando...') => {
      const loading = document.getElementById('globalLoading');
      if (loading) {
          const span = loading.querySelector('span');
          if (span) span.textContent = message;
          loading.style.display = 'flex';
      }
  };

  // Esconder loading global
  const hideLoading = () => {
      const loading = document.getElementById('globalLoading');
      if (loading) {
          loading.style.display = 'none';
      }
  };

  // Tratamento de erros de API
  const handleApiError = (error, context = 'operação') => {
      console.error(`Erro em ${context}:`, error);

      let message = 'Erro inesperado';
      if (error.message) {
          message = error.message;
      } else if (error.code) {
          message = `Erro ${error.code}: ${error.message}`;
      }

      showNotification(`Erro ao ${context}: ${message}`, 'error');
      return false;
  };

  // Formatar data para input type="date"
  const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return '';

          // Ajustar para o fuso horário local
          const offset = date.getTimezoneOffset();
          const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
          return adjustedDate.toISOString().split('T')[0];
      } catch (error) {
          console.error('Erro ao formatar data:', error);
          return '';
      }
  };

  // Obter status da coluna do Supabase
  const getColumnStatusFromSupabase = async (columnId) => {
      try {
          // Verificar se supabaseClient está disponível
          if (typeof window.supabaseClient === 'undefined') {
              console.warn('Supabase client não disponível');
              return 'pending';
          }
          
          const { data: column, error } = await window.supabaseClient
              .from('columns')
              .select('type')
              .eq('id', columnId)
              .single();

          if (error) {
              console.error('Erro ao buscar status da coluna:', error);
              return 'pending';
          }
          
          return column?.type || 'pending';
      } catch (error) {
          console.error('Erro ao buscar status da coluna:', error);
          return 'pending';
      }
  };

  // Escapar HTML para prevenir XSS
  const escapeHtml = (text) => {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
  };

  // Verificar se um objeto está vazio
  const isEmptyObject = (obj) => {
      return !obj || Object.keys(obj).length === 0;
  };

  // Debounce function para melhorar performance
  const debounce = (func, wait) => {
      let timeout;
      return function executedFunction(...args) {
          const later = () => {
              clearTimeout(timeout);
              func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
      };
  };

  return {
      formatDate,
      getStatusText,
      getPriorityText,
      getTypeText,
      getColumnStatus,
      generateId,
      validateEmail,
      showNotification,
      showLoading,
      hideLoading,
      handleApiError,
      formatDateForInput,
      getColumnStatusFromSupabase,
      escapeHtml,
      isEmptyObject,
      debounce
  };
})();