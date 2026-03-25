// scripts/utils.js
const UtilsModule = (() => {
  let lastSaveButton = null;
  const SAVE_FEEDBACK_ATTR = 'data-save-feedback-original-html';

  const isSaveButtonCandidate = (element) => {
      if (!element || !(element instanceof HTMLElement)) return false;
      const button = element.closest('button, input[type="submit"]');
      if (!button) return false;
      const id = String(button.id || '').toLowerCase();
      const text = String(button.textContent || '').toLowerCase();
      return id.includes('save') || text.includes('salvar');
  };

  const resolveButtonCandidate = (element) => {
      if (!element || !(element instanceof HTMLElement)) return null;
      return element.closest('button, input[type="submit"]');
  };

  const applySaveSuccessFeedback = (button) => {
      if (!button || !(button instanceof HTMLElement)) return;
      const originalHtml = button.getAttribute(SAVE_FEEDBACK_ATTR) || button.innerHTML;
      button.setAttribute(SAVE_FEEDBACK_ATTR, originalHtml);
      button.classList.add('save-success-feedback');
      button.innerHTML = 'Salvo';

      setTimeout(() => {
          const fallbackOriginal = button.getAttribute(SAVE_FEEDBACK_ATTR) || originalHtml;
          button.classList.remove('save-success-feedback');
          button.innerHTML = fallbackOriginal;
          button.removeAttribute(SAVE_FEEDBACK_ATTR);
      }, 1500);
  };

  if (typeof document !== 'undefined') {
      document.addEventListener('click', (event) => {
          const target = event && event.target ? event.target : null;
          if (!isSaveButtonCandidate(target)) return;
          const candidate = resolveButtonCandidate(target);
          if (candidate) {
              lastSaveButton = candidate;
          }
      }, true);
  }
  // Formatar data - Corrigindo problema de fuso horÃ¡rio
  const formatDate = (dateString) => {
      if (!dateString) return "-";
      try {
          // Se for uma string ISO (com timezone info)
          if (dateString.includes('T')) {
              const date = new Date(dateString);
              return isNaN(date.getTime()) ? "-" : date.toLocaleDateString("pt-BR");
          }
          
          // Dividir a data em partes para evitar problemas de fuso horÃ¡rio
          const [year, month, day] = dateString.split("-");
          if (year && month && day) {
              const date = new Date(year, month - 1, day); // MÃªs Ã© 0-indexed no JavaScript
              return isNaN(date.getTime()) ? "-" : date.toLocaleDateString("pt-BR");
          }
          
          // Tentar o mÃ©todo original como fallback
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
          completed: { text: "ConcluÃ­do", class: "completed" },
          active: { text: "Ativo", class: "active" },
          inactive: { text: "Inativo", class: "inactive" }
      };
      return statusMap[status] || { text: status, class: "desconhecido" };
  };

  // Obter texto da prioridade
  const getPriorityText = (priority) => {
      const priorityMap = {
          low: { text: "Baixa", class: "baixa" },
          medium: { text: "MÃ©dia", class: "media" },
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
          user: { text: "UsuÃ¡rio", class: "user" },
          manager: { text: "Gerente", class: "manager" },
          admin: { text: "Administrador", class: "admin" }
      };
      return typeMap[type] || { text: type, class: "outro" };
  };

  // Obter status baseado na coluna
  const getColumnStatus = async (columnId) => {
      try {
          if (typeof StorageModule === 'undefined' || !StorageModule.getColumns) {
              return "pending";
          }

          const columns = await StorageModule.getColumns();
          const column = (columns || []).find((c) => String(c.id) === String(columnId));

          if (column?.type) return column.type;
          if (column?.status) return column.status;
          return "pending";
      } catch (error) {
          console.error("Erro ao obter status da coluna:", error);
          return "pending";
      }
  };

  // Gerar ID Ãºnico
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

  // Mostrar notificaÃ§Ã£o
  const showNotification = (message, type = "info") => {
      // Verificar se existe um sistema de notificaÃ§Ã£o na pÃ¡gina
      const notificationEl = document.getElementById('notification');
      const messageEl = document.getElementById('notificationMessage');
      
      if (notificationEl && messageEl) {
          // Remover classes anteriores
          notificationEl.classList.remove('notification-info', 'notification-success', 'notification-error', 'notification-warning');
          
          // Adicionar classe apropriada
          notificationEl.classList.add(`notification-${type}`);
          
          // Definir mensagem
          messageEl.textContent = message;
          
          // Mostrar notificaÃ§Ã£o
          notificationEl.style.display = 'block';
          
          // Ocultar apÃ³s 5 segundos
          setTimeout(() => {
              notificationEl.style.display = 'none';
          }, 5000);
      } else {
          // Fallback para alerta bÃ¡sico
          console.log(`${type.toUpperCase()}: ${message}`);
      }

      if (String(type).toLowerCase() === 'success' && lastSaveButton) {
          applySaveSuccessFeedback(lastSaveButton);
      }
  };

  const showPermissionDeniedModal = (message = 'Você não tem permissão para executar esta ação.') => {
      if (typeof document === 'undefined') return;

      let overlay = document.getElementById('permissionDeniedModal');
      if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'permissionDeniedModal';
          overlay.className = 'modal-overlay';
          overlay.style.display = 'none';
          overlay.style.position = 'fixed';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.right = '0';
          overlay.style.bottom = '0';
          overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.55)';
          overlay.style.alignItems = 'center';
          overlay.style.justifyContent = 'center';
          overlay.style.zIndex = '99999';
          overlay.innerHTML = `
              <div class="modal" style="max-width:480px; width:calc(100% - 32px); background:#fff; border-radius:10px; box-shadow:0 20px 50px rgba(0,0,0,.25);">
                  <div class="modal-header">
                      <h3>Acesso Negado</h3>
                      <button type="button" class="modal-close" data-permission-modal-close>&times;</button>
                  </div>
                  <div class="modal-body">
                      <p id="permissionDeniedModalMessage" style="margin: 8px 0 0; color:#3f5872;"></p>
                      <div class="form-actions">
                          <button type="button" class="btn btn-primary" data-permission-modal-close>Entendi</button>
                      </div>
                  </div>
              </div>
          `;
          document.body.appendChild(overlay);

          overlay.querySelectorAll('[data-permission-modal-close]').forEach((btn) => {
              btn.addEventListener('click', () => {
                  overlay.classList.remove('visible');
                  overlay.style.display = 'none';
              });
          });

          overlay.addEventListener('click', (event) => {
              if (event.target === overlay) {
                  overlay.classList.remove('visible');
                  overlay.style.display = 'none';
              }
          });
      }

      const messageEl = document.getElementById('permissionDeniedModalMessage');
      if (messageEl) {
          messageEl.textContent = String(message || 'Você não tem permissão para executar esta ação.');
      }
      overlay.classList.add('visible');
      overlay.style.display = 'flex';
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
  const handleApiError = (error, context = 'operaÃ§Ã£o') => {
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

          // Ajustar para o fuso horÃ¡rio local
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
          // Verificar se supabaseClient estÃ¡ disponÃ­vel
          if (typeof window.supabaseClient === 'undefined') {
              console.warn('Supabase client nÃ£o disponÃ­vel');
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

  // Verificar se um objeto estÃ¡ vazio
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
      debounce,
      applySaveSuccessFeedback,
      showPermissionDeniedModal
  };
})();



