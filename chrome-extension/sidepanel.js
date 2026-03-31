const DEFAULT_SETTINGS = {
  onlyAssigned: true,
  taskTypeFilter: 'all',
  taskPriorityFilter: 'all',
  limit: 12,
  settingsOpen: false,
};
const DETACHED_NOTES_KEY = 'pharus_detached_notes';
const PROJECT_DISPLAY_NAME_KEY = 'pharus_project_display_name';
const DEFAULT_PROJECT_DISPLAY_NAME = 'Projeto';
const DEFAULT_AUTH_STATE = {
  apiBase: 'http://localhost:3000',
  email: '',
  userId: null,
  authenticated: false,
};
const AUTH_STATE_KEY = 'pharus_extension_auth';
const PARTY_EMOJI = '🥳';
const INVALID_EXTENSION_EMAIL_MESSAGE = 'Configure a extensão para continuar.';
const LOAD_FAILURE_MESSAGE = 'Não foi possível carregar agora. Verifique a API e tente novamente.';
const CHAT_BADGE_POLL_MS = 12000;
const TASK_TYPE_FILTER_VALUES = ['all', 'new', 'optimization', 'improvement', 'discussion', 'suggestion', 'issue', 'epic'];
const TASK_PRIORITY_FILTER_VALUES = ['all', 'very_high', 'high', 'medium', 'low', 'very_low'];

const TASK_TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'new', label: 'Novo' },
  { value: 'optimization', label: 'Otimização' },
  { value: 'improvement', label: 'Melhoria' },
  { value: 'discussion', label: 'Para discutir' },
  { value: 'suggestion', label: 'Sugestão' },
  { value: 'issue', label: 'Problema' },
  { value: 'epic', label: 'Épico' },
];

const TASK_PRIORITY_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'very_high', label: 'Muito alta' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
  { value: 'very_low', label: 'Muito baixa' },
];

const TASK_TYPE_ALIASES = {
  all: 'all',
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
  bug: 'issue',
  problema: 'issue',
  epic: 'epic',
  epico: 'epic',
};

const TASK_PRIORITY_ALIASES = {
  all: 'all',
  very_high: 'very_high',
  muito_alta: 'very_high',
  urgent: 'very_high',
  urgente: 'very_high',
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

const els = {
  authPanel: document.getElementById('authPanel'),
  loginApiBaseInput: document.getElementById('loginApiBaseInput'),
  loginEmailInput: document.getElementById('loginEmailInput'),
  loginPasswordInput: document.getElementById('loginPasswordInput'),
  loginBtn: document.getElementById('loginBtn'),
  authStatusText: document.getElementById('authStatusText'),
  logoutBtn: document.getElementById('logoutBtn'),
  onlyAssignedInput: document.getElementById('onlyAssignedInput'),
  taskTypeFilterInput: document.getElementById('taskTypeFilterInput'),
  taskPriorityFilterInput: document.getElementById('taskPriorityFilterInput'),
  limitInput: document.getElementById('limitInput'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  openBoardBtn: document.getElementById('openBoardBtn'),
  settingsToggleBtn: document.getElementById('settingsToggleBtn'),
  settingsPanel: document.getElementById('settingsPanel'),
  statusText: document.getElementById('statusText'),
  modeSwitch: document.getElementById('modeSwitch'),
  tasksList: document.getElementById('tasksList'),
  modeTasksBtn: document.getElementById('modeTasksBtn'),
  modeAgendaBtn: document.getElementById('modeAgendaBtn'),
  modeNoticesBtn: document.getElementById('modeNoticesBtn'),
  modeDetachedBtn: document.getElementById('modeDetachedBtn'),
  openChatBtn: document.getElementById('openChatBtn'),
  chatNotificationBadge: document.getElementById('chatNotificationBadge'),
  focusTasksSection: document.getElementById('focusTasksSection'),
  agendaSection: document.getElementById('agendaSection'),
  agendaStatusText: document.getElementById('agendaStatusText'),
  agendaList: document.getElementById('agendaList'),
  noticesSection: document.getElementById('noticesSection'),
  noticesStatusText: document.getElementById('noticesStatusText'),
  noticesList: document.getElementById('noticesList'),
  detachedSection: document.getElementById('detachedSection'),
  detachedStatusText: document.getElementById('detachedStatusText'),
  detachedInput: document.getElementById('detachedInput'),
  addDetachedBtn: document.getElementById('addDetachedBtn'),
  detachedList: document.getElementById('detachedList'),
  chatOverlay: document.getElementById('chatOverlay'),
  chatOverlayFrame: document.getElementById('chatOverlayFrame'),
  chatOverlayCloseBtn: document.getElementById('chatOverlayCloseBtn'),
  chatOverlayOpenTabBtn: document.getElementById('chatOverlayOpenTabBtn'),
  projectHeaderTitle: document.getElementById('projectHeaderTitle'),
};

let currentMode = 'tasks';
let lastNonChatMode = 'tasks';
let detachedNotes = [];
let emailValidationCacheKey = '';
let emailValidationCache = null;
let authState = { ...DEFAULT_AUTH_STATE };
let chatBadgeInterval = null;

const normalizeBase = (value) => String(value || '').trim().replace(/\/+$/, '');
const normalizeKey = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, '_');

const normalizeTaskType = (value) => TASK_TYPE_ALIASES[normalizeKey(value)] || 'all';
const normalizeTaskPriority = (value) => TASK_PRIORITY_ALIASES[normalizeKey(value)] || 'all';

function setStatus(text) {
  if (els.statusText) els.statusText.textContent = text;
}

function setNoticesStatus(text) {
  if (els.noticesStatusText) els.noticesStatusText.textContent = text;
}

function setAgendaStatus(text) {
  if (els.agendaStatusText) els.agendaStatusText.textContent = text;
}

function setAuthStatus(text, type = 'info') {
  if (!els.authStatusText) return;
  const safeText = String(text || '').trim();
  els.authStatusText.textContent = safeText;
  els.authStatusText.classList.toggle('hidden', !safeText);
  els.authStatusText.style.color = type === 'error' ? '#a83333' : (type === 'success' ? '#23653a' : '#51657a');
}

function setElementVisible(element, visible) {
  if (!element) return;
  element.classList.toggle('hidden', !visible);
}

function setChatBadge(count) {
  const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Math.floor(Number(count))) : 0;
  if (els.chatNotificationBadge) {
    if (safeCount > 0) {
      els.chatNotificationBadge.textContent = safeCount > 99 ? '99+' : String(safeCount);
      els.chatNotificationBadge.classList.remove('hidden');
    } else {
      els.chatNotificationBadge.textContent = '0';
      els.chatNotificationBadge.classList.add('hidden');
    }
  }

  if (!chrome?.action || typeof chrome.action.setBadgeText !== 'function') return;
  const text = safeCount > 0 ? (safeCount > 99 ? '99+' : String(safeCount)) : '';
  chrome.action.setBadgeText({ text }, () => {});
  if (safeCount > 0 && typeof chrome.action.setBadgeBackgroundColor === 'function') {
    chrome.action.setBadgeBackgroundColor({ color: '#e53935' }, () => {});
  }
}

