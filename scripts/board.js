// board.js — VERSÃO AJUSTADA (mantém estrutura original, dropdown robusto)

const BoardModule = (() => {
    // Elementos do DOM
    const taskBoard = document.getElementById("taskBoard");
    const sociousView = document.getElementById("sociousView");
    const sociousTableBody = document.getElementById("sociousTableBody");
    const boardViewBtn = document.getElementById("boardViewBtn");
    const sociousViewBtn = document.getElementById("sociousViewBtn");
    const addTaskSocious = document.getElementById("addTaskSocious");

    // Dados
    let tasks = [];
    let columns = [];
    let users = [];
    let dropdownInitialized = false;

    // ========== FUNÇÕES PRINCIPAIS ========== //

    const loadData = async () => {
        try {
            UtilsModule.showLoading('Carregando dados...');

            const [columnsData, tasksData, usersData] = await Promise.all([
                StorageModule.getColumns(),
                StorageModule.getTasks(),
                StorageModule.getUsers()
            ]);

            columns = columnsData;
            tasks = tasksData;
            users = usersData;

            UtilsModule.hideLoading();
            return [columns, tasks, users];
        } catch (error) {
            UtilsModule.hideLoading();
            UtilsModule.handleApiError(error, 'carregar dados do board');
            return [[], [], []];
        }
    };

    const renderBoard = async () => {
        if (!taskBoard) return;

        try {
            await loadData();
            taskBoard.innerHTML = "";

            columns.forEach((column) => {
                const columnElement = createColumnElement(column);
                taskBoard.appendChild(columnElement);
            });
        } catch (error) {
            UtilsModule.handleApiError(error, 'renderizar board');
        }
    };

    const renderSociousView = async () => {
        if (!sociousTableBody) return;

        try {
            // Mostrar estado de carregamento na tabela
            sociousTableBody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="10">Carregando tarefas...</td>
                </tr>
            `;

            await loadData();
            sociousTableBody.innerHTML = "";

            if (tasks.length === 0) {
                sociousTableBody.innerHTML = `
                    <tr>
                        <td colspan="10" style="text-align: center; padding: 30px; color: #6c757d;">
                            Nenhuma tarefa encontrada.
                        </td>
                    </tr>
                `;
                return;
            }

            tasks.forEach((task) => {
                const row = createTableRow(task);
                sociousTableBody.appendChild(row);
            });

            setupTableSorting();
        } catch (error) {
            UtilsModule.handleApiError(error, 'renderizar visualização de tabela');
            sociousTableBody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 30px; color: #dc3545;">
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

        const columnHeader = document.createElement("div");
        columnHeader.className = "column-header";
        columnHeader.innerHTML = `
            <span>${column.title}</span>
            <span>${getTasksByColumn(column.id).length}</span>
        `;

        const columnContent = document.createElement("div");
        columnContent.className = "column-content";

        getTasksByColumn(column.id).forEach((task) => {
            const taskElement = createTaskElement(task);
            columnContent.appendChild(taskElement);
        });

        const addButton = document.createElement("button");
        addButton.className = "add-task-btn";
        addButton.innerHTML = '<i class="fas fa-plus"></i> Adicionar tarefa';
        addButton.addEventListener("click", () => {
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

        const priorityClass = `tag-priority-${priorityInfo.class}`;
        const typeClass = `tag-type-${typeInfo.class}`;

        taskElement.innerHTML = `
            <div class="task-title">${task.title}</div>
            <div class="task-tags">
                <span class="task-tag tag-status">${statusInfo.text}</span>
                <span class="task-tag ${priorityClass}">${priorityInfo.text}</span>
                <span class="task-tag ${typeClass}">${typeInfo.text}</span>
            </div>
            <div class="task-meta">
                <span class="task-assignee">${assignee ? assignee.name : "Não atribuído"}</span>
                <span class="task-client">${task.client || "Sem cliente"}</span>
                <span class="task-due-date">${UtilsModule.formatDate(task.due_date)}</span>
            </div>
        `;

        setupTaskDragDrop(taskElement, task.id);
        setupTaskClick(taskElement, task.id);
        return taskElement;
    };

    const createTableRow = (task) => {
        const assignee = users.find((u) => String(u.id) === String(task.assignee));
        const statusInfo = UtilsModule.getStatusText(task.status);
        const priorityInfo = UtilsModule.getPriorityText(task.priority);
        const typeInfo = UtilsModule.getTypeText(task.type);

        const row = document.createElement("tr");
        const dataAttribute = getDateAttribute(task.due_date);

        row.innerHTML = `
            <td>
                <label class="checkbox-container">
                    <div class="custom-checkbox"></div>
                </label>
            </td>
            <td>${task.title}</td>
            <td>${assignee ? assignee.name : "Não atribuído"}</td>
            <td>${UtilsModule.formatDate(task.request_date)}</td>
            <td ${dataAttribute}>${UtilsModule.formatDate(task.due_date)}</td>
            <td class="status-${statusInfo.class}">${statusInfo.text}</td>
            <td class="prioridade-${priorityInfo.class}">${priorityInfo.text}</td>
            <td>${task.client || "-"}</td>
            <td class="tipo-${typeInfo.class}">${typeInfo.text}</td>
            <td>
                <button class="action-btn" data-task-id="${task.id}">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;

        setupRowEvents(row, task.id);
        return row;
    };

    // ========== CONFIGURAÇÕES DE EVENTOS ========== //

    const setupRowEvents = (row, taskId) => {
        const btn = row.querySelector("button");
        if (btn) {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                openTaskModalFallback(taskId);
            });
        }

        const checkbox = row.querySelector(".custom-checkbox");
        if (checkbox) {
            checkbox.addEventListener("click", (e) => {
                e.stopPropagation();
                checkbox.classList.toggle("checked");
                updateTaskCompletion(taskId, checkbox.classList.contains("checked"));
            });
        }
    };

    // Função fallback melhorada para abrir modal
    const openTaskModalFallback = async (taskId) => {
        console.log('Abrindo modal para tarefa:', taskId);

        try {
            UtilsModule.showLoading('Carregando tarefa...');

            // Buscar tarefa específica do Supabase
            const { data: task, error } = await window.supabaseClient
                .from('tasks')
                .select('*')
                .eq('id', taskId)
                .single();

            if (error) throw error;
            if (!task) throw new Error('Tarefa não encontrada');

            UtilsModule.hideLoading();

            // USAR A FUNÇÃO DO MODALMODULE EM VEZ DE MANIPULAR DIRETAMENTE
            ModalModule.showModal(null, taskId);

        } catch (error) {
            UtilsModule.hideLoading();
            UtilsModule.handleApiError(error, 'carregar tarefa para edição');
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

    // ========== DROPDOWN DO USUÁRIO (UNIFICADO E ROBUSTO) ========== //

    const initUserDropdown = () => {
        if (dropdownInitialized) return;
        dropdownInitialized = true;

        const userInfo = document.querySelector(".user-info");
        const userMenu = document.getElementById("userMenu");
        const userDropdown = document.getElementById("userDropdown");

        if (!userInfo || !userMenu || !userDropdown) {
            console.error("initUserDropdown: elementos do dropdown não encontrados (verifique IDs/classes).");
            return;
        }

        // inicia fechado
        userMenu.classList.remove("show");
        userInfo.classList.remove("active");

        // Clique no botão seta -> alterna (toggle)
        userDropdown.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = userMenu.classList.contains("show");
            // fechar outros dropdowns na página (se houver)
            document.querySelectorAll(".dropdown-menu.show").forEach(m => {
                if (m !== userMenu) m.classList.remove("show");
            });
            document.querySelectorAll(".user-info.active").forEach(i => {
                if (i !== userInfo) i.classList.remove("active");
            });

            if (isOpen) {
                userMenu.classList.remove("show");
                userInfo.classList.remove("active");
            } else {
                userMenu.classList.add("show");
                userInfo.classList.add("active");
            }
            console.log("userDropdown toggled ->", !isOpen);
        });

        // Opcional: clique no container .user-info também abre (sem toggle duplicado)
        userInfo.addEventListener("click", (e) => {
            // se clicar no botão já tratado, será stopPropagation; aqui abrimos apenas se estiver fechado
            if (!userMenu.classList.contains("show")) {
                userMenu.classList.add("show");
                userInfo.classList.add("active");
                console.log("userInfo clicked -> opened menu");
            }
        });

        // Fechar ao clicar fora
        document.addEventListener("click", (e) => {
            if (!userInfo.contains(e.target)) {
                userMenu.classList.remove("show");
                userInfo.classList.remove("active");
            }
        });

        // Impedir fechamento ao clicar dentro do menu
        userMenu.addEventListener("click", (e) => {
            e.stopPropagation();
            // delegação de itens do menu: usar data-action em cada .dropdown-item
            const item = e.target.closest(".dropdown-item");
            if (item) {
                const action = item.dataset.action || item.id || null;
                if (action) {
                    handleMenuAction(action, userMenu, userInfo);
                } else {
                    // se não tiver action, apenas fecha
                    userMenu.classList.remove("show");
                    userInfo.classList.remove("active");
                }
            }
        });

        console.log("initUserDropdown: inicializado");
    };

    const handleMenuAction = (action, menu, userInfo) => {
        // aqui as ações comuns (adicione o que precisar)
        console.log("handleMenuAction:", action);
        // fechar o menu
        if (menu) menu.classList.remove("show");
        if (userInfo) userInfo.classList.remove("active");

        switch (action) {
            case "profile":
                if (typeof ModalModule !== "undefined" && ModalModule.showProfile) {
                    ModalModule.showProfile();
                } else {
                    // fallback: abrir modal profile se existir id
                    const profileModal = document.getElementById("profileModal");
                    if (profileModal) profileModal.style.display = "block";
                }
                break;
            case "settings":
                UtilsModule.showNotification("Abrir configurações (implemente a ação)", "info");
                break;
            case "logout":
                if (typeof AuthModule !== "undefined" && AuthModule.logout) {
                    AuthModule.logout();
                } else if (typeof StorageModule !== "undefined" && StorageModule.logout) {
                    StorageModule.logout();
                } else {
                    // fallback simples
                    window.location.href = "login.html";
                }
                break;
            default:
                console.warn("Ação do menu não mapeada:", action);
        }
    };

    // ========== UTILITÁRIAS ========== //

    const getTasksByColumn = (columnId) => {
        return tasks.filter((task) => {
            // Converter ambos para string para comparação segura
            return String(task.column_id) === String(columnId);
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

    const getStatusFromColumnId = async (columnId) => {
        try {
            const currentColumns = await StorageModule.getColumns();
            const column = currentColumns.find(c => c.id === columnId);
            if (column && column.status) return column.status;
            const columnTypeMap = { 1: 'pending', 2: 'in_progress', 3: 'review', 4: 'completed' };
            return columnTypeMap[columnId] || 'pending';
        } catch (error) {
            console.error('Erro ao buscar status da coluna:', error);
            return 'pending';
        }
    };

    const moveTaskToColumn = async (taskId, columnId) => {
        try {
            const status = await getStatusFromColumnId(columnId);
            await StorageModule.updateTask(taskId, { column_id: columnId, status: status });
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

            const taskId = e.dataTransfer.getData("taskId");
            if (taskId) {
                await moveTaskToColumn(taskId, columnId);
                renderBoard();
            }
        });

        // Permitir drop em toda a área da coluna
        columnContent.addEventListener("drop", async (e) => {
            e.preventDefault();
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
                openTaskModalFallback(taskId);
            }
        });

        // Adicionar botão de edição dentro do card
        const editBtn = document.createElement('button');
        editBtn.className = 'task-edit-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openTaskModalFallback(taskId);
        });

        // Adicionar o botão ao card da tarefa
        if (!taskElement.querySelector('.task-edit-btn')) {
            taskElement.style.position = 'relative';
            editBtn.style.position = 'absolute';
            editBtn.style.top = '8px';
            editBtn.style.right = '8px';
            editBtn.style.padding = '4px 6px';
            editBtn.style.fontSize = '10px';
            editBtn.style.opacity = '0.7';
            editBtn.style.transition = 'opacity 0.2s';

            editBtn.addEventListener('mouseenter', () => {
                editBtn.style.opacity = '1';
            });

            editBtn.addEventListener('mouseleave', () => {
                editBtn.style.opacity = '0.7';
            });

            taskElement.appendChild(editBtn);
        }
    };

    // ========== CONTROLES DE VISUALIZAÇÃO ========== //

    const showBoardView = () => {
        if (!taskBoard || !sociousView) return;
        taskBoard.style.display = "flex";
        sociousView.style.display = "none";
        if (boardViewBtn && sociousViewBtn) {
            boardViewBtn.classList.add("active");
            sociousViewBtn.classList.remove("active");
        }
        renderBoard();
    };

    const showSociousView = () => {
        if (!taskBoard || !sociousView) return;
        taskBoard.style.display = "none";
        sociousView.style.display = "block";
        if (boardViewBtn && sociousViewBtn) {
            boardViewBtn.classList.remove("active");
            sociousViewBtn.classList.add("active");
        }
        renderSociousView();
    };

    // ========== INICIALIZAÇÃO ========== //

    const initBoard = async () => {
        if (!taskBoard && !sociousView) return;
        try {
            await loadData();
            setupEventListeners();
            initUserDropdown();
            showBoardView();
            setupAutoRefresh();
        } catch (error) {
            console.error('Erro na inicialização do board:', error);
        }
    };

    const setupEventListeners = () => {
        if (boardViewBtn) boardViewBtn.addEventListener("click", showBoardView);
        if (sociousViewBtn) sociousViewBtn.addEventListener("click", showSociousView);
        if (addTaskSocious) {
            addTaskSocious.addEventListener("click", () => {
                const pendingColumn = columns.find(col => col.type === 'pending');
                ModalModule.showModal(pendingColumn ? pendingColumn.id : null);
            });
        }
        window.addEventListener("tasksUpdated", handleTasksUpdated);
    };

    const handleTasksUpdated = async () => {
        await loadData();
        // se o board estiver visível, renderiza; senão renderiza tabela
        const boardHidden = taskBoard ? (getComputedStyle(taskBoard).display === "none") : true;
        if (!boardHidden) {
            renderBoard();
        } else {
            renderSociousView();
        }
    };

    const setupAutoRefresh = () => {
        setInterval(async () => {
            await loadData();
            if (taskBoard && getComputedStyle(taskBoard).display !== "none") {
                renderBoard();
            }
        }, 30000);
    };

    // ========== API PÚBLICA ========== //
    return {
        initBoard,
        renderBoard,
        renderSociousView,
        showBoardView,
        showSociousView,
    };
})();

// Inicializar o módulo
document.addEventListener("DOMContentLoaded", BoardModule.initBoard);
