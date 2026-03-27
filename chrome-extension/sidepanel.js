const DEFAULT_SETTINGS = {
  apiBase: 'http://localhost:3000',
  email: '',
  onlyAssigned: true,
  taskTypeFilter: 'all',
  taskPriorityFilter: 'all',
  limit: 12,
  settingsOpen: false,
};
const DETACHED_NOTES_KEY = 'pharus_detached_notes';
const PROJECT_DISPLAY_NAME_KEY = 'pharus_project_display_name';
const DEFAULT_PROJECT_DISPLAY_NAME = 'Projeto';
const PARTY_EMOJI = '🥳';

const els = {
  apiBaseInput: document.getElementById('apiBaseInput'),
  emailInput: document.getElementById('emailInput'),
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
  tasksList: document.getElementById('tasksList'),
  modeTasksBtn: document.getElementById('modeTasksBtn'),
  modeAgendaBtn: document.getElementById('modeAgendaBtn'),
  modeNoticesBtn: document.getElementById('modeNoticesBtn'),
  modeDetachedBtn: document.getElementById('modeDetachedBtn'),
  modeChatBtn: document.getElementById('modeChatBtn'),
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

const normalizeBase = (value) => String(value || '').trim().replace(/\/+$/, '');

function setStatus(text) {
  if (els.statusText) els.statusText.textContent = text;
}

function setNoticesStatus(text) {
  if (els.noticesStatusText) els.noticesStatusText.textContent = text;
}

function setAgendaStatus(text) {
  if (els.agendaStatusText) els.agendaStatusText.textContent = text;
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
  const safe = String(priority || '').toLowerCase();
  if (safe === 'high' || safe === 'alta') return 'Alta';
  if (safe === 'medium' || safe === 'media') return 'Média';
  if (safe === 'low' || safe === 'baixa') return 'Baixa';
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
    li.textContent = `${PARTY_EMOJI} Nenhuma tarefa foco encontrada.`;
    els.tasksList.appendChild(li);
    return;
  }

  tasks.forEach((task) => {
    const li = document.createElement('li');
    li.className = `task-item ${task.is_pinned ? 'pinned' : ''}`;

    const id = Number(task?.id);
    const refLabel = Number.isFinite(id) && id > 0 ? `#${id} ` : '';
    const safeTitle = `${escapeHtml(refLabel)}${escapeHtml(task.title || 'Sem título')}`;
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
  const safe = String(priority || '').toLowerCase();
  if (safe === 'high' || safe === 'alta') return 'Alta';
  if (safe === 'medium' || safe === 'media') return 'Média';
  if (safe === 'low' || safe === 'baixa') return 'Baixa';
  return String(priority || '-');
}

function renderNotices(notices) {
  if (!els.noticesList) return;
  els.noticesList.innerHTML = '';

  const safeNotices = Array.isArray(notices) ? notices.filter(isNoticeVisible) : [];
  if (safeNotices.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Nenhum aviso ativo.';
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
    li.textContent = `${PARTY_EMOJI} Nenhum evento para hoje.`;
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
    li.innerHTML = `
      <div class="detached-meta">
        <div class="task-title">${escapeHtml(note.title)}</div>
        <div class="detached-actions">
          <button type="button" data-action="toggle" title="${note.done ? 'Desmarcar' : 'Concluir'}">${note.done ? 'O' : 'V'}</button>
          <button type="button" data-action="edit" title="Editar">E</button>
          <button type="button" data-action="delete" title="Excluir">X</button>
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
      const rawType = String(saved.taskTypeFilter || 'all').toLowerCase();
      const rawPriority = String(saved.taskPriorityFilter || 'all').toLowerCase();
      resolve({
        apiBase: normalizeBase(saved.apiBase) || DEFAULT_SETTINGS.apiBase,
        email: String(saved.email || ''),
        onlyAssigned: Boolean(saved.onlyAssigned),
        taskTypeFilter: ['all', 'task', 'bug', 'improvement'].includes(rawType) ? rawType : 'all',
        taskPriorityFilter: ['all', 'high', 'medium', 'low'].includes(rawPriority) ? rawPriority : 'all',
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
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, () => resolve());
  });
}

function getFormSettings() {
  const rawType = String(els.taskTypeFilterInput?.value || 'all').toLowerCase();
  const rawPriority = String(els.taskPriorityFilterInput?.value || 'all').toLowerCase();
  return {
    apiBase: normalizeBase(els.apiBaseInput?.value) || DEFAULT_SETTINGS.apiBase,
    email: String(els.emailInput?.value || '').trim(),
    onlyAssigned: Boolean(els.onlyAssignedInput?.checked),
    taskTypeFilter: ['all', 'task', 'bug', 'improvement'].includes(rawType) ? rawType : 'all',
    taskPriorityFilter: ['all', 'high', 'medium', 'low'].includes(rawPriority) ? rawPriority : 'all',
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
  els.modeChatBtn?.classList.toggle('active', modeValue === 'chat');
  els.modeTasksBtn?.setAttribute('aria-selected', modeValue === 'tasks' ? 'true' : 'false');
  els.modeAgendaBtn?.setAttribute('aria-selected', modeValue === 'agenda' ? 'true' : 'false');
  els.modeNoticesBtn?.setAttribute('aria-selected', modeValue === 'notices' ? 'true' : 'false');
  els.modeDetachedBtn?.setAttribute('aria-selected', modeValue === 'detached' ? 'true' : 'false');
  els.modeChatBtn?.setAttribute('aria-selected', modeValue === 'chat' ? 'true' : 'false');

  if (els.focusTasksSection) els.focusTasksSection.classList.toggle('hidden', modeValue !== 'tasks');
  if (els.agendaSection) els.agendaSection.classList.toggle('hidden', modeValue !== 'agenda');
  if (els.noticesSection) els.noticesSection.classList.toggle('hidden', modeValue !== 'notices');
  if (els.detachedSection) els.detachedSection.classList.toggle('hidden', modeValue !== 'detached');

  if (modeValue === 'chat') {
    openChatOverlay();
    if (!keepStatus) setStatus('Chat aberto no painel.');
    return;
  }

  lastNonChatMode = modeValue;
  closeChatOverlay();

  if (!keepStatus) {
    if (modeValue === 'detached') {
      updateDetachedStatus();
    } else if (modeValue === 'agenda') {
      setAgendaStatus('Visualizacao da agenda do dia ativa.');
    } else if (modeValue === 'notices') {
      setNoticesStatus('Visualização de avisos ativa.');
    } else {
      setStatus('Visualização de tarefas ativa.');
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
  const payload = await response.json();

  if (!response.ok || payload.error) {
    throw new Error(payload?.error?.message || `Erro HTTP ${response.status}`);
  }

  return Array.isArray(payload.data) ? payload.data : [];
}

function applyTaskFilters(tasks, settings) {
  const typeFilter = String(settings?.taskTypeFilter || 'all').toLowerCase();
  const priorityFilter = String(settings?.taskPriorityFilter || 'all').toLowerCase();

  return (Array.isArray(tasks) ? tasks : []).filter((task) => {
    const taskType = String(task?.type || '').toLowerCase();
    const taskPriority = String(task?.priority || '').toLowerCase();

    const typeMatches = typeFilter === 'all' || taskType === typeFilter;
    const priorityMatches = priorityFilter === 'all' || taskPriority === priorityFilter;

    return typeMatches && priorityMatches;
  });
}

async function refreshTasks(options = {}) {
  const { force = false } = options;
  if (!force && currentMode !== 'tasks') return;

  const settings = getFormSettings();
  setStatus('Atualizando tarefas...');

  try {
    const tasks = await fetchFocusTasks(settings);
    const filteredTasks = applyTaskFilters(tasks, settings);
    renderTasks(filteredTasks, settings);
    setStatus(`${filteredTasks.length} tarefa(s) foco carregada(s)`);
  } catch (error) {
    renderTasks([], settings);
    setStatus(`Falha ao carregar: ${error.message}`);
  }
}

async function fetchNotices(settings) {
  const response = await fetch(`${settings.apiBase}/api/db/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'notice_board_posts',
      action: 'select',
      select: 'id,title,content,priority,status,visible_until,permission_group_id,created_at',
      order: { column: 'created_at', ascending: false },
    }),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(payload?.error?.message || `Erro HTTP ${response.status}`);
  }
  return Array.isArray(payload.data) ? payload.data : [];
}