function normalizeAuthState(raw) {
  const safe = raw && typeof raw === 'object' ? raw : {};
  return {
    apiBase: normalizeBase(safe.apiBase) || DEFAULT_AUTH_STATE.apiBase,
    email: String(safe.email || '').trim().toLowerCase(),
    userId: safe.userId == null ? null : String(safe.userId),
    authenticated: Boolean(safe.authenticated),
  };
}

function loadAuthState() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [AUTH_STATE_KEY]: DEFAULT_AUTH_STATE }, (saved) => {
      const loaded = normalizeAuthState(saved?.[AUTH_STATE_KEY]);
      authState = loaded;
      resolve(loaded);
    });
  });
}

function saveAuthState(nextState) {
  const normalized = normalizeAuthState(nextState);
  authState = normalized;
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [AUTH_STATE_KEY]: normalized }, () => resolve(normalized));
  });
}

function getAuthContext() {
  return {
    apiBase: normalizeBase(authState?.apiBase) || DEFAULT_AUTH_STATE.apiBase,
    email: String(authState?.email || '').trim().toLowerCase(),
    userId: authState?.userId == null ? null : String(authState.userId),
    authenticated: Boolean(authState?.authenticated),
  };
}

function applyAuthUI() {
  const isAuthenticated = Boolean(getAuthContext().authenticated);
  setElementVisible(els.authPanel, !isAuthenticated);
  setElementVisible(els.logoutBtn, isAuthenticated);
  setElementVisible(els.modeSwitch, isAuthenticated);
  setElementVisible(els.settingsToggleBtn, isAuthenticated);
  setElementVisible(els.refreshBtn, isAuthenticated);
  setElementVisible(els.openChatBtn, isAuthenticated);
  setElementVisible(els.modeTasksBtn, isAuthenticated);
  setElementVisible(els.modeAgendaBtn, isAuthenticated);
  setElementVisible(els.modeNoticesBtn, isAuthenticated);
  setElementVisible(els.modeDetachedBtn, isAuthenticated);
  if (!isAuthenticated) {
    setElementVisible(els.settingsPanel, false);
  }
}

function applySaveButtonFeedback(button) {
  if (!button) return;
  const original = button.innerHTML;
  button.classList.add('btn-saved');
  button.innerHTML = 'Salvo';
  setTimeout(() => {
    button.classList.remove('btn-saved');
    button.innerHTML = original;
  }, 1200);
}

function isExtensionAuthenticated() {
  return Boolean(getAuthContext().authenticated);
}

function getLoginFormData() {
  return {
    apiBase: normalizeBase(els.loginApiBaseInput?.value) || DEFAULT_AUTH_STATE.apiBase,
    email: String(els.loginEmailInput?.value || '').trim().toLowerCase(),
    password: String(els.loginPasswordInput?.value || ''),
  };
}

async function loginExtension() {
  const { apiBase, email, password } = getLoginFormData();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!apiBase) {
    setAuthStatus('Informe o servidor.', 'error');
    return false;
  }
  if (!email || !emailRegex.test(email)) {
    setAuthStatus('Informe um e-mail válido.', 'error');
    return false;
  }
  if (!password) {
    setAuthStatus('Informe a senha.', 'error');
    return false;
  }

  if (els.loginBtn) {
    els.loginBtn.disabled = true;
    els.loginBtn.innerHTML = 'Entrando...';
  }

  try {
    const response = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const payload = await parseApiJsonResponse(response);
    const resolvedUser = payload?.data?.user || payload?.data?.session?.user || null;
    const resolvedUserId = resolvedUser?.id != null ? String(resolvedUser.id) : null;

    await saveAuthState({
      apiBase,
      email,
      userId: resolvedUserId,
      authenticated: true,
    });

    emailValidationCacheKey = '';
    emailValidationCache = null;
    if (els.loginPasswordInput) els.loginPasswordInput.value = '';
    setAuthStatus('');
    applyAuthUI();
    await refreshCurrentMode({ force: true });
    return true;
  } catch (_error) {
    await saveAuthState({
      apiBase,
      email,
      userId: null,
      authenticated: false,
    });
    applyAuthUI();
    setAuthStatus('Falha no login. Verifique servidor, e-mail e senha.', 'error');
    return false;
  } finally {
    if (els.loginBtn) {
      els.loginBtn.disabled = false;
      els.loginBtn.innerHTML = 'Entrar';
    }
  }
}

