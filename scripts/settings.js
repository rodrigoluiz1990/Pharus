// scripts/settings.js
const SettingsModule = (() => {
    const projectDisplayNameInput = document.getElementById('projectDisplayNameInput');
    const saveProjectDisplayNameBtn = document.getElementById('saveProjectDisplayNameBtn');
    const resetProjectDisplayNameBtn = document.getElementById('resetProjectDisplayNameBtn');
    const projectDisplayNameStatus = document.getElementById('projectDisplayNameStatus');
    const openExtensionsBtn = document.getElementById('openExtensionsBtn');
    const copyExtensionsUrlBtn = document.getElementById('copyExtensionsUrlBtn');
    const copyFolderHintBtn = document.getElementById('copyFolderHintBtn');
    const extensionFolderPath = document.getElementById('extensionFolderPath');
    const extensionInstallHint = document.getElementById('extensionInstallHint');
    const tableColumnsOrderList = document.getElementById('tableColumnsOrderList');
    const saveTableColumnsOrderBtn = document.getElementById('saveTableColumnsOrderBtn');
    const resetTableColumnsOrderBtn = document.getElementById('resetTableColumnsOrderBtn');
    const tableColumnsOrderStatus = document.getElementById('tableColumnsOrderStatus');
    const tableColumnsWidthGrid = document.getElementById('tableColumnsWidthGrid');
    const saveTableColumnsWidthBtn = document.getElementById('saveTableColumnsWidthBtn');
    const resetTableColumnsWidthBtn = document.getElementById('resetTableColumnsWidthBtn');
    const tableColumnsWidthStatus = document.getElementById('tableColumnsWidthStatus');
    const settingsTabButtons = Array.from(document.querySelectorAll('.settings-tab-btn[data-tab]'));
    const settingsTabPanels = Array.from(document.querySelectorAll('.settings-tab-panel[data-panel]'));
    const settingsCardToggleButtons = Array.from(document.querySelectorAll('.settings-card-toggle[data-card-toggle]'));

    const EXTENSIONS_URL = 'chrome://extensions';
    const TABLE_COLUMNS_ORDER_KEY = 'pharus_table_columns_order';
    const TABLE_COLUMNS_WIDTHS_KEY = 'pharus_table_columns_widths';
    const TABLE_COLUMN_MIN_WIDTH = 50;
    const PROJECT_DISPLAY_NAME_KEY = 'pharus_project_display_name';
    const DEFAULT_PROJECT_DISPLAY_NAME = 'Pharus';
    const SETTINGS_ACTIVE_TAB_KEY = 'pharus_settings_active_tab';
    const SETTINGS_CARDS_STATE_KEY = 'pharus_settings_cards_state';
    const DEFAULT_TABLE_COLUMNS_ORDER = ['pin', 'title', 'assignee', 'request_date', 'due_date', 'status', 'priority', 'client', 'type', 'actions'];
    const ALLOWED_SETTINGS_TABS = new Set(['general', 'permissions', 'users', 'extension', 'table']);
    const DEFAULT_TABLE_COLUMNS_WIDTHS = {
        pin: 56,
        title: 320,
        assignee: 200,
        request_date: 120,
        due_date: 120,
        status: 150,
        priority: 150,
        client: 200,
        type: 150,
        actions: 100,
    };
    const TABLE_COLUMNS_LABELS = {
        pin: 'Pin',
        title: 'Tarefa',
        assignee: 'Responsavel',
        request_date: 'Data Solicitacao',
        due_date: 'Data Entrega',
        status: 'Status',
        priority: 'Prioridade',
        client: 'Cliente',
        type: 'Tipo',
        actions: 'Ações',
    };

    let tableColumnsOrder = [...DEFAULT_TABLE_COLUMNS_ORDER];
    let tableColumnsWidths = { ...DEFAULT_TABLE_COLUMNS_WIDTHS };
    let draggingKey = null;

    const hideStatusHint = (element) => {
        if (!element) return;
        element.textContent = '';
        element.style.display = 'none';
    };

    const normalizeProjectDisplayName = (value) => {
        const cleaned = String(value || '').trim().replace(/\s+/g, ' ');
        if (!cleaned) return DEFAULT_PROJECT_DISPLAY_NAME;
        return cleaned.slice(0, 40);
    };

    const applyProjectDisplayNameInput = () => {
        if (!projectDisplayNameInput) return;
        const savedName = localStorage.getItem(PROJECT_DISPLAY_NAME_KEY);
        projectDisplayNameInput.value = normalizeProjectDisplayName(savedName || DEFAULT_PROJECT_DISPLAY_NAME);
    };

    const showCopiedFeedback = (button, originalHtml) => {
        if (!button) return;
        button.classList.add('btn-copied');
        button.innerHTML = '<i class="fas fa-check"></i> Copiado!';

        setTimeout(() => {
            button.classList.remove('btn-copied');
            button.innerHTML = originalHtml;
        }, 1600);
    };

    const showButtonActionFeedback = (button, originalHtml, type = 'success') => {
        if (!button) return;
        button.classList.remove('btn-copied');

        const success = type !== 'warning';
        button.style.backgroundColor = success ? '#1f9d57' : '#b7791f';
        button.style.borderColor = success ? '#1f9d57' : '#b7791f';
        button.style.color = '#ffffff';
        button.style.transform = 'translateY(-1px)';
        button.style.boxShadow = success
            ? '0 2px 8px rgba(31, 157, 87, 0.3)'
            : '0 2px 8px rgba(183, 121, 31, 0.3)';
        button.innerHTML = success
            ? '<i class="fas fa-check"></i> Salvo'
            : '<i class="fas fa-exclamation-triangle"></i> Atenção';

        setTimeout(() => {
            button.style.backgroundColor = '';
            button.style.borderColor = '';
            button.style.color = '';
            button.style.transform = '';
            button.style.boxShadow = '';
            button.innerHTML = originalHtml;
        }, 1400);
    };

    const notify = (message, type = 'info') => {
        if (typeof UtilsModule !== 'undefined' && typeof UtilsModule.showNotification === 'function') {
            UtilsModule.showNotification(message, type);
            return;
        }
        if (extensionInstallHint) {
            extensionInstallHint.textContent = message;
        }
    };

    const normalizeColumnWidth = (value, fallbackValue) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return fallbackValue;
        return Math.max(TABLE_COLUMN_MIN_WIDTH, Math.min(900, Math.round(parsed)));
    };

    const fallbackCopyText = (value) => {
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = value;
        tempTextArea.setAttribute('readonly', '');
        tempTextArea.style.position = 'fixed';
        tempTextArea.style.opacity = '0';
        tempTextArea.style.pointerEvents = 'none';
        document.body.appendChild(tempTextArea);
        tempTextArea.focus();
        tempTextArea.select();

        let copied = false;
        try {
            copied = document.execCommand('copy');
        } catch (_error) {
            copied = false;
        }

        document.body.removeChild(tempTextArea);
        return copied;
    };

    const copyText = async (value, successMessage) => {
        try {
            await navigator.clipboard.writeText(value);
            notify(successMessage, 'success');
            return true;
        } catch (error) {
            const copiedByFallback = fallbackCopyText(value);
            if (copiedByFallback) {
                notify(successMessage, 'success');
                return true;
            }
            console.error('Falha ao copiar texto:', error);
            notify('Não foi possível copiar automaticamente. Copie manualmente.', 'warning');
            return false;
        }
    };

    const tryOpenExtensionsPage = async () => {
        const popup = window.open(EXTENSIONS_URL, '_blank');

        if (popup) {
            notify('Tentando abrir chrome://extensions...', 'info');
            return;
        }

        const copied = await copyText(EXTENSIONS_URL, 'Link copiado: cole na barra de endereco do Chrome.');
        if (!copied) {
            notify('Abra manualmente: chrome://extensions', 'warning');
        }
    };

    const init = () => {
        initTabs();
        initCardToggles();
        hideStatusHint(projectDisplayNameStatus);
        hideStatusHint(tableColumnsOrderStatus);
        hideStatusHint(tableColumnsWidthStatus);
        applyProjectDisplayNameInput();
        loadTableColumnsOrder();
        loadTableColumnsWidths();
        renderTableColumnsOrderList();
        renderTableColumnsWidthGrid();

        if (saveProjectDisplayNameBtn && projectDisplayNameInput) {
            saveProjectDisplayNameBtn.addEventListener('click', (event) => {
                event.preventDefault();
                const originalHtml = saveProjectDisplayNameBtn.innerHTML;
                const normalizedName = normalizeProjectDisplayName(projectDisplayNameInput.value);
                projectDisplayNameInput.value = normalizedName;
                localStorage.setItem(PROJECT_DISPLAY_NAME_KEY, normalizedName);
                window.dispatchEvent(new CustomEvent('pharus:project-name-updated', {
                    detail: { projectName: normalizedName }
                }));
                notify('Nome do projeto salvo com sucesso.', 'success');
                showButtonActionFeedback(saveProjectDisplayNameBtn, originalHtml, 'success');
            });
        }

        if (resetProjectDisplayNameBtn && projectDisplayNameInput) {
            resetProjectDisplayNameBtn.addEventListener('click', (event) => {
                event.preventDefault();
                const originalHtml = resetProjectDisplayNameBtn.innerHTML;
                projectDisplayNameInput.value = DEFAULT_PROJECT_DISPLAY_NAME;
                localStorage.setItem(PROJECT_DISPLAY_NAME_KEY, DEFAULT_PROJECT_DISPLAY_NAME);
                window.dispatchEvent(new CustomEvent('pharus:project-name-updated', {
                    detail: { projectName: DEFAULT_PROJECT_DISPLAY_NAME }
                }));
                notify('Nome do projeto restaurado para o padrão.', 'success');
                showButtonActionFeedback(resetProjectDisplayNameBtn, originalHtml, 'success');
            });
        }

        if (openExtensionsBtn) {
            openExtensionsBtn.addEventListener('click', (event) => {
                event.preventDefault();
                tryOpenExtensionsPage();
            });
        }

        if (copyExtensionsUrlBtn) {
            copyExtensionsUrlBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                const originalHtml = copyExtensionsUrlBtn.innerHTML;
                const copied = await copyText(EXTENSIONS_URL, 'Link chrome://extensions copiado com sucesso.');
                if (copied) {
                    showCopiedFeedback(copyExtensionsUrlBtn, originalHtml);
                }
            });
        }

        if (copyFolderHintBtn && extensionFolderPath) {
            copyFolderHintBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                const originalHtml = copyFolderHintBtn.innerHTML;
                const copied = await copyText(extensionFolderPath.textContent.trim(), 'Nome da pasta copiado com sucesso.');
                if (copied) {
                    showCopiedFeedback(copyFolderHintBtn, originalHtml);
                }
            });
        }

        if (saveTableColumnsOrderBtn) {
            saveTableColumnsOrderBtn.addEventListener('click', (event) => {
                event.preventDefault();
                const originalHtml = saveTableColumnsOrderBtn.innerHTML;
                localStorage.setItem(TABLE_COLUMNS_ORDER_KEY, JSON.stringify(tableColumnsOrder));
                notify('Ordem das colunas salva com sucesso.', 'success');
                showButtonActionFeedback(saveTableColumnsOrderBtn, originalHtml, 'success');
            });
        }

        if (resetTableColumnsOrderBtn) {
            resetTableColumnsOrderBtn.addEventListener('click', (event) => {
                event.preventDefault();
                const originalHtml = resetTableColumnsOrderBtn.innerHTML;
                tableColumnsOrder = [...DEFAULT_TABLE_COLUMNS_ORDER];
                localStorage.setItem(TABLE_COLUMNS_ORDER_KEY, JSON.stringify(tableColumnsOrder));
                renderTableColumnsOrderList();
                renderTableColumnsWidthGrid();
                notify('Ordem padrão restaurada.', 'success');
                showButtonActionFeedback(resetTableColumnsOrderBtn, originalHtml, 'success');
            });
        }

        if (saveTableColumnsWidthBtn) {
            saveTableColumnsWidthBtn.addEventListener('click', (event) => {
                event.preventDefault();
                const originalHtml = saveTableColumnsWidthBtn.innerHTML;
                localStorage.setItem(TABLE_COLUMNS_WIDTHS_KEY, JSON.stringify(tableColumnsWidths));
                notify('Largura das colunas salva com sucesso.', 'success');
                showButtonActionFeedback(saveTableColumnsWidthBtn, originalHtml, 'success');
            });
        }

        if (resetTableColumnsWidthBtn) {
            resetTableColumnsWidthBtn.addEventListener('click', (event) => {
                event.preventDefault();
                const originalHtml = resetTableColumnsWidthBtn.innerHTML;
                tableColumnsWidths = { ...DEFAULT_TABLE_COLUMNS_WIDTHS };
                localStorage.setItem(TABLE_COLUMNS_WIDTHS_KEY, JSON.stringify(tableColumnsWidths));
                renderTableColumnsWidthGrid();
                notify('Largura padrão das colunas restaurada.', 'success');
                showButtonActionFeedback(resetTableColumnsWidthBtn, originalHtml, 'success');
            });
        }
    };

    const normalizeTab = (tabId) => {
        const cleaned = String(tabId || '').trim();
        return ALLOWED_SETTINGS_TABS.has(cleaned) ? cleaned : 'extension';
    };

    const setActiveTab = (tabId) => {
        const safeTab = normalizeTab(tabId);

        settingsTabButtons.forEach((button) => {
            const isActive = button.dataset.tab === safeTab;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        settingsTabPanels.forEach((panel) => {
            const isActive = panel.dataset.panel === safeTab;
            panel.classList.toggle('active', isActive);
        });

        try {
            localStorage.setItem(SETTINGS_ACTIVE_TAB_KEY, safeTab);
        } catch (_error) {
            // ignore
        }
    };

    const initTabs = () => {
        settingsTabButtons.forEach((button) => {
            button.addEventListener('click', () => {
                setActiveTab(button.dataset.tab || 'extension');
            });
        });

        let urlTab = '';
        try {
            const params = new URLSearchParams(window.location.search || '');
            urlTab = params.get('tab') || '';
        } catch (_error) {
            urlTab = '';
        }

        if (urlTab) {
            setActiveTab(urlTab);
            return;
        }

        let savedTab = 'extension';
        try {
            savedTab = localStorage.getItem(SETTINGS_ACTIVE_TAB_KEY) || 'extension';
        } catch (_error) {
            savedTab = 'extension';
        }
        setActiveTab(savedTab);
    };

    const loadCardsState = () => {
        try {
            const raw = localStorage.getItem(SETTINGS_CARDS_STATE_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_error) {
            return {};
        }
    };

    const saveCardState = (cardId, collapsed) => {
        try {
            const state = loadCardsState();
            state[cardId] = Boolean(collapsed);
            localStorage.setItem(SETTINGS_CARDS_STATE_KEY, JSON.stringify(state));
        } catch (_error) {
            // ignore
        }
    };

    const applyCardCollapsedState = (cardId, collapsed, button) => {
        const body = document.getElementById(cardId);
        if (!body || !button) return;
        body.classList.toggle('collapsed', Boolean(collapsed));
        button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        button.textContent = collapsed ? 'Mostrar' : 'Esconder';
    };

    const initCardToggles = () => {
        const savedState = loadCardsState();

        settingsCardToggleButtons.forEach((button) => {
            const cardId = button.dataset.cardToggle;
            if (!cardId) return;

            applyCardCollapsedState(cardId, Boolean(savedState[cardId]), button);

            button.addEventListener('click', () => {
                const body = document.getElementById(cardId);
                if (!body) return;
                const nextCollapsed = !body.classList.contains('collapsed');
                applyCardCollapsedState(cardId, nextCollapsed, button);
                saveCardState(cardId, nextCollapsed);
            });
        });
    };

    const loadTableColumnsOrder = () => {
        try {
            const raw = localStorage.getItem(TABLE_COLUMNS_ORDER_KEY);
            if (!raw) {
                tableColumnsOrder = [...DEFAULT_TABLE_COLUMNS_ORDER];
                return;
            }

            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                tableColumnsOrder = [...DEFAULT_TABLE_COLUMNS_ORDER];
                return;
            }

            const valid = parsed.filter((key) => DEFAULT_TABLE_COLUMNS_ORDER.includes(key));
            const missing = DEFAULT_TABLE_COLUMNS_ORDER.filter((key) => !valid.includes(key));
            tableColumnsOrder = [...valid, ...missing];
        } catch (_error) {
            tableColumnsOrder = [...DEFAULT_TABLE_COLUMNS_ORDER];
        }
    };

    const renderTableColumnsOrderList = () => {
        if (!tableColumnsOrderList) return;
        tableColumnsOrderList.innerHTML = '';

        tableColumnsOrder.forEach((key, index) => {
            const item = document.createElement('li');
            item.className = 'table-columns-order-item';
            item.draggable = true;
            item.dataset.colKey = key;
            item.innerHTML = `
                <span>${index + 1}. ${TABLE_COLUMNS_LABELS[key] || key}</span>
                <span class="drag-hint"><i class="fas fa-grip-vertical"></i> Arraste</span>
            `;

            item.addEventListener('dragstart', () => {
                draggingKey = key;
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                draggingKey = null;
                item.classList.remove('dragging');
            });

            item.addEventListener('dragover', (event) => {
                event.preventDefault();
            });

            item.addEventListener('drop', (event) => {
                event.preventDefault();
                const targetKey = item.dataset.colKey;
                if (!draggingKey || !targetKey || draggingKey === targetKey) return;

                const fromIndex = tableColumnsOrder.indexOf(draggingKey);
                const toIndex = tableColumnsOrder.indexOf(targetKey);
                if (fromIndex < 0 || toIndex < 0) return;

                const nextOrder = [...tableColumnsOrder];
                const [moved] = nextOrder.splice(fromIndex, 1);
                nextOrder.splice(toIndex, 0, moved);
                tableColumnsOrder = nextOrder;
                renderTableColumnsOrderList();
                renderTableColumnsWidthGrid();
            });

            tableColumnsOrderList.appendChild(item);
        });
    };

    const loadTableColumnsWidths = () => {
        try {
            const raw = localStorage.getItem(TABLE_COLUMNS_WIDTHS_KEY);
            if (!raw) {
                tableColumnsWidths = { ...DEFAULT_TABLE_COLUMNS_WIDTHS };
                return;
            }

            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') {
                tableColumnsWidths = { ...DEFAULT_TABLE_COLUMNS_WIDTHS };
                return;
            }

            const normalized = {};
            DEFAULT_TABLE_COLUMNS_ORDER.forEach((key) => {
                normalized[key] = normalizeColumnWidth(parsed[key], DEFAULT_TABLE_COLUMNS_WIDTHS[key]);
            });
            tableColumnsWidths = normalized;
        } catch (_error) {
            tableColumnsWidths = { ...DEFAULT_TABLE_COLUMNS_WIDTHS };
        }
    };

    const renderTableColumnsWidthGrid = () => {
        if (!tableColumnsWidthGrid) return;
        tableColumnsWidthGrid.innerHTML = '';

        tableColumnsOrder.forEach((key) => {
            const item = document.createElement('div');
            item.className = 'table-column-width-item';

            const label = document.createElement('label');
            label.setAttribute('for', `colWidth_${key}`);
            label.textContent = TABLE_COLUMNS_LABELS[key] || key;

            const input = document.createElement('input');
            input.id = `colWidth_${key}`;
            input.type = 'number';
            input.min = String(TABLE_COLUMN_MIN_WIDTH);
            input.max = '900';
            input.step = '1';
            input.value = String(normalizeColumnWidth(tableColumnsWidths[key], DEFAULT_TABLE_COLUMNS_WIDTHS[key]));

            input.addEventListener('change', () => {
                const normalized = normalizeColumnWidth(input.value, DEFAULT_TABLE_COLUMNS_WIDTHS[key]);
                tableColumnsWidths[key] = normalized;
                input.value = String(normalized);
            });

            item.appendChild(label);
            item.appendChild(input);
            tableColumnsWidthGrid.appendChild(item);
        });
    };

    return { init };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', SettingsModule.init);
} else {
    SettingsModule.init();
}