async function fetchUserPermissionGroupId(settings) {
  const email = String(settings?.email || '').trim().toLowerCase();
  if (!email) return '';

  const response = await fetch(`${settings.apiBase}/api/db/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'app_users',
      action: 'select',
      select: 'id,email,permission_group_id',
      filters: [{ column: 'email', op: 'eq', value: email }],
    }),
  });

  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(payload?.error?.message || `Erro HTTP ${response.status}`);
  }

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
  setNoticesStatus('Atualizando avisos...');

  try {
    const [notices, userPermissionGroupId] = await Promise.all([
      fetchNotices(settings),
      fetchUserPermissionGroupId(settings).catch(() => ''),
    ]);
    const scopedNotices = filterNoticesByUserGroup(notices, userPermissionGroupId);
    const activeCount = scopedNotices.filter(isNoticeVisible).length;
    renderNotices(scopedNotices);
    setNoticesStatus(`${activeCount} aviso(s) ativo(s) carregado(s)`);
  } catch (error) {
    renderNotices([]);
    setNoticesStatus(`Falha ao carregar: ${error.message}`);
  }
}

async function fetchAgendaEvents(settings) {
  const response = await fetch(`${settings.apiBase}/api/db/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'agenda_events',
      action: 'select',
      select: 'id,title,event_type,status,start_at,end_at,is_all_day,created_at,updated_at',
      order: { column: 'start_at', ascending: true },
      limit: 250,
    }),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(payload?.error?.message || `Erro HTTP ${response.status}`);
  }
  return Array.isArray(payload.data) ? payload.data : [];
}

