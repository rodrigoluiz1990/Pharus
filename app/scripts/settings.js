// scripts/settings.js
const SettingsModule = (() => {
    const projectDisplayNameInput = document.getElementById('projectDisplayNameInput');
    const projectDisplayNameStatus = document.getElementById('projectDisplayNameStatus');
    const customSidebarMenuNameInput = document.getElementById('customSidebarMenuNameInput');
    const customSidebarMenuUrlInput = document.getElementById('customSidebarMenuUrlInput');
    const customSidebarMenuIconInput = document.getElementById('customSidebarMenuIconInput');
    const customSidebarMenuIconPreview = document.getElementById('customSidebarMenuIconPreview');
    const customSidebarMenuEnabledInput = document.getElementById('customSidebarMenuEnabledInput');
    const resetCustomSidebarMenuBtn = document.getElementById('resetCustomSidebarMenuBtn');
    const customSidebarMenuStatus = document.getElementById('customSidebarMenuStatus');
    const resetTaskTaxonomyColorsBtn = document.getElementById('resetTaskTaxonomyColorsBtn');
    const resetTaskTaxonomyIconsBtn = document.getElementById('resetTaskTaxonomyIconsBtn');
    const saveGeneralSettingsBtn = document.getElementById('saveGeneralSettingsBtn');
    const taxonomyColorInputs = {
        priority: {
            very_high: document.getElementById('priorityColorVeryHigh'),
            high: document.getElementById('priorityColorHigh'),
            medium: document.getElementById('priorityColorMedium'),
            low: document.getElementById('priorityColorLow'),
            very_low: document.getElementById('priorityColorVeryLow'),
        },
        type: {
            new: document.getElementById('typeColorNew'),
            optimization: document.getElementById('typeColorOptimization'),
            improvement: document.getElementById('typeColorImprovement'),
            discussion: document.getElementById('typeColorDiscussion'),
            suggestion: document.getElementById('typeColorSuggestion'),
            issue: document.getElementById('typeColorIssue'),
            epic: document.getElementById('typeColorEpic'),
        }
    };
    const taxonomyIconInputs = {
        priority: {
            very_high: document.getElementById('priorityIconVeryHigh'),
            high: document.getElementById('priorityIconHigh'),
            medium: document.getElementById('priorityIconMedium'),
            low: document.getElementById('priorityIconLow'),
            very_low: document.getElementById('priorityIconVeryLow'),
        },
        type: {
            new: document.getElementById('typeIconNew'),
            optimization: document.getElementById('typeIconOptimization'),
            improvement: document.getElementById('typeIconImprovement'),
            discussion: document.getElementById('typeIconDiscussion'),
            suggestion: document.getElementById('typeIconSuggestion'),
            issue: document.getElementById('typeIconIssue'),
            epic: document.getElementById('typeIconEpic'),
        }
    };
    const taxonomyEditorItems = Array.from(document.querySelectorAll('.taxonomy-editor-item'));
    const openExtensionsBtn = document.getElementById('openExtensionsBtn');
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
    const checkSystemUpdatesBtn = document.getElementById('checkSystemUpdatesBtn');
    const createSystemBackupBtn = document.getElementById('createSystemBackupBtn');
    const runSystemUpdateBtn = document.getElementById('runSystemUpdateBtn');
    const maintenanceCurrentVersionInput = document.getElementById('maintenanceCurrentVersion');
    const maintenanceLatestVersionInput = document.getElementById('maintenanceLatestVersion');
    const maintenanceBackupFormatInput = document.getElementById('maintenanceBackupFormat');
    const maintenanceStatusHint = document.getElementById('maintenanceStatusHint');
    const maintenanceLogBox = document.getElementById('maintenanceLogBox');
    const settingsTabButtons = Array.from(document.querySelectorAll('.settings-tab-btn[data-tab]'));
    const settingsTabPanels = Array.from(document.querySelectorAll('.settings-tab-panel[data-panel]'));
    const settingsCardToggleButtons = Array.from(document.querySelectorAll('.settings-card-toggle[data-card-toggle]'));

    const EXTENSIONS_URL = 'chrome://extensions';
    const TABLE_COLUMNS_ORDER_KEY = 'pharus_table_columns_order';
    const TABLE_COLUMNS_WIDTHS_KEY = 'pharus_table_columns_widths';
    const TASK_TAXONOMY_COLORS_KEY = 'pharus_task_taxonomy_colors';
    const TABLE_COLUMN_MIN_WIDTH = 50;
    const PROJECT_DISPLAY_NAME_KEY = 'pharus_project_display_name';
    const DEFAULT_PROJECT_DISPLAY_NAME = 'Pharus';
    const CUSTOM_SIDEBAR_MENU_KEY = 'pharus_custom_sidebar_menu';
    const DEFAULT_CUSTOM_SIDEBAR_ICON = 'fa-link';
    const SETTINGS_ACTIVE_TAB_KEY = 'pharus_settings_active_tab';
    const SETTINGS_CARDS_STATE_KEY = 'pharus_settings_cards_state';
    const DEFAULT_TABLE_COLUMNS_ORDER = ['pin', 'title', 'assignee', 'request_date', 'due_date', 'status', 'priority', 'client', 'type', 'actions'];
    const ALLOWED_SETTINGS_TABS = new Set(['general', 'permissions', 'users', 'extension', 'table', 'maintenance']);
    const SETTINGS_TAB_PERMISSION_MAP = {
        general: 'project',
        permissions: 'permissions',
        users: 'users',
        extension: 'extension',
        table: 'table',
        maintenance: 'maintenance',
    };
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
        assignee: 'Responsável',
        request_date: 'Data Solicitação',
        due_date: 'Data Entrega',
        status: 'Status',
        priority: 'Prioridade',
        client: 'Cliente',
        type: 'Tipo',
        actions: 'Ações',
    };

    let tableColumnsOrder = [...DEFAULT_TABLE_COLUMNS_ORDER];
    let tableColumnsWidths = { ...DEFAULT_TABLE_COLUMNS_WIDTHS };
    const TAXONOMY_ICON_OPTIONS = [
        { value: 'fas fa-angles-up', label: 'Setas para cima' },
        { value: 'fas fa-arrow-up', label: 'Seta para cima' },
        { value: 'fas fa-minus', label: 'Linha' },
        { value: 'fas fa-arrow-down', label: 'Seta para baixo' },
        { value: 'fas fa-angles-down', label: 'Setas para baixo' },
        { value: 'fas fa-sparkles', label: 'Brilho' },
        { value: 'fas fa-gauge-high', label: 'Velocímetro' },
        { value: 'fas fa-wand-magic-sparkles', label: 'Varinha' },
        { value: 'fas fa-comments', label: 'Comentários' },
        { value: 'fas fa-lightbulb', label: 'Lâmpada' },
        { value: 'fas fa-triangle-exclamation', label: 'Alerta' },
        { value: 'fas fa-mountain', label: 'Montanha' },
        { value: 'fas fa-bolt', label: 'Raio' },
        { value: 'fas fa-flag', label: 'Bandeira' },
        { value: 'fas fa-star', label: 'Estrela' },
        { value: 'fas fa-circle', label: 'Círculo' },
        { value: 'fas fa-bug', label: 'Bug' },
        { value: 'fas fa-shield-halved', label: 'Escudo' },
        { value: 'fas fa-list-check', label: 'Checklist' },
        { value: 'fas fa-hourglass-half', label: 'Ampulheta' },
        { value: 'fas fa-rocket', label: 'Foguete' },
        { value: 'fas fa-handshake', label: 'Parceria' },
        { value: 'fas fa-magnifying-glass', label: 'Pesquisa' },
        { value: 'fas fa-gears', label: 'Engrenagens' },
        { value: 'fas fa-code-branch', label: 'Branch' },
        { value: 'fas fa-diagram-project', label: 'Fluxo' },
        { value: 'fas fa-clipboard-check', label: 'Validação' },
        { value: 'fas fa-paper-plane', label: 'Envio' },
        { value: 'fas fa-hammer', label: 'Construção' },
        { value: 'fas fa-screwdriver-wrench', label: 'Ajuste' },
        { value: 'fas fa-bullseye', label: 'Objetivo' },
        { value: 'fas fa-chart-column', label: 'Métricas' },
        { value: 'fas fa-user-check', label: 'Aprovado' },
        { value: 'fas fa-user-clock', label: 'Aguardando' },
        { value: 'fas fa-thumbtack', label: 'Fixado' },
        { value: 'fas fa-bookmark', label: 'Marcador' },
        { value: 'fas fa-tag', label: 'Etiqueta' },
        { value: 'fas fa-fire', label: 'Quente' },
        { value: 'fas fa-seedling', label: 'Evolução' },
        { value: 'fas fa-brain', label: 'Ideia' },
        { value: 'fas fa-hand', label: 'Atenção' },
        { value: 'fas fa-circle-check', label: 'Concluído' },
        { value: 'fas fa-circle-xmark', label: 'Bloqueado' },
        { value: 'fas fa-circle-info', label: 'Informação' },
        { value: 'fas fa-bell', label: 'Notificação' },
        { value: 'fas fa-comments-dollar', label: 'Comercial' },
    ];
    const taxonomyIconPickerPanels = [];
    let maintenancePollingTimer = null;

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
    const DEFAULT_TAXONOMY_COLORS = {
        priority: {
            very_high: '#c62828',
            high: '#ef5350',
            medium: '#f4b400',
            low: '#43a047',
            very_low: '#2e7d32',
        },
        type: {
            new: '#1e88e5',
            optimization: '#00897b',
            improvement: '#43a047',
            discussion: '#8e24aa',
            suggestion: '#fb8c00',
            issue: '#e53935',
            epic: '#3949ab',
        },
    };

    const populateTaskTaxonomyIconSelects = () => {
        const allIconInputs = [
            ...Object.values(taxonomyIconInputs.priority),
            ...Object.values(taxonomyIconInputs.type),
        ].filter(Boolean);

        allIconInputs.forEach((select) => {
            const defaultValue = String(select.dataset.defaultIcon || '').trim();
            select.innerHTML = TAXONOMY_ICON_OPTIONS
                .map((option) => `<option value="${option.value}">${option.label}</option>`)
                .join('');
            if (defaultValue) {
                select.value = defaultValue;
            }
        });
    };

    const getIconLabelByValue = (iconValue) => {
        const safe = String(iconValue || '').trim();
        const found = TAXONOMY_ICON_OPTIONS.find((option) => option.value === safe);
        return found ? found.label : 'Ícone';
    };

    const ensureIconOptionExists = (select, iconValue) => {
        if (!select) return;
        const safeValue = String(iconValue || '').trim();
        if (!safeValue) return;
        const hasOption = Array.from(select.options || []).some((option) => String(option.value || '').trim() === safeValue);
        if (hasOption) return;

        const option = document.createElement('option');
        option.value = safeValue;
        option.textContent = getIconLabelByValue(safeValue);
        select.appendChild(option);
    };

    const closeAllTaxonomyIconPickers = () => {
        taxonomyIconPickerPanels.forEach((panel) => panel.classList.remove('open'));
    };

    const updateTaxonomyIconPickerButton = (select, button) => {
        if (!select || !button) return;
        const value = String(select.value || select.dataset.defaultIcon || '').trim();
        ensureIconOptionExists(select, value);
        const label = getIconLabelByValue(value);
        const iconEl = button.querySelector('.picker-selected i');
        const labelEl = button.querySelector('.picker-selected span');
        if (iconEl) iconEl.className = value;
        if (labelEl) labelEl.textContent = label;
    };

    const buildTaxonomyIconPicker = (select) => {
        if (!select || select.dataset.pickerMounted === 'true') return;
        const wrapper = document.createElement('div');
        wrapper.className = 'taxonomy-icon-picker-inline';

        const triggerBtn = document.createElement('button');
        triggerBtn.type = 'button';
        triggerBtn.className = 'taxonomy-icon-picker-btn';
        triggerBtn.innerHTML = `
            <span class="picker-selected">
                <i class="${String(select.value || select.dataset.defaultIcon || 'fas fa-circle')}"></i>
                <span>${getIconLabelByValue(select.value || select.dataset.defaultIcon)}</span>
            </span>
            <i class="fas fa-chevron-down"></i>
        `;

        const panel = document.createElement('div');
        panel.className = 'taxonomy-icon-picker-panel';
        panel.innerHTML = `
            <input type="text" class="taxonomy-icon-picker-search" placeholder="Buscar ícone...">
            <div class="taxonomy-icon-picker-grid"></div>
        `;
        taxonomyIconPickerPanels.push(panel);

        const searchInput = panel.querySelector('.taxonomy-icon-picker-search');
        const grid = panel.querySelector('.taxonomy-icon-picker-grid');

        const renderOptions = (query = '') => {
            const normalizedQuery = String(query || '').trim().toLowerCase();
            const options = TAXONOMY_ICON_OPTIONS.filter((option) => {
                if (!normalizedQuery) return true;
                return option.label.toLowerCase().includes(normalizedQuery)
                    || option.value.toLowerCase().includes(normalizedQuery);
            });

            grid.innerHTML = options
                .map((option) => `
                    <button type="button" class="taxonomy-icon-picker-option" data-icon-value="${option.value}">
                        <i class="${option.value}"></i>
                        <span>${option.label}</span>
                    </button>
                `)
                .join('');

            grid.querySelectorAll('.taxonomy-icon-picker-option').forEach((optionBtn) => {
                optionBtn.addEventListener('click', () => {
                    const nextValue = String(optionBtn.getAttribute('data-icon-value') || '').trim();
                    if (!nextValue) return;
                    ensureIconOptionExists(select, nextValue);
                    select.value = nextValue;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    updateTaxonomyIconPickerButton(select, triggerBtn);
                    const editorItem = select.closest('.taxonomy-editor-item');
                    if (editorItem) {
                        refreshTaxonomyEditorPreview(editorItem);
                    }
                    panel.classList.remove('open');
                });
            });
        };

        triggerBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const isOpen = panel.classList.contains('open');
            closeAllTaxonomyIconPickers();
            if (!isOpen) {
                panel.classList.add('open');
                searchInput.value = '';
                renderOptions('');
                searchInput.focus();
            }
        });

        select.addEventListener('change', () => {
            updateTaxonomyIconPickerButton(select, triggerBtn);
            const editorItem = select.closest('.taxonomy-editor-item');
            if (editorItem) {
                refreshTaxonomyEditorPreview(editorItem);
            }
        });

        searchInput.addEventListener('input', () => {
            renderOptions(searchInput.value);
        });

        wrapper.appendChild(triggerBtn);
        wrapper.appendChild(panel);

        select.classList.add('native-hidden');
        select.setAttribute('hidden', 'hidden');
        select.setAttribute('aria-hidden', 'true');
        select.style.display = 'none';
        select.insertAdjacentElement('afterend', wrapper);
        select.dataset.pickerMounted = 'true';
        updateTaxonomyIconPickerButton(select, triggerBtn);
        renderOptions('');
    };

    const initTaxonomyIconPickers = () => {
        const selects = [
            ...Object.values(taxonomyIconInputs.priority),
            ...Object.values(taxonomyIconInputs.type),
        ].filter(Boolean);

        selects.forEach((select) => buildTaxonomyIconPicker(select));

        document.addEventListener('click', (event) => {
            if (event.target.closest('.taxonomy-icon-picker-inline')) return;
            closeAllTaxonomyIconPickers();
        });
    };

    const normalizeCustomMenuName = (value) => {
        const cleaned = String(value || '').trim().replace(/\s+/g, ' ');
        return cleaned.slice(0, 40);
    };

    const normalizeCustomMenuUrl = (value) => {
        return String(value || '').trim().slice(0, 300);
    };

    const normalizeCustomMenuIcon = (value) => {
        const allowed = new Set(['fa-link', 'fa-globe', 'fa-briefcase', 'fa-chart-line', 'fa-file-alt', 'fa-building', 'fa-cogs', 'fa-book']);
        const icon = String(value || '').trim();
        return allowed.has(icon) ? icon : DEFAULT_CUSTOM_SIDEBAR_ICON;
    };

    const loadCustomSidebarMenu = () => {
        try {
            const raw = localStorage.getItem(CUSTOM_SIDEBAR_MENU_KEY);
            if (!raw) return { name: '', url: '', icon: DEFAULT_CUSTOM_SIDEBAR_ICON, enabled: false };
            const parsed = JSON.parse(raw);
            const normalizedName = normalizeCustomMenuName(parsed?.name || '');
            const normalizedUrl = normalizeCustomMenuUrl(parsed?.url || '');
            const parsedEnabled = typeof parsed?.enabled === 'boolean'
                ? parsed.enabled
                : Boolean(normalizedName && normalizedUrl);
            return {
                name: normalizedName,
                url: normalizedUrl,
                icon: normalizeCustomMenuIcon(parsed?.icon || DEFAULT_CUSTOM_SIDEBAR_ICON),
                enabled: parsedEnabled
            };
        } catch (_error) {
            return { name: '', url: '', icon: DEFAULT_CUSTOM_SIDEBAR_ICON, enabled: false };
        }
    };

    const applyCustomSidebarMenuInputs = () => {
        if (!customSidebarMenuNameInput || !customSidebarMenuUrlInput || !customSidebarMenuIconInput || !customSidebarMenuEnabledInput) return;
        const saved = loadCustomSidebarMenu();
        customSidebarMenuNameInput.value = saved.name;
        customSidebarMenuUrlInput.value = saved.url;
        customSidebarMenuIconInput.value = saved.icon || DEFAULT_CUSTOM_SIDEBAR_ICON;
        customSidebarMenuEnabledInput.checked = Boolean(saved.enabled);
        updateCustomSidebarMenuIconPreview(customSidebarMenuIconInput.value);
        syncCustomSidebarMenuEnabledState();
    };

    const syncCustomSidebarMenuEnabledState = () => {
        if (!customSidebarMenuEnabledInput) return;
        const enabled = Boolean(customSidebarMenuEnabledInput.checked);
        const controlledInputs = [
            customSidebarMenuNameInput,
            customSidebarMenuUrlInput,
            customSidebarMenuIconInput,
        ];

        controlledInputs.forEach((input) => {
            if (!input) return;
            input.disabled = !enabled;
            input.setAttribute('aria-disabled', enabled ? 'false' : 'true');

            const group = input.closest('.table-column-width-item, .custom-menu-icon-picker');
            if (group) {
                group.style.opacity = enabled ? '1' : '0.6';
            }
        });

        if (customSidebarMenuIconPreview) {
            customSidebarMenuIconPreview.style.opacity = enabled ? '1' : '0.6';
        }
    };

    const applyTaskTaxonomyColorInputs = () => {
        let config = null;
        if (window.UtilsModule && typeof window.UtilsModule.getTaskTaxonomyColorConfig === 'function') {
            config = window.UtilsModule.getTaskTaxonomyColorConfig();
        } else {
            try {
                const raw = localStorage.getItem(TASK_TAXONOMY_COLORS_KEY);
                config = raw ? JSON.parse(raw) : null;
            } catch (_error) {
                config = null;
            }
        }

        Object.entries(taxonomyColorInputs.priority).forEach(([key, input]) => {
            if (!input) return;
            input.value = config?.priority?.[key] || DEFAULT_TAXONOMY_COLORS.priority[key] || input.value;
        });

        Object.entries(taxonomyColorInputs.type).forEach(([key, input]) => {
            if (!input) return;
            input.value = config?.type?.[key] || DEFAULT_TAXONOMY_COLORS.type[key] || input.value;
        });
    };

    const syncTaxonomyIconPickerUI = (input) => {
        if (!input) return;
        const pickerWrapper = input.nextElementSibling;
        if (!pickerWrapper || !pickerWrapper.classList.contains('taxonomy-icon-picker-inline')) return;

        const selectedIcon = String(input.value || input.dataset.defaultIcon || '').trim();
        const iconEl = pickerWrapper.querySelector('.picker-selected i');
        const labelEl = pickerWrapper.querySelector('.picker-selected span');

        if (iconEl && selectedIcon) {
            iconEl.className = selectedIcon;
        }
        if (labelEl) {
            labelEl.textContent = getIconLabelByValue(selectedIcon);
        }
    };

    const applyTaskTaxonomyIconInputs = () => {
        let config = null;
        if (window.UtilsModule && typeof window.UtilsModule.getTaskTaxonomyIconConfig === 'function') {
            config = window.UtilsModule.getTaskTaxonomyIconConfig();
        } else {
            try {
                const raw = localStorage.getItem('pharus_task_taxonomy_icons');
                config = raw ? JSON.parse(raw) : null;
            } catch (_error) {
                config = null;
            }
        }

        Object.entries(taxonomyIconInputs.priority).forEach(([key, input]) => {
            if (!input) return;
            const configured = String(config?.priority?.[key] || '').trim();
            ensureIconOptionExists(input, configured);
            input.value = configured || input.value;
            syncTaxonomyIconPickerUI(input);
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        Object.entries(taxonomyIconInputs.type).forEach(([key, input]) => {
            if (!input) return;
            const configured = String(config?.type?.[key] || '').trim();
            ensureIconOptionExists(input, configured);
            input.value = configured || input.value;
            syncTaxonomyIconPickerUI(input);
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
    };

    const collectTaskTaxonomyColorInputs = () => {
        const config = { priority: {}, type: {} };
        Object.entries(taxonomyColorInputs.priority).forEach(([key, input]) => {
            if (!input) return;
            config.priority[key] = input.value;
        });
        Object.entries(taxonomyColorInputs.type).forEach(([key, input]) => {
            if (!input) return;
            config.type[key] = input.value;
        });
        return config;
    };

    const collectTaskTaxonomyIconInputs = () => {
        const config = { priority: {}, type: {} };
        const readIconValue = (input) => {
            if (!input) return '';
            const directValue = String(input.value || '').trim();
            if (directValue) return directValue;

            const pickerWrapper = input.nextElementSibling;
            if (pickerWrapper && pickerWrapper.classList.contains('taxonomy-icon-picker-inline')) {
                const iconEl = pickerWrapper.querySelector('.picker-selected i');
                const fallbackClass = String(iconEl?.className || '').trim();
                return fallbackClass;
            }
            return '';
        };

        Object.entries(taxonomyIconInputs.priority).forEach(([key, input]) => {
            if (!input) return;
            config.priority[key] = readIconValue(input) || String(input.dataset.defaultIcon || '').trim();
        });
        Object.entries(taxonomyIconInputs.type).forEach(([key, input]) => {
            if (!input) return;
            config.type[key] = readIconValue(input) || String(input.dataset.defaultIcon || '').trim();
        });
        return config;
    };

    const getTaxonomyEditorInputPair = (item) => {
        const scope = String(item?.dataset?.taxonomyScope || '').trim();
        const key = String(item?.dataset?.taxonomyKey || '').trim();
        if (!scope || !key) return { iconInput: null, colorInput: null };
        return {
            iconInput: taxonomyIconInputs?.[scope]?.[key] || null,
            colorInput: taxonomyColorInputs?.[scope]?.[key] || null,
        };
    };

    const refreshTaxonomyEditorPreview = (item) => {
        if (!item) return;
        const preview = item.querySelector('.taxonomy-item-preview');
        if (!preview) return;
        const previewIcon = preview.querySelector('i');
        const { iconInput, colorInput } = getTaxonomyEditorInputPair(item);
        if (!previewIcon || !iconInput || !colorInput) return;
        const pickerWrapper = iconInput.nextElementSibling;
        const pickerIconClass = (pickerWrapper && pickerWrapper.classList.contains('taxonomy-icon-picker-inline'))
            ? String(pickerWrapper.querySelector('.picker-selected i')?.className || '').trim()
            : '';
        const iconClass = String(iconInput.value || pickerIconClass || iconInput.dataset.defaultIcon || 'fas fa-circle').trim();
        previewIcon.className = iconClass;
        preview.style.backgroundColor = colorInput.value || '#2f8ee5';
    };

    const refreshAllTaxonomyEditorPreviews = () => {
        taxonomyEditorItems.forEach((item) => refreshTaxonomyEditorPreview(item));
    };

    const initTaxonomyEditor = () => {
        taxonomyEditorItems.forEach((item) => {
            const trigger = item.querySelector('.taxonomy-editor-trigger');
            const { iconInput, colorInput } = getTaxonomyEditorInputPair(item);

            if (trigger) {
                trigger.addEventListener('click', () => {
                    const willExpand = !item.classList.contains('expanded');
                    taxonomyEditorItems.forEach((other) => {
                        other.classList.remove('expanded');
                    });
                    if (willExpand) {
                        item.classList.add('expanded');
                    }
                });
            }

            if (iconInput) {
                iconInput.addEventListener('change', () => refreshTaxonomyEditorPreview(item));
            }
            if (colorInput) {
                colorInput.addEventListener('input', () => refreshTaxonomyEditorPreview(item));
                colorInput.addEventListener('change', () => refreshTaxonomyEditorPreview(item));
            }
        });

        refreshAllTaxonomyEditorPreviews();
    };

    const updateCustomSidebarMenuIconPreview = (iconValue) => {
        if (!customSidebarMenuIconPreview) return;
        const icon = normalizeCustomMenuIcon(iconValue);
        customSidebarMenuIconPreview.innerHTML = `<i class="fas ${icon}"></i>`;
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

    const showButtonStatusFeedback = (button, originalHtml, label, type = 'success') => {
        if (!button) return;
        const text = String(label || '').trim() || 'Concluído';
        const success = type !== 'warning';
        button.classList.remove('btn-copied');
        button.style.backgroundColor = success ? '#1f9d57' : '#b7791f';
        button.style.borderColor = success ? '#1f9d57' : '#b7791f';
        button.style.color = '#ffffff';
        button.style.transform = 'translateY(-1px)';
        button.style.boxShadow = success
            ? '0 2px 8px rgba(31, 157, 87, 0.3)'
            : '0 2px 8px rgba(183, 121, 31, 0.3)';
        button.innerHTML = success
            ? `<i class="fas fa-check"></i> ${text}`
            : `<i class="fas fa-exclamation-triangle"></i> ${text}`;

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

    const setMaintenanceStatus = (message) => {
        if (!maintenanceStatusHint) return;
        maintenanceStatusHint.textContent = String(message || '');
        maintenanceStatusHint.style.display = message ? 'block' : 'none';
    };

    const setMaintenanceLog = (logs) => {
        if (!maintenanceLogBox) return;
        const safeLogs = Array.isArray(logs) ? logs : [];
        maintenanceLogBox.textContent = safeLogs.length
            ? safeLogs.join('\n')
            : 'Aguardando ações de manutenção...';
        maintenanceLogBox.scrollTop = maintenanceLogBox.scrollHeight;
    };

    const getMaintenanceAuthPayload = async () => {
        try {
            const { data, error } = await window.dbClient.auth.getSession();
            if (error) throw error;
            const user = data?.session?.user || null;
            return {
                auth_user_id: user?.id || null,
                auth_email: user?.email || null,
            };
        } catch (_error) {
            return { auth_user_id: null, auth_email: null };
        }
    };

    const callMaintenanceApi = async (path, payload = {}) => {
        const response = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload || {}),
        });
        const json = await response.json().catch(() => ({ data: null, error: { message: 'Resposta inválida da API de manutenção.' } }));
        if (!response.ok || json?.error) {
            throw new Error(String(json?.error?.message || `Falha na requisição ${path}`));
        }
        return json.data || null;
    };

    const hasMaintenancePermission = () => hasSettingsPermission('maintenance');

    const ensureMaintenancePermission = () => {
        if (hasMaintenancePermission()) return true;
        return ensureSettingsPermission('maintenance', 'Você não tem permissão para executar atualização e backup.');
    };

    const applyMaintenanceButtonsState = (running) => {
        const disabled = Boolean(running);
        if (checkSystemUpdatesBtn) checkSystemUpdatesBtn.disabled = disabled;
        if (createSystemBackupBtn) createSystemBackupBtn.disabled = disabled;
        if (runSystemUpdateBtn) runSystemUpdateBtn.disabled = disabled;
    };

    const stopMaintenancePolling = () => {
        if (!maintenancePollingTimer) return;
        window.clearInterval(maintenancePollingTimer);
        maintenancePollingTimer = null;
    };

    const refreshMaintenanceStatus = async () => {
        if (!maintenanceLogBox) return;
        const auth = await getMaintenanceAuthPayload();
        const status = await callMaintenanceApi('/api/system/maintenance/status', auth);
        if (maintenanceCurrentVersionInput) maintenanceCurrentVersionInput.value = status?.currentVersion || '-';
        setMaintenanceLog(status?.logs || []);
        setMaintenanceStatus(status?.message || (status?.running ? 'Operação em andamento...' : ''));
        applyMaintenanceButtonsState(Boolean(status?.running));
        if (!status?.running) {
            stopMaintenancePolling();
        }
    };

    const startMaintenancePolling = () => {
        stopMaintenancePolling();
        maintenancePollingTimer = window.setInterval(() => {
            refreshMaintenanceStatus().catch((error) => {
                console.error('Erro ao consultar status da manutenção:', error);
                setMaintenanceStatus(error?.message || 'Falha ao atualizar status da manutenção.');
            });
        }, 1800);
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

    const openExtensionsManualFlow = async () => {
        const copied = await copyText(
            EXTENSIONS_URL,
            'Link copiado. No Chrome pressione Ctrl+L, Ctrl+V e Enter.'
        );
        if (!copied) {
            notify('Não foi possível copiar. Digite manualmente: chrome://extensions', 'warning');
        }
        return copied;
    };

    const hasSettingsPermission = (optionKey) => {
        if (typeof PermissionService === 'undefined' || typeof PermissionService.has !== 'function') return true;
        return PermissionService.has('configuracoes', optionKey);
    };

    const ensureSettingsPermission = (optionKey, message) => {
        if (typeof PermissionService === 'undefined' || typeof PermissionService.ensure !== 'function') return true;
        return PermissionService.ensure('configuracoes', optionKey, message || 'Você não tem permissão para executar esta ação.');
    };

    const hasUsersScreenViewPermission = () => {
        if (typeof PermissionService === 'undefined' || typeof PermissionService.has !== 'function') return true;
        return PermissionService.has('usuarios', 'view');
    };

    const applySettingsTabPermissions = () => {
        settingsTabButtons.forEach((button) => {
            const tabId = String(button.dataset.tab || '').trim();
            const optionKey = SETTINGS_TAB_PERMISSION_MAP[tabId];
            if (!optionKey) return;
            let allowed = tabId === 'maintenance'
                ? hasMaintenancePermission()
                : hasSettingsPermission(optionKey);
            if (tabId === 'users') {
                allowed = allowed && hasUsersScreenViewPermission();
            }
            button.style.display = allowed ? '' : 'none';
        });
    };

    const init = async () => {
        if (typeof PermissionService !== 'undefined' && typeof PermissionService.init === 'function') {
            await PermissionService.init();
        }
        const canViewSettings = hasSettingsPermission('view') || Object.values(SETTINGS_TAB_PERMISSION_MAP).some((optionKey) => hasSettingsPermission(optionKey));
        if (!canViewSettings) {
            ensureSettingsPermission('view', 'Você não tem permissão para acessar configurações.');
            return;
        }
        applySettingsTabPermissions();
        initTabs();
        initCardToggles();
        hideStatusHint(projectDisplayNameStatus);
        hideStatusHint(customSidebarMenuStatus);
        hideStatusHint(tableColumnsOrderStatus);
        hideStatusHint(tableColumnsWidthStatus);
        populateTaskTaxonomyIconSelects();
        applyProjectDisplayNameInput();
        applyCustomSidebarMenuInputs();
        applyTaskTaxonomyColorInputs();
        applyTaskTaxonomyIconInputs();
        initTaxonomyIconPickers();
        initTaxonomyEditor();
        // Reaplica apos montar os pickers para garantir sincronia visual completa
        applyTaskTaxonomyIconInputs();
        updateCustomSidebarMenuIconPreview(customSidebarMenuIconInput?.value || DEFAULT_CUSTOM_SIDEBAR_ICON);
        syncCustomSidebarMenuEnabledState();
        loadTableColumnsOrder();
        loadTableColumnsWidths();
        renderTableColumnsOrderList();
        renderTableColumnsWidthGrid();
        if (maintenanceCurrentVersionInput) {
            maintenanceCurrentVersionInput.value = 'Carregando...';
        }
        if (maintenanceLatestVersionInput) {
            maintenanceLatestVersionInput.value = '-';
        }
        setMaintenanceStatus('');
        setMaintenanceLog([]);
        applyMaintenanceButtonsState(false);

        if (openExtensionsBtn) {
            openExtensionsBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                const originalHtml = openExtensionsBtn.innerHTML;
                const copied = await openExtensionsManualFlow();
                if (copied) {
                    showCopiedFeedback(openExtensionsBtn, originalHtml);
                }
            });
        }

        if (resetCustomSidebarMenuBtn && customSidebarMenuNameInput && customSidebarMenuUrlInput && customSidebarMenuIconInput && customSidebarMenuEnabledInput) {
            resetCustomSidebarMenuBtn.addEventListener('click', (event) => {
                event.preventDefault();
                const originalHtml = resetCustomSidebarMenuBtn.innerHTML;
                customSidebarMenuNameInput.value = '';
                customSidebarMenuUrlInput.value = '';
                customSidebarMenuIconInput.value = DEFAULT_CUSTOM_SIDEBAR_ICON;
                customSidebarMenuEnabledInput.checked = false;
                updateCustomSidebarMenuIconPreview(DEFAULT_CUSTOM_SIDEBAR_ICON);
                localStorage.setItem(CUSTOM_SIDEBAR_MENU_KEY, JSON.stringify({ name: '', url: '', icon: DEFAULT_CUSTOM_SIDEBAR_ICON, enabled: false }));
                window.dispatchEvent(new CustomEvent('pharus:custom-sidebar-menu-updated', {
                    detail: { name: '', url: '', icon: DEFAULT_CUSTOM_SIDEBAR_ICON, enabled: false }
                }));
                notify('Menu personalizado removido.', 'success');
                showButtonActionFeedback(resetCustomSidebarMenuBtn, originalHtml, 'success');
            });
        }

        if (resetTaskTaxonomyColorsBtn) {
            resetTaskTaxonomyColorsBtn.addEventListener('click', (event) => {
                event.preventDefault();
                const originalHtml = resetTaskTaxonomyColorsBtn.innerHTML;
                if (window.UtilsModule && typeof window.UtilsModule.resetTaskTaxonomyColorConfig === 'function') {
                    window.UtilsModule.resetTaskTaxonomyColorConfig();
                } else {
                    localStorage.removeItem(TASK_TAXONOMY_COLORS_KEY);
                }
                applyTaskTaxonomyColorInputs();
                window.dispatchEvent(new CustomEvent('pharus:task-taxonomy-colors-updated'));
                refreshAllTaxonomyEditorPreviews();
                notify('Cores globais restauradas para o padrão.', 'success');
                showButtonActionFeedback(resetTaskTaxonomyColorsBtn, originalHtml, 'success');
            });
        }

        if (resetTaskTaxonomyIconsBtn) {
            resetTaskTaxonomyIconsBtn.addEventListener('click', (event) => {
                event.preventDefault();
                const originalHtml = resetTaskTaxonomyIconsBtn.innerHTML;
                if (window.UtilsModule && typeof window.UtilsModule.resetTaskTaxonomyIconConfig === 'function') {
                    window.UtilsModule.resetTaskTaxonomyIconConfig();
                }
                applyTaskTaxonomyIconInputs();
                window.dispatchEvent(new CustomEvent('pharus:task-taxonomy-icons-updated'));
                refreshAllTaxonomyEditorPreviews();
                notify('Ícones globais restaurados para o padrão.', 'success');
                showButtonActionFeedback(resetTaskTaxonomyIconsBtn, originalHtml, 'success');
            });
        }

        if (saveGeneralSettingsBtn && projectDisplayNameInput && customSidebarMenuNameInput && customSidebarMenuUrlInput && customSidebarMenuIconInput && customSidebarMenuEnabledInput) {
            saveGeneralSettingsBtn.addEventListener('click', (event) => {
                event.preventDefault();
                if (!ensureSettingsPermission('project', 'Você não tem permissão para alterar configurações gerais.')) return;
                const originalHtml = saveGeneralSettingsBtn.innerHTML;

                const normalizedName = normalizeProjectDisplayName(projectDisplayNameInput.value);
                projectDisplayNameInput.value = normalizedName;
                localStorage.setItem(PROJECT_DISPLAY_NAME_KEY, normalizedName);
                window.dispatchEvent(new CustomEvent('pharus:project-name-updated', {
                    detail: { projectName: normalizedName }
                }));

                const customMenuName = normalizeCustomMenuName(customSidebarMenuNameInput.value);
                const customMenuUrl = normalizeCustomMenuUrl(customSidebarMenuUrlInput.value);
                const customMenuIcon = normalizeCustomMenuIcon(customSidebarMenuIconInput.value);
                const customMenuEnabled = Boolean(customSidebarMenuEnabledInput.checked);

                customSidebarMenuNameInput.value = customMenuName;
                customSidebarMenuUrlInput.value = customMenuUrl;
                customSidebarMenuIconInput.value = customMenuIcon;
                updateCustomSidebarMenuIconPreview(customMenuIcon);

                const hasCustomMenuFieldsMismatch = customMenuEnabled && ((customMenuName && !customMenuUrl) || (!customMenuName && customMenuUrl));
                const normalizedCustomMenuEnabled = hasCustomMenuFieldsMismatch ? false : customMenuEnabled;
                customSidebarMenuEnabledInput.checked = normalizedCustomMenuEnabled;
                syncCustomSidebarMenuEnabledState();

                localStorage.setItem(CUSTOM_SIDEBAR_MENU_KEY, JSON.stringify({
                    name: customMenuName,
                    url: customMenuUrl,
                    icon: customMenuIcon,
                    enabled: normalizedCustomMenuEnabled
                }));
                window.dispatchEvent(new CustomEvent('pharus:custom-sidebar-menu-updated', {
                    detail: {
                        name: customMenuName,
                        url: customMenuUrl,
                        icon: customMenuIcon,
                        enabled: normalizedCustomMenuEnabled
                    }
                }));

                const colorPayload = collectTaskTaxonomyColorInputs();
                if (window.UtilsModule && typeof window.UtilsModule.saveTaskTaxonomyColorConfig === 'function') {
                    window.UtilsModule.saveTaskTaxonomyColorConfig(colorPayload);
                } else {
                    localStorage.setItem(TASK_TAXONOMY_COLORS_KEY, JSON.stringify(colorPayload));
                }
                window.dispatchEvent(new CustomEvent('pharus:task-taxonomy-colors-updated'));

                const iconPayload = collectTaskTaxonomyIconInputs();
                if (window.UtilsModule && typeof window.UtilsModule.saveTaskTaxonomyIconConfig === 'function') {
                    window.UtilsModule.saveTaskTaxonomyIconConfig(iconPayload);
                } else {
                    localStorage.setItem('pharus_task_taxonomy_icons', JSON.stringify(iconPayload));
                }
                applyTaskTaxonomyIconInputs();
                window.dispatchEvent(new CustomEvent('pharus:task-taxonomy-icons-updated'));

                refreshAllTaxonomyEditorPreviews();
                if (hasCustomMenuFieldsMismatch) {
                    notify('Configurações salvas. Menu personalizado foi desativado porque nome/URL estão incompletos.', 'warning');
                    showButtonActionFeedback(saveGeneralSettingsBtn, originalHtml, 'warning');
                    return;
                }

                notify('Configurações gerais salvas com sucesso.', 'success');
                showButtonActionFeedback(saveGeneralSettingsBtn, originalHtml, 'success');
            });
        }

        if (customSidebarMenuIconInput) {
            customSidebarMenuIconInput.addEventListener('change', () => {
                updateCustomSidebarMenuIconPreview(customSidebarMenuIconInput.value);
            });
        }

        if (customSidebarMenuEnabledInput) {
            customSidebarMenuEnabledInput.addEventListener('change', () => {
                syncCustomSidebarMenuEnabledState();
            });
        }

        if (checkSystemUpdatesBtn) {
            checkSystemUpdatesBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                if (!ensureMaintenancePermission()) return;
                const originalHtml = checkSystemUpdatesBtn.innerHTML;
                try {
                    applyMaintenanceButtonsState(true);
                    setMaintenanceStatus('Verificando atualizações...');
                    const auth = await getMaintenanceAuthPayload();
                    const data = await callMaintenanceApi('/api/system/maintenance/check', auth);
                    if (maintenanceCurrentVersionInput) maintenanceCurrentVersionInput.value = data?.currentVersion || '-';
                    if (maintenanceLatestVersionInput) maintenanceLatestVersionInput.value = data?.latestVersion || '-';
                    const updateAvailable = Boolean(data?.updateAvailable);
                    const manifestMsg = data?.message ? ` (${data.message})` : '';
                    setMaintenanceStatus(updateAvailable
                        ? `Atualização disponível para versão ${data?.latestVersion || '-'}.${manifestMsg}`
                        : `Sistema já está atualizado.${manifestMsg}`);
                    notify(updateAvailable ? 'Nova versão disponível.' : 'Sistema já está atualizado.', updateAvailable ? 'warning' : 'success');
                    showButtonStatusFeedback(checkSystemUpdatesBtn, originalHtml, 'Verificado', updateAvailable ? 'warning' : 'success');
                } catch (error) {
                    console.error('Erro ao verificar atualizações:', error);
                    setMaintenanceStatus(error?.message || 'Falha ao verificar atualizações.');
                    notify(error?.message || 'Falha ao verificar atualizações.', 'error');
                } finally {
                    applyMaintenanceButtonsState(false);
                    refreshMaintenanceStatus().catch(() => {});
                }
            });
        }

        if (createSystemBackupBtn) {
            createSystemBackupBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                if (!ensureMaintenancePermission()) return;
                const originalHtml = createSystemBackupBtn.innerHTML;
                try {
                    const backupFormat = String(maintenanceBackupFormatInput?.value || 'sql').trim().toLowerCase();
                    applyMaintenanceButtonsState(true);
                    setMaintenanceStatus(`Gerando backup em formato ${backupFormat.toUpperCase()}...`);
                    const auth = await getMaintenanceAuthPayload();
                    const data = await callMaintenanceApi('/api/system/maintenance/backup', {
                        ...auth,
                        format: backupFormat,
                    });
                    const backupPath = String(data?.backupFile || '').trim();
                    setMaintenanceStatus(backupPath ? `Backup concluído: ${backupPath}` : 'Backup concluído com sucesso.');
                    notify('Backup gerado com sucesso.', 'success');
                    showButtonStatusFeedback(createSystemBackupBtn, originalHtml, 'Concluído', 'success');
                } catch (error) {
                    console.error('Erro ao gerar backup:', error);
                    setMaintenanceStatus(error?.message || 'Falha ao gerar backup.');
                    notify(error?.message || 'Falha ao gerar backup.', 'error');
                } finally {
                    applyMaintenanceButtonsState(false);
                    refreshMaintenanceStatus().catch(() => {});
                }
            });
        }

        if (runSystemUpdateBtn) {
            runSystemUpdateBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                if (!ensureMaintenancePermission()) return;
                const shouldProceed = window.confirm('Deseja iniciar a atualização automática agora? O sistema pode ficar indisponível por alguns instantes.');
                if (!shouldProceed) return;
                const originalHtml = runSystemUpdateBtn.innerHTML;
                try {
                    applyMaintenanceButtonsState(true);
                    setMaintenanceStatus('Iniciando atualização...');
                    const auth = await getMaintenanceAuthPayload();
                    await callMaintenanceApi('/api/system/maintenance/update', auth);
                    notify('Atualização iniciada. Acompanhe o log abaixo.', 'success');
                    showButtonStatusFeedback(runSystemUpdateBtn, originalHtml, 'Iniciado', 'success');
                    startMaintenancePolling();
                    await refreshMaintenanceStatus();
                } catch (error) {
                    console.error('Erro ao iniciar atualização:', error);
                    setMaintenanceStatus(error?.message || 'Falha ao iniciar atualização.');
                    notify(error?.message || 'Falha ao iniciar atualização.', 'error');
                    applyMaintenanceButtonsState(false);
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
                if (!ensureSettingsPermission('table', 'Você não tem permissão para alterar a ordem das colunas.')) return;
                const originalHtml = saveTableColumnsOrderBtn.innerHTML;
                localStorage.setItem(TABLE_COLUMNS_ORDER_KEY, JSON.stringify(tableColumnsOrder));
                notify('Ordem das colunas salva com sucesso.', 'success');
                showButtonActionFeedback(saveTableColumnsOrderBtn, originalHtml, 'success');
            });
        }

        if (resetTableColumnsOrderBtn) {
            resetTableColumnsOrderBtn.addEventListener('click', (event) => {
                event.preventDefault();
                if (!ensureSettingsPermission('table', 'Você não tem permissão para alterar a ordem das colunas.')) return;
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
                if (!ensureSettingsPermission('table', 'Você não tem permissão para alterar a largura das colunas.')) return;
                const originalHtml = saveTableColumnsWidthBtn.innerHTML;
                localStorage.setItem(TABLE_COLUMNS_WIDTHS_KEY, JSON.stringify(tableColumnsWidths));
                notify('Largura das colunas salva com sucesso.', 'success');
                showButtonActionFeedback(saveTableColumnsWidthBtn, originalHtml, 'success');
            });
        }

        if (resetTableColumnsWidthBtn) {
            resetTableColumnsWidthBtn.addEventListener('click', (event) => {
                event.preventDefault();
                if (!ensureSettingsPermission('table', 'Você não tem permissão para alterar a largura das colunas.')) return;
                const originalHtml = resetTableColumnsWidthBtn.innerHTML;
                tableColumnsWidths = { ...DEFAULT_TABLE_COLUMNS_WIDTHS };
                localStorage.setItem(TABLE_COLUMNS_WIDTHS_KEY, JSON.stringify(tableColumnsWidths));
                renderTableColumnsWidthGrid();
                notify('Largura padrão das colunas restaurada.', 'success');
                showButtonActionFeedback(resetTableColumnsWidthBtn, originalHtml, 'success');
            });
        }

        if (hasMaintenancePermission()) {
            refreshMaintenanceStatus().catch((error) => {
                console.error('Erro ao carregar status de manutenção:', error);
                setMaintenanceStatus(error?.message || 'Falha ao carregar status de manutenção.');
            });
        } else {
            applyMaintenanceButtonsState(true);
            setMaintenanceStatus('Sem permissão para atualização e backup.');
        }

        window.addEventListener('beforeunload', () => {
            stopMaintenancePolling();
        });
    };

    const normalizeTab = (tabId) => {
        const cleaned = String(tabId || '').trim();
        if (ALLOWED_SETTINGS_TABS.has(cleaned)) {
            const optionKey = SETTINGS_TAB_PERMISSION_MAP[cleaned];
            const hasOptionPermission = !optionKey
                || (cleaned === 'maintenance' ? hasMaintenancePermission() : hasSettingsPermission(optionKey));
            const hasUsersPermission = cleaned !== 'users' || hasUsersScreenViewPermission();
            if (hasOptionPermission && hasUsersPermission) return cleaned;
        }
        const firstAllowed = settingsTabButtons
            .map((button) => String(button.dataset.tab || '').trim())
            .find((tab) => {
                const optionKey = SETTINGS_TAB_PERMISSION_MAP[tab];
                const allowed = tab === 'maintenance'
                    ? hasMaintenancePermission()
                    : hasSettingsPermission(optionKey);
                if (!optionKey || !allowed) return false;
                if (tab === 'users' && !hasUsersScreenViewPermission()) return false;
                return true;
            });
        return firstAllowed || 'general';
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
            item.dataset.colKey = key;
            item.innerHTML = `
                <span class="order-label">${index + 1}. ${TABLE_COLUMNS_LABELS[key] || key}</span>
                <div class="order-actions">
                    <button type="button" class="btn btn-secondary" data-move="left" ${index === 0 ? 'disabled' : ''}>&larr;</button>
                    <button type="button" class="btn btn-secondary" data-move="right" ${index === tableColumnsOrder.length - 1 ? 'disabled' : ''}>&rarr;</button>
                </div>
            `;

            item.querySelectorAll('button[data-move]').forEach((button) => {
                button.addEventListener('click', () => {
                    const direction = button.dataset.move;
                    const currentIndex = tableColumnsOrder.indexOf(key);
                    if (currentIndex < 0) return;

                    if (direction === 'left' && currentIndex > 0) {
                        [tableColumnsOrder[currentIndex - 1], tableColumnsOrder[currentIndex]] = [tableColumnsOrder[currentIndex], tableColumnsOrder[currentIndex - 1]];
                    }
                    if (direction === 'right' && currentIndex < tableColumnsOrder.length - 1) {
                        [tableColumnsOrder[currentIndex], tableColumnsOrder[currentIndex + 1]] = [tableColumnsOrder[currentIndex + 1], tableColumnsOrder[currentIndex]];
                    }

                    renderTableColumnsOrderList();
                    renderTableColumnsWidthGrid();
                });
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




