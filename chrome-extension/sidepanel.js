const DEFAULT_SETTINGS = {
  apiBase: 'http://localhost:3000',
  email: '',
  limit: 12,
  settingsOpen: false,
};
const DETACHED_NOTES_KEY = 'pharus_detached_notes';

const els = {
  apiBaseInput: document.getElementById('apiBaseInput'),
  emailInput: document.getElementById('emailInput'),
  limitInput: document.getElementById('limitInput'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  openBoardBtn: document.getElementById('openBoardBtn'),
  settingsToggleBtn: document.getElementById('settingsToggleBtn'),
  settingsPanel: document.getElementById('settingsPanel'),
  statusText: document.getElementById('statusText'),
  tasksList: document.getElementById('tasksList'),
  modeTasksBtn: document.getElementById('modeTasksBtn'),
  modeDetachedBtn: document.getElementById('modeDetachedBtn'),
  modeChatBtn: document.getElementById('modeChatBtn'),
  focusTasksSection: document.getElementById('focusTasksSection'),
  detachedSection: document.getElementById('detachedSection'),
  detachedStatusText: document.getElementById('detachedStatusText'),
  detachedInput: document.getElementById('detachedInput'),
  addDetachedBtn: document.getElementById('addDetachedBtn'),
  detachedList: document.getElementById('detachedList'),
  chatOverlay: document.getElementById('chatOverlay'),
  chatOverlayFrame: document.getElementById('chatOverlayFrame'),
  chatOverlayCloseBtn: document.getElementById('chatOverlayCloseBtn'),
  chatOverlayOpenTabBtn: document.getElementById('chatOverlayOpenTabBtn'),
};

let currentMode = 'tasks';
let lastNonChatMode = 'tasks';
let detachedNotes = [];

const normalizeBase = (value) => String(value || '').trim().replace(/\/+$/, '');

function setStatus(text) {
  if (els.statusText) els.statusText.textContent = text;
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
  if (priority === 'high') return 'Alta';
  if (priority === 'medium') return 'Media';
  if (priority === 'low') return 'Baixa';
  return String(priority || '-');
}

function formatDueDate(dateValue) {
  if (!dateValue) return 'Sem prazo';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Sem prazo';
  return date.toLocaleDateString('pt-BR');
}

function renderTasks(tasks, settings) {
  if (!els.tasksList) return;
  els.tasksList.innerHTML = '';

  if (!Array.isArray(tasks) || tasks.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Nenhuma tarefa foco encontrada.';
    els.tasksList.appendChild(li);
    return;
  }

  tasks.forEach((task) => {
    const li = document.createElement('li');
    li.className = `task-item ${task.is_pinned ? 'pinned' : ''}`;

    const safeTitle = escapeHtml(task.title || 'Sem titulo');
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

function updateDetachedStatus() {
  if (!els.detachedStatusText) return;
  els.detachedStatusText.textContent = `${detachedNotes.length} post-it(s) avulso(s)`;
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
    li.textContent = 'Nenhum post-it avulso.';
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
      resolve({
        apiBase: normalizeBase(saved.apiBase) || DEFAULT_SETTINGS.apiBase,
        email: String(saved.email || ''),
        limit: Number(saved.limit) || DEFAULT_SETTINGS.limit,
        settingsOpen: Boolean(saved.settingsOpen),
      });
    });
  });
}

function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, () => resolve());
  });
}

function getFormSettings() {
  return {
    apiBase: normalizeBase(els.apiBaseInput?.value) || DEFAULT_SETTINGS.apiBase,
    email: String(els.emailInput?.value || '').trim(),
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
  const modeValue = mode === 'chat' ? 'chat' : (mode === 'detached' ? 'detached' : 'tasks');
  const keepStatus = Boolean(options.keepStatus);
  currentMode = modeValue;

  els.modeTasksBtn?.classList.toggle('active', modeValue === 'tasks');
  els.modeDetachedBtn?.classList.toggle('active', modeValue === 'detached');
  els.modeChatBtn?.classList.toggle('active', modeValue === 'chat');
  els.modeTasksBtn?.setAttribute('aria-selected', modeValue === 'tasks' ? 'true' : 'false');
  els.modeDetachedBtn?.setAttribute('aria-selected', modeValue === 'detached' ? 'true' : 'false');
  els.modeChatBtn?.setAttribute('aria-selected', modeValue === 'chat' ? 'true' : 'false');

  if (els.focusTasksSection) els.focusTasksSection.classList.toggle('hidden', modeValue !== 'tasks');
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
    } else {
      setStatus('Visualizacao de tarefas ativa.');
    }
  }
}

async function fetchFocusTasks(settings) {
  const url = new URL(`${settings.apiBase}/api/tasks/focus`);
  url.searchParams.set('limit', String(settings.limit));
  if (settings.email) {
    url.searchParams.set('email', settings.email);
  }

  const response = await fetch(url.toString());
  const payload = await response.json();

  if (!response.ok || payload.error) {
    throw new Error(payload?.error?.message || `Erro HTTP ${response.status}`);
  }

  return Array.isArray(payload.data) ? payload.data : [];
}

async function refreshTasks(options = {}) {
  const { force = false } = options;
  if (!force && currentMode !== 'tasks') return;

  const settings = getFormSettings();
  setStatus('Atualizando tarefas...');

  try {
    const tasks = await fetchFocusTasks(settings);
    renderTasks(tasks, settings);
    setStatus(`${tasks.length} tarefa(s) foco carregada(s)`);
  } catch (error) {
    renderTasks([], settings);
    setStatus(`Falha ao carregar: ${error.message}`);
  }
}

async function init() {
  const settings = await loadSettings();
  if (els.apiBaseInput) els.apiBaseInput.value = settings.apiBase;
  if (els.emailInput) els.emailInput.value = settings.email;
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
      setStatus('Configuracao salva.');
      await refreshTasks({ force: true });
    });
  }

  if (els.refreshBtn) {
    els.refreshBtn.addEventListener('click', () => refreshTasks({ force: true }));
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
  await refreshTasks({ force: true });
  setInterval(() => {
    refreshTasks();
  }, 45000);
}

init();