async function logoutExtension() {
  await saveAuthState({
    apiBase: getAuthContext().apiBase || DEFAULT_AUTH_STATE.apiBase,
    email: '',
    userId: null,
    authenticated: false,
  });
  emailValidationCacheKey = '';
  emailValidationCache = null;
  if (els.loginEmailInput) els.loginEmailInput.value = '';
  if (els.loginPasswordInput) els.loginPasswordInput.value = '';
  if (els.loginApiBaseInput) els.loginApiBaseInput.value = getAuthContext().apiBase || DEFAULT_AUTH_STATE.apiBase;
  if (els.tasksList) els.tasksList.innerHTML = '';
  if (els.agendaList) els.agendaList.innerHTML = '';
  if (els.noticesList) els.noticesList.innerHTML = '';
  setChatBadge(0);
  setAuthStatus('Faça login para carregar tarefas, agenda e avisos.', 'info');
  applyAuthUI();
}

async function fetchUnreadChatCount(settings) {
  const authUserIdRaw = settings?.authUserId;
  const authUserId = authUserIdRaw == null ? '' : String(authUserIdRaw).trim();
  if (!/^[0-9]+$/.test(authUserId)) return 0;

  const response = await fetch(`${settings.apiBase}/api/db/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildDbQueryPayload(settings, {
      table: 'chat_messages',
      action: 'select',
      select: 'id',
      filters: [
        { column: 'receiver_id', op: 'eq', value: Number(authUserId) },
        { column: 'is_read', op: 'eq', value: false },
      ],
      limit: 500,
    })),
  });
  const payload = await parseApiJsonResponse(response);
  return Array.isArray(payload.data) ? payload.data.length : 0;
}

async function refreshChatBadge(options = {}) {
  const { silent = true } = options;
  const settings = getFormSettings();
  if (!settings.authenticated) {
    setChatBadge(0);
    return;
  }

  try {
    const unreadCount = await fetchUnreadChatCount(settings);
    setChatBadge(unreadCount);
  } catch (_error) {
    if (!silent) {
      setChatBadge(0);
    }
  }
}

function startChatBadgePolling() {
  if (chatBadgeInterval) {
    clearInterval(chatBadgeInterval);
    chatBadgeInterval = null;
  }
  chatBadgeInterval = setInterval(() => {
    if (!isExtensionAuthenticated()) {
      setChatBadge(0);
      return;
    }
    refreshChatBadge();
  }, CHAT_BADGE_POLL_MS);
}

function renderInvalidEmailMessage(listElement) {
  if (!listElement) return;
  listElement.innerHTML = '';
  const li = document.createElement('li');
  li.className = 'empty';
  li.innerHTML = `
    <div style="text-align:left; line-height:1.45;">
      <strong>${escapeHtml(INVALID_EXTENSION_EMAIL_MESSAGE)}</strong>
      <ol style="margin:8px 0 0 18px; padding:0;">
        <li>Clique em <strong>⚙ Configurações</strong>.</li>
        <li>Preencha o <strong>Servidor</strong> (ex: <code>http://localhost:3000</code>).</li>
        <li>Informe um <strong>E-mail do usuário</strong> válido no Pharus.</li>
        <li>Clique em <strong>Salvar</strong> e depois em <strong>↻ Atualizar</strong>.</li>
      </ol>
    </div>
  `;
  listElement.appendChild(li);
}

function renderLoadErrorMessage(listElement, message) {
  if (!listElement) return;
  listElement.innerHTML = '';
  const li = document.createElement('li');
  li.className = 'empty';
  li.textContent = String(message || LOAD_FAILURE_MESSAGE);
  listElement.appendChild(li);
}

async function parseApiJsonResponse(response) {
  const rawText = await response.text();
  let payload = null;
  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch (_error) {
    throw new Error(LOAD_FAILURE_MESSAGE);
  }

  if (!response.ok || payload?.error) {
    const message = String(payload?.error?.message || '').trim();
    throw new Error(message || LOAD_FAILURE_MESSAGE);
  }

  return payload;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPriorityLabel(priority) {
  const safe = normalizeTaskPriority(priority);
  if (safe === 'very_high') return 'Muito alta';
  if (safe === 'high') return 'Alta';
  if (safe === 'medium') return 'Média';
  if (safe === 'low') return 'Baixa';
  if (safe === 'very_low') return 'Muito baixa';
  return String(priority || '-');
}

function formatDueDate(dateValue) {
  if (!dateValue) return 'Sem prazo';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Sem prazo';
  return date.toLocaleDateString('pt-BR');
}

function parseDateSafe(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(dateA, dateB) {
  const a = parseDateSafe(dateA);
  const b = parseDateSafe(dateB);
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getAgendaTypeLabel(type) {
  return String(type || '').toLowerCase() === 'task' ? 'Tarefa' : 'Evento';
}

function getAgendaStatusLabel(status) {
  const safe = String(status || '').toLowerCase();
  if (safe === 'done') return 'Concluido';
  if (safe === 'cancelled') return 'Cancelado';
  return 'Pendente';
}

function formatAgendaTime(eventItem) {
  if (!eventItem) return '-';
  if (Boolean(eventItem.is_all_day)) return 'Dia inteiro';
  const start = parseDateSafe(eventItem.start_at);
  if (!start) return '-';
  return start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function renderTasks(tasks, settings) {
  if (!els.tasksList) return;
  els.tasksList.innerHTML = '';

  if (!Array.isArray(tasks) || tasks.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = `${PARTY_EMOJI} Queria ter essa vida boa sem tarefas!`;
    els.tasksList.appendChild(li);
    return;
  }

  tasks.forEach((task) => {
    const li = document.createElement('li');
    li.className = `task-item ${task.is_pinned ? 'pinned' : ''}`;

    const safeTitle = escapeHtml(task.title || 'Sem título');
    const dueLabel = formatDueDate(task.due_date);
    const priority = String(task.priority || 'medium');

    li.innerHTML = `
      <div class="task-title">${safeTitle}</div>
      <div class="task-meta">
        <span class="badge priority-${priority}">${getPriorityLabel(priority)}</span>
        <span>${dueLabel}</span>
        ${task.client ? `<span>${escapeHtml(task.client)}</span>` : ''}
      </div>
    `;

    li.addEventListener('click', () => {
      const url = `${settings.apiBase}/quadrodetarefas.html?taskId=${encodeURIComponent(task.id)}`;
      chrome.tabs.create({ url });
    });

    els.tasksList.appendChild(li);
  });
}

function isNoticeVisible(notice) {
  const status = String(notice?.status || '').toLowerCase();
  if (status && status !== 'active') return false;
  const visibleUntil = notice?.visible_until;
  if (!visibleUntil) return true;
  const endDate = new Date(visibleUntil);
  if (Number.isNaN(endDate.getTime())) return true;
  return endDate.getTime() >= Date.now();
}

function getNoticePriorityLabel(priority) {
  const safe = normalizeTaskPriority(priority);
  if (safe === 'very_high') return 'Muito alta';
  if (safe === 'high') return 'Alta';
  if (safe === 'medium') return 'Média';
  if (safe === 'low') return 'Baixa';
  if (safe === 'very_low') return 'Muito baixa';
  return String(priority || '-');
}

function renderFilterOptions() {
  if (els.taskTypeFilterInput) {
    els.taskTypeFilterInput.innerHTML = TASK_TYPE_FILTER_OPTIONS
      .map((option) => `<option value="${option.value}">${option.label}</option>`)
      .join('');
  }

  if (els.taskPriorityFilterInput) {
    els.taskPriorityFilterInput.innerHTML = TASK_PRIORITY_FILTER_OPTIONS
      .map((option) => `<option value="${option.value}">${option.label}</option>`)
      .join('');
  }
}

function renderNotices(notices) {
  if (!els.noticesList) return;
  els.noticesList.innerHTML = '';

  const safeNotices = Array.isArray(notices) ? notices.filter(isNoticeVisible) : [];
  if (safeNotices.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = '🥳 sem perturbações por aqui.';
    els.noticesList.appendChild(li);
    return;
  }

  safeNotices.forEach((notice) => {
    const li = document.createElement('li');
    li.className = 'task-item';
    const priority = String(notice.priority || 'medium');
    const title = escapeHtml(notice.title || 'Aviso');
    const content = escapeHtml(notice.content || '');
    const validUntil = formatDueDate(notice.visible_until);

    li.innerHTML = `
      <div class="task-title">${title}</div>
      ${content ? `<div class="notice-content">${content}</div>` : ''}
      <div class="task-meta">
        <span class="badge priority-${priority}">${getNoticePriorityLabel(priority)}</span>
        <span>${validUntil === 'Sem prazo' ? 'Sem prazo' : `Ate ${validUntil}`}</span>
      </div>
    `;

    li.addEventListener('click', () => {
      const settingsNow = getFormSettings();
      chrome.tabs.create({ url: `${settingsNow.apiBase}/avisos.html` });
    });

    els.noticesList.appendChild(li);
  });
}

function renderAgenda(events, settings) {
  if (!els.agendaList) return;
  els.agendaList.innerHTML = '';

  const today = new Date();
  const safeEvents = (Array.isArray(events) ? events : [])
    .filter((item) => isSameDay(item?.start_at, today))
    .sort((a, b) => {
      const aDate = parseDateSafe(a?.start_at);
      const bDate = parseDateSafe(b?.start_at);
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate.getTime() - bDate.getTime();
    });

  if (safeEvents.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = `${PARTY_EMOJI} Nem um showzinho agendado hoje?`;
    els.agendaList.appendChild(li);
    return;
  }

  safeEvents.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'task-item';
    const title = escapeHtml(item?.title || 'Sem titulo');
    const timeLabel = formatAgendaTime(item);
    const typeLabel = getAgendaTypeLabel(item?.event_type);
    const statusLabel = getAgendaStatusLabel(item?.status);

    li.innerHTML = `
      <div class="task-title">${title}</div>
      <div class="task-meta">
        <span>${escapeHtml(timeLabel)}</span>
        <span class="badge badge-type">${escapeHtml(typeLabel)}</span>
        <span class="badge badge-status">${escapeHtml(statusLabel)}</span>
      </div>
    `;

    li.addEventListener('click', () => {
      chrome.tabs.create({ url: `${settings.apiBase}/agenda.html` });
    });

    els.agendaList.appendChild(li);
  });
}

function updateDetachedStatus() {
  if (!els.detachedStatusText) return;
  els.detachedStatusText.textContent = detachedNotes.length
    ? `${detachedNotes.length} tarefa(s) avulsa(s)`
    : `${PARTY_EMOJI} Nenhuma tarefa avulsa.`;
}

function saveDetachedNotes() {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [DETACHED_NOTES_KEY]: detachedNotes }, () => resolve());
  });
}

function loadDetachedNotes() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [DETACHED_NOTES_KEY]: [] }, (saved) => {
      const notes = Array.isArray(saved[DETACHED_NOTES_KEY]) ? saved[DETACHED_NOTES_KEY] : [];
      detachedNotes = notes
        .map((note) => ({
          id: String(note?.id || ''),
          title: String(note?.title || '').trim(),
          done: Boolean(note?.done),
        }))
        .filter((note) => note.id && note.title);
      resolve(detachedNotes);
    });
  });
}

function renderDetachedNotes() {
  if (!els.detachedList) return;
  els.detachedList.innerHTML = '';

  if (!detachedNotes.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = `${PARTY_EMOJI} Nenhuma tarefa avulsa.`;
    els.detachedList.appendChild(li);
    updateDetachedStatus();
    return;
  }

  detachedNotes.forEach((note) => {
    const li = document.createElement('li');
    li.className = `task-item ${note.done ? 'done' : ''}`;
    const toggleIcon = note.done ? '↩' : '✓';
    const toggleLabel = note.done ? 'Desmarcar' : 'Concluir';
    li.innerHTML = `
      <div class="detached-meta">
        <div class="task-title">${escapeHtml(note.title)}</div>
        <div class="detached-actions">
          <button type="button" data-action="toggle" title="${toggleLabel}" aria-label="${toggleLabel}">${toggleIcon}</button>
          <button type="button" data-action="edit" title="Editar" aria-label="Editar">✎</button>
          <button type="button" data-action="delete" title="Excluir" aria-label="Excluir">🗑</button>
        </div>
      </div>
    `;

    const buttons = li.querySelectorAll('button[data-action]');
    buttons.forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.stopPropagation();
        const action = button.getAttribute('data-action');

        if (action === 'toggle') {
          detachedNotes = detachedNotes.map((item) =>
            item.id === note.id ? { ...item, done: !item.done } : item
          );
          await saveDetachedNotes();
          renderDetachedNotes();
          return;
        }

        if (action === 'edit') {
          const edited = window.prompt('Editar post-it:', note.title);
          const nextTitle = String(edited || '').trim();
          if (!nextTitle) return;
          detachedNotes = detachedNotes.map((item) =>
            item.id === note.id ? { ...item, title: nextTitle } : item
          );
          await saveDetachedNotes();
          renderDetachedNotes();
          return;
        }

        if (action === 'delete') {
          detachedNotes = detachedNotes.filter((item) => item.id !== note.id);
          await saveDetachedNotes();
          renderDetachedNotes();
        }
      });
    });

    els.detachedList.appendChild(li);
  });

  updateDetachedStatus();
}

async function addDetachedNote() {
  const value = String(els.detachedInput?.value || '').trim();
  if (!value) return;

  const note = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: value,
    done: false,
  };

  detachedNotes.unshift(note);
  if (els.detachedInput) els.detachedInput.value = '';
  await saveDetachedNotes();
  renderDetachedNotes();
}

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (saved) => {
      const rawType = normalizeTaskType(saved.taskTypeFilter || 'all');
      const rawPriority = normalizeTaskPriority(saved.taskPriorityFilter || 'all');
      resolve({
        onlyAssigned: Boolean(saved.onlyAssigned),
        taskTypeFilter: TASK_TYPE_FILTER_VALUES.includes(rawType) ? rawType : 'all',
        taskPriorityFilter: TASK_PRIORITY_FILTER_VALUES.includes(rawPriority) ? rawPriority : 'all',
        limit: Number(saved.limit) || DEFAULT_SETTINGS.limit,
        settingsOpen: Boolean(saved.settingsOpen),
      });
    });
  });
}

function normalizeProjectName(value) {
  const text = String(value || '').trim();
  return text || DEFAULT_PROJECT_DISPLAY_NAME;
}

function getProjectNameFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [PROJECT_DISPLAY_NAME_KEY]: DEFAULT_PROJECT_DISPLAY_NAME }, (saved) => {
      resolve(normalizeProjectName(saved?.[PROJECT_DISPLAY_NAME_KEY]));
    });
  });
}

function getProjectNameFromActiveTab() {
  return new Promise((resolve) => {
    if (!chrome.tabs || typeof chrome.tabs.query !== 'function') {
      resolve('');
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const title = String(tabs?.[0]?.title || '').trim();
      const prefix = 'Pharus - ';
      if (title.startsWith(prefix) && title.length > prefix.length) {
        resolve(title.slice(prefix.length).trim());
        return;
      }
      resolve('');
    });
  });
}

async function applyProjectTitle() {
  const [tabProjectName, storedProjectName] = await Promise.all([
    getProjectNameFromActiveTab(),
    getProjectNameFromStorage(),
  ]);
  const projectName = normalizeProjectName(tabProjectName || storedProjectName);
  const fullTitle = `Pharus - ${projectName}`;
  if (els.projectHeaderTitle) {
    els.projectHeaderTitle.textContent = fullTitle;
  }
  document.title = fullTitle;
}

function saveSettings(settings) {
  const safe = settings && typeof settings === 'object' ? settings : {};
  const rawType = normalizeTaskType(safe.taskTypeFilter || 'all');
  const rawPriority = normalizeTaskPriority(safe.taskPriorityFilter || 'all');
  const payload = {
    onlyAssigned: Boolean(safe.onlyAssigned),
    taskTypeFilter: TASK_TYPE_FILTER_VALUES.includes(rawType) ? rawType : 'all',
    taskPriorityFilter: TASK_PRIORITY_FILTER_VALUES.includes(rawPriority) ? rawPriority : 'all',
    limit: Math.max(1, Math.min(Number(safe.limit) || DEFAULT_SETTINGS.limit, 50)),
    settingsOpen: Boolean(safe.settingsOpen),
  };
  return new Promise((resolve) => {
    chrome.storage.sync.set(payload, () => resolve(payload));
  });
}

function getFormSettings() {
  const rawType = normalizeTaskType(els.taskTypeFilterInput?.value || 'all');
  const rawPriority = normalizeTaskPriority(els.taskPriorityFilterInput?.value || 'all');
  const auth = getAuthContext();
  return {
    apiBase: auth.apiBase,
    email: auth.email,
    authUserId: auth.userId,
    authenticated: auth.authenticated,
    onlyAssigned: Boolean(els.onlyAssignedInput?.checked),
    taskTypeFilter: TASK_TYPE_FILTER_VALUES.includes(rawType) ? rawType : 'all',
    taskPriorityFilter: TASK_PRIORITY_FILTER_VALUES.includes(rawPriority) ? rawPriority : 'all',
    limit: Math.max(1, Math.min(Number(els.limitInput?.value) || DEFAULT_SETTINGS.limit, 50)),
    settingsOpen: !(els.settingsPanel?.classList.contains('hidden')),
  };
}

function setSettingsVisibility(visible) {
  if (!els.settingsPanel) return;
  els.settingsPanel.classList.toggle('hidden', !visible);
}

function setChatOverlayVisibility(visible) {
  if (!els.chatOverlay) return;
  els.chatOverlay.classList.toggle('hidden', !visible);
  els.chatOverlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

function buildChatUrl(settings) {
  return `${settings.apiBase}/chatpanel.html?openChat=1`;
}

function openChatOverlay() {
  const settingsNow = getFormSettings();
  const chatUrl = buildChatUrl(settingsNow);
  if (els.chatOverlayFrame && els.chatOverlayFrame.src !== chatUrl) {
    els.chatOverlayFrame.src = chatUrl;
  }
  setChatOverlayVisibility(true);
}

function closeChatOverlay() {
  setChatOverlayVisibility(false);
}

function setMode(mode, options = {}) {
  if (!isExtensionAuthenticated() && mode !== 'detached') {
    currentMode = 'tasks';
    if (els.focusTasksSection) els.focusTasksSection.classList.remove('hidden');
    if (els.agendaSection) els.agendaSection.classList.add('hidden');
    if (els.noticesSection) els.noticesSection.classList.add('hidden');
    if (els.detachedSection) els.detachedSection.classList.add('hidden');
    closeChatOverlay();
    return;
  }

  const modeValue = mode === 'chat'
    ? 'chat'
    : (mode === 'detached'
      ? 'detached'
      : (mode === 'notices'
        ? 'notices'
        : (mode === 'agenda' ? 'agenda' : 'tasks')));
  const keepStatus = Boolean(options.keepStatus);
  currentMode = modeValue;

  els.modeTasksBtn?.classList.toggle('active', modeValue === 'tasks');
  els.modeAgendaBtn?.classList.toggle('active', modeValue === 'agenda');
  els.modeNoticesBtn?.classList.toggle('active', modeValue === 'notices');
  els.modeDetachedBtn?.classList.toggle('active', modeValue === 'detached');
  els.modeTasksBtn?.setAttribute('aria-selected', modeValue === 'tasks' ? 'true' : 'false');
  els.modeAgendaBtn?.setAttribute('aria-selected', modeValue === 'agenda' ? 'true' : 'false');
  els.modeNoticesBtn?.setAttribute('aria-selected', modeValue === 'notices' ? 'true' : 'false');
  els.modeDetachedBtn?.setAttribute('aria-selected', modeValue === 'detached' ? 'true' : 'false');

  if (els.focusTasksSection) els.focusTasksSection.classList.toggle('hidden', modeValue !== 'tasks');
  if (els.agendaSection) els.agendaSection.classList.toggle('hidden', modeValue !== 'agenda');
  if (els.noticesSection) els.noticesSection.classList.toggle('hidden', modeValue !== 'notices');
  if (els.detachedSection) els.detachedSection.classList.toggle('hidden', modeValue !== 'detached');

  if (modeValue === 'chat') {
    openChatOverlay();
    refreshChatBadge();
    if (!keepStatus) setStatus('Chat aberto no painel.');
    return;
  }

  lastNonChatMode = modeValue;
  closeChatOverlay();

  if (!keepStatus) {
    if (modeValue === 'detached') {
      updateDetachedStatus();
    }
  }
}

async function fetchFocusTasks(settings) {
  const url = new URL(`${settings.apiBase}/api/tasks/focus`);
  url.searchParams.set('limit', String(settings.limit));
  if (settings.onlyAssigned && settings.email) {
    url.searchParams.set('email', settings.email);
  }

  const response = await fetch(url.toString());
  const payload = await parseApiJsonResponse(response);

  return Array.isArray(payload.data) ? payload.data : [];
}

async function validateConfiguredEmail(settings) {
  const apiBase = normalizeBase(settings?.apiBase || '');
  const email = String(settings?.email || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    emailValidationCacheKey = `${apiBase}|${email}`;
    emailValidationCache = { valid: false };
    return emailValidationCache;
  }

  const cacheKey = `${apiBase}|${email}`;
  if (emailValidationCacheKey === cacheKey && emailValidationCache) {
    return emailValidationCache;
  }

  try {
    const response = await fetch(`${apiBase}/api/users/validate-email?email=${encodeURIComponent(email)}`);
    const payload = await parseApiJsonResponse(response);

    emailValidationCacheKey = cacheKey;
    emailValidationCache = {
      valid: Boolean(payload?.data?.valid),
    };
    return emailValidationCache;
  } catch (_error) {
    emailValidationCacheKey = cacheKey;
    emailValidationCache = { valid: false };
    return emailValidationCache;
  }
}

function applyTaskFilters(tasks, settings) {
  const typeFilter = normalizeTaskType(settings?.taskTypeFilter || 'all');
  const priorityFilter = normalizeTaskPriority(settings?.taskPriorityFilter || 'all');

  return (Array.isArray(tasks) ? tasks : []).filter((task) => {
    const taskType = normalizeTaskType(task?.type || '');
    const taskPriority = normalizeTaskPriority(task?.priority || '');

    const typeMatches = typeFilter === 'all' || taskType === typeFilter;
    const priorityMatches = priorityFilter === 'all' || taskPriority === priorityFilter;

    return typeMatches && priorityMatches;
  });
}

function buildDbQueryPayload(settings, payload = {}) {
  const safePayload = payload && typeof payload === 'object' ? { ...payload } : {};
  const authEmail = String(settings?.email || '').trim().toLowerCase();
  const authUserIdRaw = settings?.authUserId;
  const authUserId = authUserIdRaw == null ? '' : String(authUserIdRaw).trim();
  if (/^[0-9]+$/.test(authUserId)) {
    safePayload.auth_user_id = Number(authUserId);
  }
  if (authEmail) {
    safePayload.auth_email = authEmail;
  }
  return safePayload;
}

async function refreshTasks(options = {}) {
  const { force = false } = options;
  if (!force && currentMode !== 'tasks') return;

  const settings = getFormSettings();
  if (!settings.authenticated) {
    return;
  }
  setStatus('Atualizando tarefas...');

  try {
    const emailValidation = await validateConfiguredEmail(settings);
    if (!emailValidation.valid) {
      renderInvalidEmailMessage(els.tasksList);
      setStatus('');
      setElementVisible(els.statusText, false);
      return;
    }

    const tasks = await fetchFocusTasks(settings);
    const filteredTasks = applyTaskFilters(tasks, settings);
    renderTasks(filteredTasks, settings);
    setElementVisible(els.statusText, true);
    setStatus(`${filteredTasks.length} tarefa(s) foco carregada(s)`);
  } catch (error) {
    renderLoadErrorMessage(els.tasksList, LOAD_FAILURE_MESSAGE);
    setStatus('');
    setElementVisible(els.statusText, false);
  }
}

async function fetchNotices(settings) {
  const response = await fetch(`${settings.apiBase}/api/db/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildDbQueryPayload(settings, {
      table: 'notice_board_posts',
      action: 'select',
      select: 'id,title,content,priority,status,visible_until,permission_group_id,created_at',
      order: { column: 'created_at', ascending: false },
    })),
  });
  const payload = await parseApiJsonResponse(response);
  return Array.isArray(payload.data) ? payload.data : [];
}

