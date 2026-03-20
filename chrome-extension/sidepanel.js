const DEFAULT_SETTINGS = {
  apiBase: 'http://localhost:3000',
  email: '',
  limit: 12,
  settingsOpen: false,
};

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
};

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

async function refreshTasks() {
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
      await refreshTasks();
    });
  }

  if (els.refreshBtn) {
    els.refreshBtn.addEventListener('click', refreshTasks);
  }

  if (els.openBoardBtn) {
    els.openBoardBtn.addEventListener('click', () => {
      const settingsNow = getFormSettings();
      chrome.tabs.create({ url: `${settingsNow.apiBase}/quadrodetarefas.html` });
    });
  }

  await refreshTasks();
  setInterval(refreshTasks, 45000);
}

init();
