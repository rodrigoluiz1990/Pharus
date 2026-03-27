// scripts/utils.js
const UtilsModule = (() => {
  let lastSaveButton = null;
  const SAVE_FEEDBACK_ATTR = 'data-save-feedback-original-html';
  const TAXONOMY_COLORS_KEY = 'pharus_task_taxonomy_colors';
  const TAXONOMY_ICONS_KEY = 'pharus_task_taxonomy_icons';

  const TASK_PRIORITY_DEFINITIONS = [
      { value: 'very_high', label: 'Muito Alta', class: 'muito_alta', icon: 'fas fa-angles-up', defaultColor: '#c62828' },
      { value: 'high', label: 'Alta', class: 'alta', icon: 'fas fa-arrow-up', defaultColor: '#ef5350' },
      { value: 'medium', label: 'Média', class: 'media', icon: 'fas fa-minus', defaultColor: '#f4b400' },
      { value: 'low', label: 'Baixa', class: 'baixa', icon: 'fas fa-arrow-down', defaultColor: '#43a047' },
      { value: 'very_low', label: 'Muito Baixa', class: 'muito_baixa', icon: 'fas fa-angles-down', defaultColor: '#2e7d32' },
  ];

  const TASK_TYPE_DEFINITIONS = [
      { value: 'new', label: 'Novo', class: 'new', icon: 'fas fa-star', defaultColor: '#1e88e5' },
      { value: 'optimization', label: 'Otimização', class: 'optimization', icon: 'fas fa-gauge-high', defaultColor: '#00897b' },
      { value: 'improvement', label: 'Melhoria', class: 'improvement', icon: 'fas fa-wand-magic-sparkles', defaultColor: '#43a047' },
      { value: 'discussion', label: 'Para Discutir', class: 'discussion', icon: 'fas fa-comments', defaultColor: '#8e24aa' },
      { value: 'suggestion', label: 'Sugestão', class: 'suggestion', icon: 'fas fa-lightbulb', defaultColor: '#fb8c00' },
      { value: 'issue', label: 'Problema', class: 'issue', icon: 'fas fa-triangle-exclamation', defaultColor: '#e53935' },
      { value: 'epic', label: 'Épico', class: 'epic', icon: 'fas fa-bolt', defaultColor: '#3949ab' },
  ];

  const PRIORITY_ALIASES = {
      very_high: 'very_high',
      urgent: 'very_high',
      urgente: 'very_high',
      muito_alta: 'very_high',
      high: 'high',
      alta: 'high',
      medium: 'medium',
      media: 'medium',
      normal: 'medium',
      low: 'low',
      baixa: 'low',
      very_low: 'very_low',
      muito_baixa: 'very_low',
  };

  const TYPE_ALIASES = {
      new: 'new',
      novo: 'new',
      task: 'new',
      optimization: 'optimization',
      otimizacao: 'optimization',
      improvement: 'improvement',
      melhoria: 'improvement',
      discussion: 'discussion',
      para_discutir: 'discussion',
      suggestion: 'suggestion',
      sugestao: 'suggestion',
      issue: 'issue',
      problema: 'issue',
      bug: 'issue',
      epic: 'epic',
      epico: 'epic',
  };

  const normalizeHexColor = (value, fallback = '#4f46e5') => {
      const raw = String(value || '').trim();
      const hex3 = /^#([0-9a-fA-F]{3})$/;
      const hex6 = /^#([0-9a-fA-F]{6})$/;
      if (hex6.test(raw)) return raw.toLowerCase();
      const match3 = raw.match(hex3);
      if (match3) {
          const c = match3[1].toLowerCase();
          return `#${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}`;
      }
      return fallback;
  };

  const normalizeKey = (value) => String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');

  const normalizePriorityKey = (value) => PRIORITY_ALIASES[normalizeKey(value)] || 'medium';
  const normalizeTypeKey = (value) => TYPE_ALIASES[normalizeKey(value)] || 'new';

  const hexToRgb = (hex) => {
      const normalized = normalizeHexColor(hex, '#4f46e5');
      const int = Number.parseInt(normalized.slice(1), 16);
      return {
          r: (int >> 16) & 255,
          g: (int >> 8) & 255,
          b: int & 255,
      };
  };

  const getContrastTextColor = (hex) => {
      const { r, g, b } = hexToRgb(hex);
      const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);
      return luminance > 160 ? '#1f2937' : '#ffffff';
  };

  const getTaskTaxonomyColorConfig = () => {
      const defaults = {
          priority: Object.fromEntries(TASK_PRIORITY_DEFINITIONS.map((item) => [item.value, item.defaultColor])),
          type: Object.fromEntries(TASK_TYPE_DEFINITIONS.map((item) => [item.value, item.defaultColor])),
      };

      try {
          const raw = localStorage.getItem(TAXONOMY_COLORS_KEY);
          if (!raw) return defaults;
          const parsed = JSON.parse(raw);
          const safePriority = {};
          const safeType = {};

          TASK_PRIORITY_DEFINITIONS.forEach((item) => {
              safePriority[item.value] = normalizeHexColor(parsed?.priority?.[item.value], item.defaultColor);
          });
          TASK_TYPE_DEFINITIONS.forEach((item) => {
              safeType[item.value] = normalizeHexColor(parsed?.type?.[item.value], item.defaultColor);
          });

          return { priority: safePriority, type: safeType };
      } catch (_error) {
          return defaults;
      }
  };

  const getTaskTaxonomyIconConfig = () => {
      const defaults = {
          priority: Object.fromEntries(TASK_PRIORITY_DEFINITIONS.map((item) => [item.value, item.icon])),
          type: Object.fromEntries(TASK_TYPE_DEFINITIONS.map((item) => [item.value, item.icon])),
      };

      try {
          const raw = localStorage.getItem(TAXONOMY_ICONS_KEY);
          if (!raw) return defaults;
          const parsed = JSON.parse(raw);
          const safePriority = {};
          const safeType = {};

          TASK_PRIORITY_DEFINITIONS.forEach((item) => {
              const iconValue = String(parsed?.priority?.[item.value] || '').trim();
              safePriority[item.value] = iconValue || item.icon;
          });
          TASK_TYPE_DEFINITIONS.forEach((item) => {
              const iconValue = String(parsed?.type?.[item.value] || '').trim();
              safeType[item.value] = iconValue || item.icon;
          });

          return { priority: safePriority, type: safeType };
      } catch (_error) {
          return defaults;
      }
  };

  const applyTaskTaxonomyColors = () => {
      if (typeof document === 'undefined') return;
      const root = document.documentElement;
      if (!root) return;

      const config = getTaskTaxonomyColorConfig();
      TASK_PRIORITY_DEFINITIONS.forEach((item) => {
          root.style.setProperty(`--task-priority-${item.value}-color`, config.priority[item.value] || item.defaultColor);
      });
      TASK_TYPE_DEFINITIONS.forEach((item) => {
          root.style.setProperty(`--task-type-${item.value}-color`, config.type[item.value] || item.defaultColor);
      });
  };

  const saveTaskTaxonomyColorConfig = (config) => {
      const safe = config && typeof config === 'object' ? config : {};
      const normalized = {
          priority: {},
          type: {},
      };

      TASK_PRIORITY_DEFINITIONS.forEach((item) => {
          normalized.priority[item.value] = normalizeHexColor(safe?.priority?.[item.value], item.defaultColor);
      });
      TASK_TYPE_DEFINITIONS.forEach((item) => {
          normalized.type[item.value] = normalizeHexColor(safe?.type?.[item.value], item.defaultColor);
      });

      localStorage.setItem(TAXONOMY_COLORS_KEY, JSON.stringify(normalized));
      applyTaskTaxonomyColors();
      return normalized;
  };

  const saveTaskTaxonomyIconConfig = (config) => {
      const safe = config && typeof config === 'object' ? config : {};
      const normalized = {
          priority: {},
          type: {},
      };

      TASK_PRIORITY_DEFINITIONS.forEach((item) => {
          const iconValue = String(safe?.priority?.[item.value] || '').trim();
          normalized.priority[item.value] = iconValue || item.icon;
      });
      TASK_TYPE_DEFINITIONS.forEach((item) => {
          const iconValue = String(safe?.type?.[item.value] || '').trim();
          normalized.type[item.value] = iconValue || item.icon;
      });

      localStorage.setItem(TAXONOMY_ICONS_KEY, JSON.stringify(normalized));
      return normalized;
  };

  const resetTaskTaxonomyColorConfig = () => {
      localStorage.removeItem(TAXONOMY_COLORS_KEY);
      applyTaskTaxonomyColors();
      return getTaskTaxonomyColorConfig();
  };

  const resetTaskTaxonomyIconConfig = () => {
      localStorage.removeItem(TAXONOMY_ICONS_KEY);
      return getTaskTaxonomyIconConfig();
  };

  const getPriorityDefinitions = () => TASK_PRIORITY_DEFINITIONS.map((item) => ({ ...item }));
  const getTypeDefinitions = () => TASK_TYPE_DEFINITIONS.map((item) => ({ ...item }));

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

      applyTaskTaxonomyColors();
      window.addEventListener('pharus:task-taxonomy-colors-updated', applyTaskTaxonomyColors);
      window.addEventListener('storage', (event) => {
          if (!event) return;
          if (event.key === TAXONOMY_COLORS_KEY) {
              applyTaskTaxonomyColors();
          }
      });
  }

  // Formatar data - Corrigindo problema de fuso horário
  const formatDate = (dateString) => {
      if (!dateString) return '-';
      try {
          if (dateString.includes('T')) {
              const date = new Date(dateString);
              return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR');
          }

          const [year, month, day] = dateString.split('-');
          if (year && month && day) {
              const date = new Date(year, month - 1, day);
              return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR');
          }

          const date = new Date(dateString);
          return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR');
      } catch (e) {
          console.error('Erro ao formatar data:', e, dateString);
          return '-';
      }
  };

  const getStatusText = (status) => {
      const statusMap = {
          pending: { text: 'Pendente', class: 'pending' },
          in_progress: { text: 'Em Andamento', class: 'in_progress' },
          review: { text: 'Em Teste', class: 'review' },
          completed: { text: 'Concluído', class: 'completed' },
          active: { text: 'Ativo', class: 'active' },
          inactive: { text: 'Inativo', class: 'inactive' },
      };
      return statusMap[status] || { text: status, class: 'desconhecido' };
  };

  const buildTagStyle = (colorHex) => {
      const safeColor = normalizeHexColor(colorHex, '#4f46e5');
      const textColor = getContrastTextColor(safeColor);
      return `background-color: ${safeColor}; color: ${textColor}; border-color: ${safeColor};`;
  };

  const getPriorityText = (priority) => {
      const key = normalizePriorityKey(priority);
      const definition = TASK_PRIORITY_DEFINITIONS.find((item) => item.value === key) || TASK_PRIORITY_DEFINITIONS[2];
      const config = getTaskTaxonomyColorConfig();
      const iconConfig = getTaskTaxonomyIconConfig();
      const color = config?.priority?.[definition.value] || definition.defaultColor;
      const icon = iconConfig?.priority?.[definition.value] || definition.icon;

      return {
          key: definition.value,
          text: definition.label,
          class: definition.class,
          icon,
          color,
          style: buildTagStyle(color),
      };
  };

  const getTypeText = (type) => {
      const key = normalizeTypeKey(type);
      const definition = TASK_TYPE_DEFINITIONS.find((item) => item.value === key) || TASK_TYPE_DEFINITIONS[0];
      const config = getTaskTaxonomyColorConfig();
      const iconConfig = getTaskTaxonomyIconConfig();
      const color = config?.type?.[definition.value] || definition.defaultColor;
      const icon = iconConfig?.type?.[definition.value] || definition.icon;

      return {
          key: definition.value,
          text: definition.label,
          class: definition.class,
          icon,
          color,
          style: buildTagStyle(color),
      };
  };

  const getColumnStatus = async (columnId) => {
      try {
          if (typeof StorageModule === 'undefined' || !StorageModule.getColumns) {
              return 'pending';
          }

          const columns = await StorageModule.getColumns();
          const column = (columns || []).find((c) => String(c.id) === String(columnId));

          if (column?.type) return column.type;
          if (column?.status) return column.status;
          return 'pending';
      } catch (error) {
          console.error('Erro ao obter status da coluna:', error);
          return 'pending';
      }
  };

  const generateId = (items) => {
      if (!items || items.length === 0) return 1;
      return Math.max(0, ...items.map((item) => item.id || 0)) + 1;
  };

  const validateEmail = (email) => {
      if (!email) return false;
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
  };

  const showNotification = (message, type = 'info') => {
      const notificationEl = document.getElementById('notification');
      const messageEl = document.getElementById('notificationMessage');

      if (notificationEl && messageEl) {
          notificationEl.classList.remove('notification-info', 'notification-success', 'notification-error', 'notification-warning');
          notificationEl.classList.add(`notification-${type}`);
          messageEl.textContent = message;
          notificationEl.style.display = 'block';

          setTimeout(() => {
              notificationEl.style.display = 'none';
          }, 5000);
      } else {
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

  const showLoading = (message = 'Carregando...') => {
      const loading = document.getElementById('globalLoading');
      if (loading) {
          const span = loading.querySelector('span');
          if (span) span.textContent = message;
          loading.style.display = 'flex';
      }
  };

  const hideLoading = () => {
      const loading = document.getElementById('globalLoading');
      if (loading) {
          loading.style.display = 'none';
      }
  };

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

  const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return '';

          const offset = date.getTimezoneOffset();
          const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
          return adjustedDate.toISOString().split('T')[0];
      } catch (error) {
          console.error('Erro ao formatar data:', error);
          return '';
      }
  };

  const getColumnStatusFromSupabase = async (columnId) => {
      try {
          if (typeof window.dbClient === 'undefined') {
              console.warn('Supabase client não disponível');
              return 'pending';
          }

          const { data: column, error } = await window.dbClient
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

  const escapeHtml = (text) => {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
  };

  const isEmptyObject = (obj) => {
      return !obj || Object.keys(obj).length === 0;
  };

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
      getPriorityDefinitions,
      getTypeDefinitions,
      normalizePriorityKey,
      normalizeTypeKey,
      getTaskTaxonomyColorConfig,
      getTaskTaxonomyIconConfig,
      saveTaskTaxonomyColorConfig,
      saveTaskTaxonomyIconConfig,
      resetTaskTaxonomyColorConfig,
      resetTaskTaxonomyIconConfig,
      applyTaskTaxonomyColors,
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
      showPermissionDeniedModal,
  };
})();