async function fetchUserPermissionGroupId(settings) {
  const email = String(settings?.email || '').trim().toLowerCase();
  if (!email) return '';

  const response = await fetch(`${settings.apiBase}/api/db/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildDbQueryPayload(settings, {
      table: 'app_users',
      action: 'select',
      select: 'id,email,permission_group_id',
      filters: [{ column: 'email', op: 'eq', value: email }],
    })),
  });

  const payload = await parseApiJsonResponse(response);

  const firstUser = Array.isArray(payload.data) ? payload.data[0] : null;
  return String(firstUser?.permission_group_id || '');
}

function filterNoticesByUserGroup(notices, userPermissionGroupId) {
  const groupId = String(userPermissionGroupId || '').trim();
  return (Array.isArray(notices) ? notices : []).filter((notice) => {
    const noticeGroupId = String(notice?.permission_group_id || '').trim();
    if (!noticeGroupId) return true;
    return groupId && noticeGroupId === groupId;
  });
}

async function refreshNotices(options = {}) {
  const { force = false } = options;
  if (!force && currentMode !== 'notices') return;

  const settings = getFormSettings();
  if (!settings.authenticated) {
    return;
  }
  setNoticesStatus('Atualizando avisos...');

  try {
    const emailValidation = await validateConfiguredEmail(settings);
    if (!emailValidation.valid) {
      renderInvalidEmailMessage(els.noticesList);
      setNoticesStatus('');
      setElementVisible(els.noticesStatusText, false);
      return;
    }

    const [notices, userPermissionGroupId] = await Promise.all([
      fetchNotices(settings),
      fetchUserPermissionGroupId(settings).catch(() => ''),
    ]);
    const scopedNotices = filterNoticesByUserGroup(notices, userPermissionGroupId);
    const activeCount = scopedNotices.filter(isNoticeVisible).length;
    renderNotices(scopedNotices);
    setElementVisible(els.noticesStatusText, true);
    setNoticesStatus(`${activeCount} aviso(s) ativo(s) carregado(s)`);
  } catch (error) {
    renderLoadErrorMessage(els.noticesList, LOAD_FAILURE_MESSAGE);
    setNoticesStatus('');
    setElementVisible(els.noticesStatusText, false);
  }
}

async function fetchAgendaEvents(settings) {
  const response = await fetch(`${settings.apiBase}/api/db/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildDbQueryPayload(settings, {
      table: 'agenda_events',
      action: 'select',
      select: 'id,title,event_type,status,start_at,end_at,is_all_day,created_at,updated_at',
      order: { column: 'start_at', ascending: true },
      limit: 250,
    })),
  });
  const payload = await parseApiJsonResponse(response);
  return Array.isArray(payload.data) ? payload.data : [];
}