async function refreshAgenda(options = {}) {
  const { force = false } = options;
  if (!force && currentMode !== 'agenda') return;

  const settings = getFormSettings();
  setAgendaStatus('Atualizando agenda do dia...');

  try {
    const events = await fetchAgendaEvents(settings);
    const todayCount = events.filter((item) => isSameDay(item?.start_at, new Date())).length;
    renderAgenda(events, settings);
    setAgendaStatus(`${todayCount} item(ns) para hoje`);
  } catch (error) {
    renderAgenda([], settings);
    setAgendaStatus(`Falha ao carregar: ${error.message}`);
  }
}

function refreshCurrentMode(options = {}) {
  if (currentMode === 'agenda') return refreshAgenda(options);
  if (currentMode === 'notices') return refreshNotices(options);
  return refreshTasks(options);
}

async function init() {
  await applyProjectTitle();
  const settings = await loadSettings();
  if (els.apiBaseInput) els.apiBaseInput.value = settings.apiBase;
  if (els.emailInput) els.emailInput.value = settings.email;
  if (els.onlyAssignedInput) els.onlyAssignedInput.checked = Boolean(settings.onlyAssigned);
  if (els.taskTypeFilterInput) els.taskTypeFilterInput.value = settings.taskTypeFilter || 'all';
  if (els.taskPriorityFilterInput) els.taskPriorityFilterInput.value = settings.taskPriorityFilter || 'all';
  if (els.limitInput) els.limitInput.value = String(settings.limit);
  setSettingsVisibility(Boolean(settings.settingsOpen));

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
      setStatus('Configuração salva.');
      await refreshCurrentMode({ force: true });
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

  if (els.modeChatBtn) {
    els.modeChatBtn.addEventListener('click', () => {
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
  await refreshCurrentMode({ force: true });
  setInterval(() => {
    refreshCurrentMode();
  }, 45000);
}

init();


