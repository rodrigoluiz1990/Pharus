// board.js - VERSÃO AJUSTADA (mantém estrutura original, dropdown robusto)

const BoardModule = (() => {
    // Elementos do DOM
    const taskBoard = document.getElementById("taskBoard");
    const sociousView = document.getElementById("sociousView");
    const sociousTableBody = document.getElementById("sociousTableBody");
    const sociousTableHeadRow = document.getElementById("sociousTableHeadRow");
    const boardViewBtn = document.getElementById("boardViewBtn");
    const sociousViewBtn = document.getElementById("sociousViewBtn");
    const titleOnlyViewBtn = document.getElementById("titleOnlyViewBtn");
    const addTaskSocious = document.getElementById("addTaskSocious");
    const titleQuickSearchInput = document.getElementById("titleQuickSearchInput");
    const VIEW_MODE_KEY = "pharus_board_view_mode";
    const TABLE_COLUMNS_ORDER_KEY = "pharus_table_columns_order";
    const TABLE_COLUMNS_WIDTHS_KEY = "pharus_table_columns_widths";
    const TABLE_COLUMN_MIN_WIDTH = 50;
    const DEFAULT_TABLE_COLUMNS_ORDER = ["pin", "title", "assignee", "request_date", "due_date", "status", "priority", "client", "type", "actions"];
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

    // Dados
    let tasks = [];
    let columns = [];
    let users = [];
    let clients = [];
    let filteredTasks = [];
    let titleQuickSearchTerm = "";
    let isInitialized = false;
    let isInitializing = false;
    let autoRefreshInterval = null;
    let lastDataSignature = null;
    let lastLoadHadChanges = true;
    let queryTaskHandled = false;
    let boardPermissions = {
        view: true,
        create: true,
        edit: true,
        move: true,
        delete: true,
        pin: true,
        filter: true,
        sort: true,
        import: true,
    };

    const hasBoardPermission = (optionKey) => {
        if (typeof PermissionService === 'undefined' || typeof PermissionService.has !== 'function') return true;
        return PermissionService.has('quadro_tarefas', optionKey);
    };

    const ensureBoardPermission = (optionKey, message) => {
        if (typeof PermissionService === 'undefined' || typeof PermissionService.ensure !== 'function') return true;
        return PermissionService.ensure('quadro_tarefas', optionKey, message);
    };

    const loadBoardPermissions = async () => {
        if (typeof PermissionService !== 'undefined' && typeof PermissionService.init === 'function') {
            await PermissionService.init();
        }

        boardPermissions = {
            view: hasBoardPermission('view'),
            create: hasBoardPermission('create'),
            edit: hasBoardPermission('edit'),
            move: hasBoardPermission('move'),
            delete: hasBoardPermission('delete'),
            pin: hasBoardPermission('pin'),
            filter: hasBoardPermission('filter'),
            sort: hasBoardPermission('sort'),
            import: hasBoardPermission('import'),
        };
    };

    const buildDataSignature = (columnsData, tasksData, usersData, clientsData) => {
        const safeColumns = Array.isArray(columnsData) ? columnsData : [];
        const safeTasks = Array.isArray(tasksData) ? tasksData : [];
        const safeUsers = Array.isArray(usersData) ? usersData : [];
        const safeClients = Array.isArray(clientsData) ? clientsData : [];

        const normalizedColumns = safeColumns
            .map((c) => ({
                id: String(c.id ?? ''),
                title: String(c.title ?? ''),
                type: String(c.type ?? ''),
                position: Number(c.position ?? 0),
                updated_at: String(c.updated_at ?? ''),
            }))
            .sort((a, b) => a.id.localeCompare(b.id));

        const normalizedTasks = safeTasks
            .map((t) => ({
                id: String(t.id ?? ''),
                title: String(t.title ?? ''),
                status: String(t.status ?? ''),
                priority: String(t.priority ?? ''),
                assignee: String(t.assignee ?? ''),
                due_date: String(t.due_date ?? ''),
                request_date: String(t.request_date ?? ''),
                board_column_id: String(t.board_column_id ?? ''),
                type: String(t.type ?? ''),
                completed: Boolean(t.completed),
                client: String(t.client ?? ''),
                updated_at: String(t.updated_at ?? ''),
            }))
            .sort((a, b) => a.id.localeCompare(b.id));

        const normalizedUsers = safeUsers
            .map((u) => ({
                id: String(u.id ?? ''),
                name: String(u.name ?? ''),
                email: String(u.email ?? ''),
                status: String(u.status ?? ''),
                updated_at: String(u.updated_at ?? ''),
            }))
            .sort((a, b) => a.id.localeCompare(b.id));

        const normalizedClients = safeClients
            .map((c) => ({
                id: String(c.id ?? ''),
                name: String(c.name ?? ''),
                acronym: String(c.acronym ?? ''),
                status: String(c.status ?? ''),
                updated_at: String(c.updated_at ?? ''),
            }))
            .sort((a, b) => a.id.localeCompare(b.id));

        return JSON.stringify({
            columns: normalizedColumns,
            tasks: normalizedTasks,
            users: normalizedUsers,
            clients: normalizedClients,
        });
    };

    // ========== FUNÇÕES PRINCIPAIS ========== //

    const loadData = async (options = {}) => {
        const { silent = false } = options;
        try {
            if (!silent) {
                UtilsModule.showLoading('Carregando dados...');
            }

            const [columnsData, tasksData, usersData, clientsData] = await Promise.all([
                StorageModule.getColumns(),
                StorageModule.getTasks(),
                StorageModule.getUsers(),
                StorageModule.getClients(),
            ]);

            columns = columnsData;
            tasks = tasksData;
            users = usersData;
            clients = clientsData;
            const currentSignature = buildDataSignature(columnsData, tasksData, usersData, clientsData);
            lastLoadHadChanges = currentSignature !== lastDataSignature;
            lastDataSignature = currentSignature;

            // Aplicar filtros apàs carregar dados
            applyFiltersToTasks();

            if (!silent) {
                UtilsModule.hideLoading();
            }
            return [columns, tasks, users, clients];
        } catch (error) {
            if (!silent) {
                UtilsModule.hideLoading();
            }
            lastLoadHadChanges = false;
            UtilsModule.handleApiError(error, 'carregar dados do board');
            return [[], [], [], []];
        }
    };

    const renderBoard = async (options = {}) => {
        const {
            reloadData = true,
            silentLoad = false,
        } = options;
        if (!taskBoard) return;

        try {
            if (reloadData) {
                await loadData({ silent: silentLoad });
            }
            taskBoard.innerHTML = "";

            columns.forEach((column) => {
                const columnElement = createColumnElement(column);
                taskBoard.appendChild(columnElement);
            });
        } catch (error) {
            UtilsModule.handleApiError(error, 'renderizar board');
        }
    };

    const renderSociousView = async (options = {}) => {
        const {
            reloadData = true,
            showTableLoading = true,
            silentLoad = false,
        } = options;
        if (!sociousTableBody) return;

        try {
            // Mostrar estado de carregamento na tabela
            const visibleColumnsCount = getTableColumnsOrder().length;
            renderSociousTableHeader();

            if (showTableLoading) {
                sociousTableBody.innerHTML = `
                    <tr class="loading-row">
                        <td colspan="${visibleColumnsCount}">Carregando tarefas...</td>
                    </tr>
                `;
            }

            if (reloadData) {
                await loadData({ silent: silentLoad });
            }
            sociousTableBody.innerHTML = "";

            if (filteredTasks.length === 0) {
                sociousTableBody.innerHTML = `
                    <tr>
                        <td colspan="${visibleColumnsCount}" style="text-align: center; padding: 30px; color: #6c757d;">
                            🥳 Nenhuma tarefa encontrada.
                        </td>
                    </tr>
                `;
                return;
            }

            filteredTasks.forEach((task) => {
                const row = createTableRow(task);
                sociousTableBody.appendChild(row);
            });

            setupTableSorting();
        } catch (error) {
            UtilsModule.handleApiError(error, 'renderizar visualização de tabela');
            sociousTableBody.innerHTML = `
                <tr>
                    <td colspan="${getTableColumnsOrder().length}" style="text-align: center; padding: 30px; color: #dc3545;">
                        Erro ao carregar tarefas.
                    </td>
                </tr>
            `;
        }
    };

    // ========== FUNÇÕES AUXILIARES ========== //

    const createColumnElement = (column) => {
        const columnElement = document.createElement("div");
        columnElement.className = "column";
        columnElement.dataset.columnId = column.id;

        const safeColumnTitle = escapeHtml(column.title || "Sem coluna");
        const columnHeader = document.createElement("div");
        columnHeader.className = "column-header";
        columnHeader.innerHTML = `
            <span>${safeColumnTitle}</span>
            <span class="task-count">${getTasksByColumn(column.id).length}</span>
        `;

        const columnContent = document.createElement("div");
        columnContent.className = "column-content";

        const columnTasks = getTasksByColumn(column.id);
        if (columnTasks.length === 0) {
            columnContent.innerHTML = `
                <div class="empty-column">
                    <p>🥳 Nenhuma tarefa</p>
                </div>
            `;
        } else {
            columnTasks.forEach((task) => {
                const taskElement = createTaskElement(task);
                columnContent.appendChild(taskElement);
            });
        }

        const addButton = document.createElement("button");
        addButton.className = "add-task-btn";
        addButton.innerHTML = '<i class="fas fa-plus"></i> Adicionar tarefa';
        addButton.disabled = !boardPermissions.create;
        addButton.addEventListener("click", () => {
            if (!ensureBoardPermission('create', 'Você não tem permissão para criar tarefas.')) return;
            ModalModule.showModal(column.id);
        });

        columnContent.appendChild(addButton);
        setupColumnDragDrop(columnContent, column.id);

        columnElement.appendChild(columnHeader);
        columnElement.appendChild(columnContent);
        return columnElement;
    };

    const createTaskElement = (task) => {
        const taskElement = document.createElement("div");
        taskElement.className = "task";
        taskElement.draggable = true;
        taskElement.dataset.taskId = task.id;

        const assignee = users.find((u) => String(u.id) === String(task.assignee));
        const statusInfo = UtilsModule.getStatusText(task.status);
        const priorityInfo = UtilsModule.getPriorityText(task.priority);
        const typeInfo = UtilsModule.getTypeText(task.type);

        const taskRefLabel = formatTaskRefLabel(task);
        const safeTitle = escapeHtml(task.title || "Sem título");
        const hasAttachment = Boolean(task.attachment_name);
        const pinActiveClass = task.is_pinned ? 'active' : '';
        const pinTitle = task.is_pinned ? 'Remover do post-it' : 'Destacar no post-it';
        const safeAssigneeName = escapeHtml(assignee ? assignee.name : "Não atribuído");
        const clientLabel = getClientLabelForTask(task.client) || "Sem cliente";
        const clientDisplayLabel = clientLabel === '-' ? 'Sem cliente' : clientLabel;
        const safeClient = escapeHtml(clientDisplayLabel);
        const safeClientTooltip = escapeHtml(getClientTooltipForTask(task.client, clientDisplayLabel));
        const assigneeAvatarHtml = renderAssigneeAvatarHtml(assignee || { name: "Não atribuído" });

        taskElement.style.setProperty('--task-left-accent', typeInfo.color || '#dfe5ee');

        taskElement.innerHTML = `
            <div class="task-layout">
                <div class="task-left-stack">
                    ${assigneeAvatarHtml}
                    <span class="task-icon-badge" style="${priorityInfo.style}" title="Prioridade: ${priorityInfo.text}">
                        <i class="${priorityInfo.icon}"></i>
                    </span>
                    <span class="task-icon-badge" style="${typeInfo.style}" title="Tipo: ${typeInfo.text}">
                        <i class="${typeInfo.icon}"></i>
                    </span>
                </div>
                <div class="task-main">
                    <div class="task-title-row">
                        <div class="task-title">${safeTitle}</div>
                        <div class="task-top-actions">
                            <button class="board-pin-toggle-btn ${pinActiveClass}" data-task-id="${task.id}" title="${pinTitle}" aria-label="${pinTitle}">
                                <i class="fas fa-thumbtack"></i>
                            </button>
                            ${hasAttachment ? '<span class="task-side-icon" title="Tarefa com anexo"><i class="fas fa-paperclip task-attachment-icon"></i></span>' : ''}
                        </div>
                    </div>
                    <div class="task-meta-row">
                        <span class="task-meta-pill" title="${safeClientTooltip}">${safeClient}</span>
                        <span class="task-meta-pill task-meta-status">${statusInfo.text}</span>
                    </div>
                </div>
            </div>
        `;

        setupTaskDragDrop(taskElement, task.id);
        setupTaskClick(taskElement, task.id);

        const boardPinBtn = taskElement.querySelector(".board-pin-toggle-btn");
        if (boardPinBtn) {
            boardPinBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (!ensureBoardPermission('pin', 'Você não tem permissão para alterar destaque das tarefas.')) return;
                await toggleTaskPinned(task.id, !Boolean(task.is_pinned));
            });
        }

        return taskElement;
    };

    const createTableRow = (task) => {
        const assignee = users.find((u) => String(u.id) === String(task.assignee));
        const statusInfo = UtilsModule.getStatusText(task.status);
        const priorityInfo = UtilsModule.getPriorityText(task.priority);
        const typeInfo = UtilsModule.getTypeText(task.type);
        const isTitleOnlyMode = Boolean(sociousView?.classList.contains("title-only-mode"));

        const row = document.createElement("tr");
        const dataAttribute = getDateAttribute(task.due_date);
        const safeTitle = escapeHtml(task.title || "Sem título");
        const hasAttachment = Boolean(task.attachment_name);
        const pinActiveClass = task.is_pinned ? 'active' : '';
        const pinTitle = task.is_pinned ? 'Remover do post-it' : 'Destacar no post-it';
        const safeAssigneeName = escapeHtml(assignee ? assignee.name : "Não atribuído");
        const safeClient = escapeHtml(getClientLabelForTask(task.client));

        const cellByKey = {
            pin: `
                <td data-col="pin">
                    <button class="pin-toggle-btn ${pinActiveClass}" data-task-id="${task.id}" title="${pinTitle}" aria-label="${pinTitle}">
                        <i class="fas fa-thumbtack"></i>
                    </button>
                </td>
            `,
            title: `
                <td data-col="title">
                    <div class="table-title-with-pin">
                        <button class="title-pin-toggle-btn ${pinActiveClass}" data-task-id="${task.id}" title="${pinTitle}" aria-label="${pinTitle}">
                            <i class="fas fa-thumbtack"></i>
                        </button>
                        ${
                            isTitleOnlyMode
                                ? `
                                    <span class="table-title-text">
                                        <span class="table-title-icons">
                                            ${renderAssigneeAvatarHtml(assignee || { name: "Não atribuído" })}
                                            <span class="task-icon-badge" style="${priorityInfo.style}" title="Prioridade: ${priorityInfo.text}">
                                                <i class="${priorityInfo.icon}"></i>
                                            </span>
                                            <span class="task-icon-badge" style="${typeInfo.style}" title="Tipo: ${typeInfo.text}">
                                                <i class="${typeInfo.icon}"></i>
                                            </span>
                                        </span>
                                        ${safeTitle}${hasAttachment ? ' <i class="fas fa-paperclip" title="Tarefa com anexo"></i>' : ''}
                                    </span>
                                `
                                : `<span class="table-title-text">${safeTitle}${hasAttachment ? ' <i class="fas fa-paperclip" title="Tarefa com anexo"></i>' : ''}</span>`
                        }
                    </div>
                </td>
            `,
            assignee: `<td data-col="assignee">${safeAssigneeName}</td>`,
            request_date: `<td data-col="request_date">${UtilsModule.formatDate(task.request_date)}</td>`,
            due_date: `<td data-col="due_date" ${dataAttribute}>${UtilsModule.formatDate(task.due_date)}</td>`,
            status: `<td data-col="status" class="status-${statusInfo.class}">${statusInfo.text}</td>`,
            priority: `<td data-col="priority" class="prioridade-${priorityInfo.class}" style="${priorityInfo.style}"><i class="${priorityInfo.icon}"></i> ${priorityInfo.text}</td>`,
            client: `<td data-col="client">${safeClient}</td>`,
            type: `<td data-col="type" class="tipo-${typeInfo.class}" style="${typeInfo.style}"><i class="${typeInfo.icon}"></i> ${typeInfo.text}</td>`,
            actions: `
                <td data-col="actions">
                    <button class="action-btn row-edit-btn" data-task-id="${task.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `,
        };

        row.innerHTML = getTableColumnsOrder()
            .map((key) => cellByKey[key] || "")
            .join("");

        const widthByKey = getTableColumnsWidths();
        const cells = row.querySelectorAll("td[data-col]");
        cells.forEach((cell) => {
            const colKey = cell.dataset.col;
            const width = widthByKey[colKey];
            if (!width) return;
            const widthPx = `${width}px`;
            cell.style.width = widthPx;
            cell.style.minWidth = widthPx;
            cell.style.maxWidth = widthPx;
        });

        setupRowEvents(row, task.id);
        return row;
    };

    // Aplicar filtros
    const applyFiltersToTasks = () => {
        try {
            if (typeof FilterModule !== 'undefined' && typeof FilterModule.filterTasks === 'function') {
                filteredTasks = FilterModule.filterTasks(tasks);
            } else {
                filteredTasks = [...tasks];
            }
        } catch (error) {
            console.error('Erro ao aplicar filtros nas tarefas:', error);
            filteredTasks = [...tasks];
        }

        if (typeof SortModule !== 'undefined' && typeof SortModule.sortTasks === 'function') {
            filteredTasks = SortModule.sortTasks(filteredTasks);
        }

        if (titleQuickSearchTerm) {
            const searchTerm = String(titleQuickSearchTerm).toLowerCase();
            filteredTasks = filteredTasks.filter((task) => {
                const taskTitle = String(task?.title || '').toLowerCase();
                return taskTitle.includes(searchTerm);
            });
        }
    };

    // ========== CONFIGURAÇÕES DE EVENTOS ========== //

    const setupRowEvents = (row, taskId) => {
        const btn = row.querySelector(".row-edit-btn");
        if (btn) {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (!ensureBoardPermission('edit', 'Você não tem permissão para editar tarefas.')) return;
                openTaskModalFallback(taskId);
            });
        }

        const pinBtn = row.querySelector(".pin-toggle-btn");
        const titlePinBtn = row.querySelector(".title-pin-toggle-btn");
        const pinCell = row.querySelector('td[data-col="pin"]');
        if (pinBtn) {
            pinBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (!ensureBoardPermission('pin', 'Você não tem permissão para alterar destaque das tarefas.')) return;
                const task = tasks.find((item) => String(item.id) === String(taskId));
                if (!task) return;
                await toggleTaskPinned(taskId, !Boolean(task.is_pinned));
            });
        }

        if (pinCell && pinBtn) {
            pinCell.addEventListener("click", (e) => {
                e.stopPropagation();
                // Se clicou fora do botão, aciona o toggle mesmo assim
                if (!e.target.closest(".pin-toggle-btn")) {
                    pinBtn.click();
                }
            });
        }

        if (titlePinBtn) {
            titlePinBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (!ensureBoardPermission('pin', 'Você não tem permissão para alterar destaque das tarefas.')) return;
                const task = tasks.find((item) => String(item.id) === String(taskId));
                if (!task) return;
                await toggleTaskPinned(taskId, !Boolean(task.is_pinned));
            });
        }

        row.addEventListener("click", (e) => {
            if (e.target.closest("button") || e.target.closest(".pin-toggle-btn") || e.target.closest('td[data-col="pin"]')) return;
            if (!ensureBoardPermission('edit', 'Você não tem permissão para editar tarefas.')) return;
            openTaskModalFallback(taskId);
        });
    };

    // Função fallback melhorada para abrir modal
    const openTaskModalFallback = async (taskRef) => {
        if (!ensureBoardPermission('edit', 'Você não tem permissão para editar tarefas.')) return;
        console.log('Abrindo modal para tarefa:', taskRef, '(id)');

        try {
            UtilsModule.showLoading('Carregando tarefa...');

            // Buscar tarefa específica do Supabase
            let query = window.dbClient
                .from('tasks')
                .select('*');

            query = query.eq('id', taskRef);

            const { data: task, error } = await query.single();

            if (error) throw error;
            if (!task) throw new Error('Tarefa não encontrada');

            UtilsModule.hideLoading();

            // USAR A FUNÇÃO DO MODALMODULE EM VEZ DE MANIPULAR DIRETAMENTE
            if (typeof ModalModule !== 'undefined' && ModalModule.showModal) {
                ModalModule.showModal(null, task.id);
            } else {
                console.error('ModalModule não disponível');
                alert('Módulo de modal não carregado');
            }

        } catch (error) {
            UtilsModule.hideLoading();
            console.error('Erro ao abrir modal:', error);
            alert('Erro ao carregar tarefa: ' + error.message);
        }
    };

    // Função para atualizar conclusão da tarefa
    const updateTaskCompletion = async (taskId, completed) => {
        try {
            await StorageModule.updateTask(taskId, {
                completed: completed,
                status: completed ? 'completed' : 'pending'
            });

            // Atualizar interface
            window.dispatchEvent(new CustomEvent('tasksUpdated'));

        } catch (error) {
            console.error('Erro ao atualizar status da tarefa:', error);
        }
    };

    const setupTableSorting = () => {
        setTimeout(() => {
            if (typeof TableSortModule !== "undefined" && TableSortModule.setupColumnSorting) {
                TableSortModule.setupColumnSorting();
            }
        }, 100);
    };

    // Função para eventos de filtro
    const setupFilterListeners = () => {
        window.addEventListener('filtersApplied', async () => {
            await loadData({ silent: true });
            applyFiltersToTasks();

            const boardHidden = taskBoard ? (getComputedStyle(taskBoard).display === "none") : true;
            if (!boardHidden) {
                renderBoard({ reloadData: false });
            } else {
                renderSociousView({ reloadData: false, showTableLoading: false });
            }
        });

        window.addEventListener('sortsApplied', async () => {
            await loadData({ silent: true });
            applyFiltersToTasks();

            const boardHidden = taskBoard ? (getComputedStyle(taskBoard).display === "none") : true;
            if (!boardHidden) {
                renderBoard({ reloadData: false });
            } else {
                renderSociousView({ reloadData: false, showTableLoading: false });
            }
        });
    };

    // ========== UTILITÁRIAS ========== //

    const getTasksByColumn = (columnId) => {
        return filteredTasks.filter((task) => {
            return String(task.board_column_id) === String(columnId);
        });
    };

    const getDateAttribute = (dueDate) => {
        if (!dueDate) return '';
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
        if (due < today) return 'data-vencida="true"';
        if (due.getTime() === today.getTime()) return 'data-hoje="true"';
        return 'data-futura="true"';
    };

    const getTableColumnsOrder = () => {
        try {
            const raw = localStorage.getItem(TABLE_COLUMNS_ORDER_KEY);
            if (!raw) return [...DEFAULT_TABLE_COLUMNS_ORDER];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [...DEFAULT_TABLE_COLUMNS_ORDER];
            const valid = parsed.filter((key) => DEFAULT_TABLE_COLUMNS_ORDER.includes(key));
            const missing = DEFAULT_TABLE_COLUMNS_ORDER.filter((key) => !valid.includes(key));
            return [...valid, ...missing];
        } catch (_error) {
            return [...DEFAULT_TABLE_COLUMNS_ORDER];
        }
    };

    const getClientLabelForTask = (taskClientValue) => {
        const raw = String(taskClientValue || '').trim();
        if (!raw) return '-';

        const byAcronym = clients.find((client) => String(client.acronym || '').trim().toLowerCase() === raw.toLowerCase());
        if (byAcronym) return String(byAcronym.acronym || byAcronym.name || raw);

        const byName = clients.find((client) => String(client.name || '').trim().toLowerCase() === raw.toLowerCase());
        if (byName) {
            const acronym = String(byName.acronym || '').trim();
            return acronym || String(byName.name || raw);
        }

        return raw;
    };

    const getClientTooltipForTask = (taskClientValue, fallbackLabel = '') => {
        const raw = String(taskClientValue || '').trim();
        if (!raw) return 'Sem cliente';

        const byAcronym = clients.find((client) => String(client.acronym || '').trim().toLowerCase() === raw.toLowerCase());
        if (byAcronym) {
            const name = String(byAcronym.name || '').trim();
            const acronym = String(byAcronym.acronym || '').trim();
            if (name && acronym) return `${acronym} - ${name}`;
            return name || acronym || fallbackLabel || raw;
        }

        const byName = clients.find((client) => String(client.name || '').trim().toLowerCase() === raw.toLowerCase());
        if (byName) {
            const name = String(byName.name || '').trim();
            const acronym = String(byName.acronym || '').trim();
            if (name && acronym) return `${acronym} - ${name}`;
            return name || acronym || fallbackLabel || raw;
        }

        return fallbackLabel || raw;
    };

    const getInitials = (name) => {
        const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return 'NA';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
    };

    const normalizeAvatarColor = (value) => {
        const color = String(value || '').trim();
        return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#3498db';
    };

    const normalizeAvatarIcon = (value) => {
        const icon = String(value || '').trim().toLowerCase();
        const allowed = new Set(['user', 'user-tie', 'headset', 'briefcase', 'screwdriver-wrench', 'chart-line']);
        return allowed.has(icon) ? icon : '';
    };

    const renderAssigneeAvatarHtml = (user) => {
        const name = user?.name || 'Não atribuído';
        const initials = escapeHtml(getInitials(name));
        const color = normalizeAvatarColor(user?.avatar_color);
        const icon = normalizeAvatarIcon(user?.avatar_icon);
        if (icon) {
            return `<span class="task-assignee-avatar" style="background:${escapeHtml(color)};" title="${escapeHtml(name)}"><i class="fas fa-${icon}"></i></span>`;
        }
        return `<span class="task-assignee-avatar" style="background:${escapeHtml(color)};" title="${escapeHtml(name)}">${initials}</span>`;
    };

    const formatTaskRefLabel = (task) => {
        const rawId = String(task?.id || '').trim();
        if (!rawId) return '#-';
        return `#${rawId}`;
    };

    const getTableColumnsWidths = () => {
        try {
            const raw = localStorage.getItem(TABLE_COLUMNS_WIDTHS_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            const safeParsed = parsed && typeof parsed === "object" ? parsed : {};
            const normalized = {};

            DEFAULT_TABLE_COLUMNS_ORDER.forEach((key) => {
                const fallback = DEFAULT_TABLE_COLUMNS_WIDTHS[key] || 120;
                const candidate = Number(safeParsed[key]);
                normalized[key] = Number.isFinite(candidate)
                    ? Math.max(TABLE_COLUMN_MIN_WIDTH, Math.min(900, Math.round(candidate)))
                    : fallback;
            });

            return normalized;
        } catch (_error) {
            return { ...DEFAULT_TABLE_COLUMNS_WIDTHS };
        }
    };

    const renderSociousTableHeader = () => {
        if (!sociousTableHeadRow) return;
        const headerByKey = {
            pin: "Pin",
            title: "Título",
            assignee: "Responsável",
            request_date: "Data Solicitação",
            due_date: "Data Entrega",
            status: "Status",
            priority: "Prioridade",
            client: "Cliente",
            type: "Tipo",
            actions: "Ações",
        };

        const widthByKey = getTableColumnsWidths();

        sociousTableHeadRow.innerHTML = "";
        getTableColumnsOrder().forEach((key) => {
            const th = document.createElement("th");
            th.textContent = headerByKey[key] || key;
            th.dataset.col = key;
            if (widthByKey[key]) {
                const widthPx = `${widthByKey[key]}px`;
                th.style.width = widthPx;
                th.style.minWidth = widthPx;
                th.style.maxWidth = widthPx;
            }
            sociousTableHeadRow.appendChild(th);
        });
    };

    const getStatusFromColumnId = async (columnId) => {
        try {
            const currentColumns = await StorageModule.getColumns();
            const column = currentColumns.find(c => String(c.id) === String(columnId));
            if (column?.type) return column.type;
            if (column?.status) return column.status;
            return 'pending';
        } catch (error) {
            console.error('Erro ao buscar status da coluna:', error);
            return 'pending';
        }
    };

    const moveTaskToColumn = async (taskId, columnId) => {
        if (!ensureBoardPermission('move', 'Você não tem permissão para mover tarefas.')) return false;
        try {
            const status = await getStatusFromColumnId(columnId);
            await StorageModule.updateTask(taskId, { board_column_id: columnId, status: status });
            await loadData();
            window.dispatchEvent(new CustomEvent('tasksUpdated'));
            return true;
        } catch (error) {
            console.error('Erro ao mover tarefa:', error);
            return false;
        }
    };

    // ========== FUNÇÕES DRAG & DROP ========== //

    const setupTaskDragDrop = (taskElement, taskId) => {
        taskElement.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("taskId", taskId);
            taskElement.classList.add("dragging");

            // Adicionar efeito visual durante o drag
            setTimeout(() => {
                taskElement.style.opacity = "0.4";
            }, 0);
        });

        taskElement.addEventListener("dragend", () => {
            taskElement.classList.remove("dragging");
            taskElement.style.opacity = "1";
        });

        taskElement.addEventListener("drag", (e) => {
            // Prevenir comportamento padrão
            e.preventDefault();
        });
    };

    const setupColumnDragDrop = (columnContent, columnId) => {
        columnContent.addEventListener("dragover", (e) => {
            e.preventDefault();
            // Efeito visual durante o dragover
            columnContent.style.backgroundColor = "#f8f9fa";
        });

        columnContent.addEventListener("dragleave", () => {
            // Restaurar cor original
            columnContent.style.backgroundColor = "";
        });

        columnContent.addEventListener("drop", async (e) => {
            e.preventDefault();
            columnContent.style.backgroundColor = "";
            if (!ensureBoardPermission('move', 'Você não tem permissão para mover tarefas.')) return;

            const taskId = e.dataTransfer.getData("taskId");
            if (taskId) {
                await moveTaskToColumn(taskId, columnId);
                renderBoard();
            }
        });
    };

    const setupTaskClick = (taskElement, taskId) => {
        taskElement.addEventListener("click", (e) => {
            // Só abre o modal se não foi um clique em elementos interiores
            if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                if (!ensureBoardPermission('edit', 'Você não tem permissão para editar tarefas.')) return;
                openTaskModalFallback(taskId);
            }
        });
    };

    // ========== CONTROLES DE VISUALIZAÇÃO ========== //

    const setActiveViewButton = (mode) => {
        if (boardViewBtn) boardViewBtn.classList.toggle("active", mode === "board");
        if (sociousViewBtn) sociousViewBtn.classList.toggle("active", mode === "socious");
        if (titleOnlyViewBtn) titleOnlyViewBtn.classList.toggle("active", mode === "title_only");
    };

    const persistViewMode = (mode) => {
        try {
            localStorage.setItem(VIEW_MODE_KEY, mode);
        } catch (error) {
            console.warn("Não foi possível salvar o modo de visualização:", error);
        }
    };

    const toggleTaskPinned = async (taskId, isPinned) => {
        try {
            await StorageModule.updateTask(taskId, {
                is_pinned: Boolean(isPinned),
            });

            window.dispatchEvent(new CustomEvent('tasksUpdated'));
        } catch (error) {
            console.error('Erro ao atualizar destaque da tarefa:', error);
        }
    };

    const getSavedViewMode = () => {
        try {
            const saved = localStorage.getItem(VIEW_MODE_KEY);
            if (saved === "board" || saved === "socious" || saved === "title_only") {
                return saved;
            }
        } catch (error) {
            console.warn("Não foi possível recuperar o modo de visualização:", error);
        }
        return "board";
    };

    const applySociousMode = (isTitleOnly) => {
        if (!sociousView) return;
        sociousView.classList.toggle("title-only-mode", isTitleOnly);
    };

    const showBoardView = () => {
        if (!taskBoard || !sociousView) return;
        taskBoard.style.display = "flex";
        sociousView.style.display = "none";
        applySociousMode(false);
        setActiveViewButton("board");
        persistViewMode("board");
        renderBoard({ reloadData: true, silentLoad: true });
    };

    const showSociousView = () => {
        if (!taskBoard || !sociousView) return;
        taskBoard.style.display = "none";
        sociousView.style.display = "block";
        applySociousMode(false);
        setActiveViewButton("socious");
        persistViewMode("socious");
        renderSociousView({ reloadData: true, showTableLoading: false, silentLoad: true });
    };

    const showTitleOnlyView = () => {
        if (!taskBoard || !sociousView) return;
        taskBoard.style.display = "none";
        sociousView.style.display = "block";
        applySociousMode(true);
        setActiveViewButton("title_only");
        persistViewMode("title_only");
        renderSociousView({ reloadData: true, showTableLoading: false, silentLoad: true });
    };

    // ========== INICIALIZAÇÃO ========== //

    const initBoard = async () => {
        if (!taskBoard && !sociousView) return;

        if (isInitialized || isInitializing) {
            return;
        }

        isInitializing = true;

        try {
            await loadBoardPermissions();
            if (!boardPermissions.view) {
                ensureBoardPermission('view', 'Você não tem permissão para visualizar o quadro de tarefas.');
                return;
            }
            await loadData({ silent: true });
            setupEventListeners();
            setupFilterListeners();
            const initialMode = getSavedViewMode();
            if (initialMode === "title_only") {
                showTitleOnlyView();
            } else if (initialMode === "socious") {
                showSociousView();
            } else {
                showBoardView();
            }
            openTaskFromQueryString();
            setupAutoRefresh();
            isInitialized = true;
        } catch (error) {
            console.error('Erro na inicialização do board:', error);
        } finally {
            isInitializing = false;
        }
    };

    const setupEventListeners = () => {
        if (boardViewBtn) boardViewBtn.addEventListener("click", showBoardView);
        if (sociousViewBtn) sociousViewBtn.addEventListener("click", showSociousView);
        if (titleOnlyViewBtn) titleOnlyViewBtn.addEventListener("click", showTitleOnlyView);
        if (addTaskSocious) {
            addTaskSocious.disabled = !boardPermissions.create;
            addTaskSocious.addEventListener("click", () => {
                if (!ensureBoardPermission('create', 'Você não tem permissão para criar tarefas.')) return;
                const pendingColumn = columns.find(col => col.type === 'pending');
                ModalModule.showModal(pendingColumn ? pendingColumn.id : null);
            });
        }

        if (titleQuickSearchInput) {
            titleQuickSearchInput.addEventListener("input", () => {
                titleQuickSearchTerm = String(titleQuickSearchInput.value || '').trim();
                applyFiltersToTasks();
                renderSociousView({ reloadData: false, showTableLoading: false });
            });
        }

        window.addEventListener("tasksUpdated", handleTasksUpdated);
        window.addEventListener("pharus:task-taxonomy-icons-updated", rerenderCurrentView);
        window.addEventListener("pharus:task-taxonomy-colors-updated", rerenderCurrentView);
        window.addEventListener("pharus:user-profile-updated", handleTasksUpdated);
        window.addEventListener("pharus:users-updated", handleTasksUpdated);
        window.addEventListener("storage", (event) => {
            if (!event) return;
            if (event.key === "pharus_task_taxonomy_icons" || event.key === "pharus_task_taxonomy_colors") {
                rerenderCurrentView();
            }
        });
    };

    const handleTasksUpdated = async () => {
        await loadData({ silent: true });
        rerenderCurrentView();
    };

    const rerenderCurrentView = () => {
        const boardHidden = taskBoard ? (getComputedStyle(taskBoard).display === "none") : true;
        if (!boardHidden) {
            renderBoard({ reloadData: false });
        } else {
            renderSociousView({ reloadData: false, showTableLoading: false });
        }
    };

    const setupAutoRefresh = () => {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
        }

        autoRefreshInterval = setInterval(async () => {
            await loadData({ silent: true });
            if (!lastLoadHadChanges) {
                return;
            }

            if (taskBoard && getComputedStyle(taskBoard).display !== "none") {
                renderBoard({ reloadData: false });
            } else if (sociousView && getComputedStyle(sociousView).display !== "none") {
                renderSociousView({ reloadData: false, showTableLoading: false });
            }
        }, 50000);
    };

    const openTaskFromQueryString = () => {
        if (queryTaskHandled) return;

        const params = new URLSearchParams(window.location.search);
        const taskId = params.get('taskId');
        if (!taskId) return;

        queryTaskHandled = true;
        setTimeout(() => {
            openTaskModalFallback(taskId);
        }, 200);
    };

    const escapeHtml = (value) => {
        return UtilsModule.escapeHtml(String(value ?? ''));
    };

    // ========== API PUBLICA ========== //
    return {
        initBoard,
        renderBoard,
        renderSociousView,
        showBoardView,
        showSociousView,
        showTitleOnlyView,
    };
})();

// Inicializar o modulo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', BoardModule.initBoard);
} else {
    BoardModule.initBoard();
}