async function refreshAgenda(options = {}) {
  const { force = false } = options;
  if (!force && currentMode !== 'agenda') return;

  const settings = getFormSettings();
  if (!settings.authenticated) {
    return;
  }
  setAgendaStatus('Atualizando agenda do dia...');

  try {
    const emailValidation = await validateConfiguredEmail(settings);
    if (!emailValidation.valid) {
      renderInvalidEmailMessage(els.agendaList);
      setAgendaStatus('');
      setElementVisible(els.agendaStatusText, false);
      return;
    }

    const events = await fetchAgendaEvents(settings);
    const todayCount = events.filter((item) => isSameDay(item?.start_at, new Date())).length;
    renderAgenda(events, settings);
    setElementVisible(els.agendaStatusText, true);
    setAgendaStatus(`${todayCount} item(ns) para hoje`);
  } catch (error) {
    renderLoadErrorMessage(els.agendaList, LOAD_FAILURE_MESSAGE);
    setAgendaStatus('');
    setElementVisible(els.agendaStatusText, false);
  }
}

function refreshCurrentMode(options = {}) {
  refreshChatBadge();
  if (currentMode === 'agenda') return refreshAgenda(options);
  if (currentMode === 'notices') return refreshNotices(options);
  return refreshTasks(options);
}

async function init() {
  await applyProjectTitle();
  renderFilterOptions();
  const [settings, loadedAuthState] = await Promise.all([loadSettings(), loadAuthState()]);
  if (els.loginApiBaseInput) els.loginApiBaseInput.value = loadedAuthState.apiBase || DEFAULT_AUTH_STATE.apiBase;
  if (els.loginEmailInput) els.loginEmailInput.value = loadedAuthState.email || '';
  if (els.loginPasswordInput) els.loginPasswordInput.value = '';
  if (els.onlyAssignedInput) els.onlyAssignedInput.checked = Boolean(settings.onlyAssigned);
  if (els.taskTypeFilterInput) els.taskTypeFilterInput.value = settings.taskTypeFilter || 'all';
  if (els.taskPriorityFilterInput) els.taskPriorityFilterInput.value = settings.taskPriorityFilter || 'all';
  if (els.limitInput) els.limitInput.value = String(settings.limit);
  setSettingsVisibility(Boolean(settings.settingsOpen));
  applyAuthUI();
  setElementVisible(els.statusText, false);
  setElementVisible(els.noticesStatusText, false);
  setElementVisible(els.agendaStatusText, false);

  await loadDetachedNotes();
  renderDetachedNotes();

  if (els.settingsToggleBtn) {
    els.settingsToggleBtn.addEventListener('click', async () => {
      const isVisible = !(els.settingsPanel?.classList.contains('hidden'));
      setSettingsVisibility(!isVisible);
      const current = getFormSettings();
      await saveSettings(current);
    });
  }

  if (els.saveSettingsBtn) {
    els.saveSettingsBtn.addEventListener('click', async () => {
      const nextSettings = getFormSettings();
      await saveSettings(nextSettings);
      emailValidationCacheKey = '';
      emailValidationCache = null;
      applySaveButtonFeedback(els.saveSettingsBtn);
      await refreshCurrentMode({ force: true });
    });
  }

  if (els.loginBtn) {
    els.loginBtn.addEventListener('click', async () => {
      await loginExtension();
    });
  }

  if (els.loginPasswordInput) {
    els.loginPasswordInput.addEventListener('keydown', async (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      await loginExtension();
    });
  }

  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', async () => {
      await logoutExtension();
    });
  }

  if (els.refreshBtn) {
    els.refreshBtn.addEventListener('click', () => refreshCurrentMode({ force: true }));
  }

  if (els.modeTasksBtn) {
    els.modeTasksBtn.addEventListener('click', () => {
      setMode('tasks', { keepStatus: true });
      refreshTasks({ force: true });
    });
  }

  if (els.modeDetachedBtn) {
    els.modeDetachedBtn.addEventListener('click', () => {
      setMode('detached', { keepStatus: true });
      renderDetachedNotes();
      updateDetachedStatus();
    });
  }

  if (els.modeNoticesBtn) {
    els.modeNoticesBtn.addEventListener('click', () => {
      setMode('notices', { keepStatus: true });
      refreshNotices({ force: true });
    });
  }

  if (els.modeAgendaBtn) {
    els.modeAgendaBtn.addEventListener('click', () => {
      setMode('agenda', { keepStatus: true });
      refreshAgenda({ force: true });
    });
  }

  if (els.openChatBtn) {
    els.openChatBtn.addEventListener('click', () => {
      setMode('chat');
    });
  }

  if (els.chatOverlayCloseBtn) {
    els.chatOverlayCloseBtn.addEventListener('click', () => {
      setMode(lastNonChatMode || 'tasks');
    });
  }

  if (els.chatOverlayOpenTabBtn) {
    els.chatOverlayOpenTabBtn.addEventListener('click', () => {
      const settingsNow = getFormSettings();
      chrome.tabs.create({ url: buildChatUrl(settingsNow) });
    });
  }

  if (els.openBoardBtn) {
    els.openBoardBtn.addEventListener('click', () => {
      const settingsNow = getFormSettings();
      chrome.tabs.create({ url: `${settingsNow.apiBase}/quadrodetarefas.html` });
    });
  }

  if (els.addDetachedBtn) {
    els.addDetachedBtn.addEventListener('click', addDetachedNote);
  }

  if (els.detachedInput) {
    els.detachedInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addDetachedNote();
      }
    });
  }

  setMode('tasks', { keepStatus: true });
  if (isExtensionAuthenticated()) {
    await refreshCurrentMode({ force: true });
  } else {
    setAuthStatus('Faça login para carregar tarefas, agenda e avisos.', 'info');
    setChatBadge(0);
  }
  startChatBadgePolling();
  setInterval(() => {
    if (isExtensionAuthenticated()) {
      refreshCurrentMode();
    }
  }, 45000);
}

init();


