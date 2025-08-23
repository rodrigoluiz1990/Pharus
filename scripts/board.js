// Módulo do quadro de tarefas
const BoardModule = (() => {
  const taskBoard = document.getElementById("taskBoard");
  const sociousView = document.getElementById("sociousView");
  const sociousTableBody = document.getElementById("sociousTableBody");
  const boardViewBtn = document.getElementById("boardViewBtn");
  const sociousViewBtn = document.getElementById("sociousViewBtn");
  const addTaskSocious = document.getElementById("addTaskSocious");

  // Renderizar o board
  const renderBoard = () => {
    if (!taskBoard) return;

    taskBoard.innerHTML = "";

    const columns = StorageModule.getColumns();
    const users = StorageModule.getUsers();

    columns.forEach((column) => {
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

      // Adicionar tarefas à coluna
      getTasksByColumn(column.id).forEach((task) => {
        const taskElement = createTaskElement(task, users);
        columnContent.appendChild(taskElement);
      });

      // Botão para adicionar nova tarefa
      const addButton = document.createElement("button");
      addButton.className = "add-task-btn";
      addButton.innerHTML = '<i class="fas fa-plus"></i> Adicionar tarefa';
      addButton.addEventListener("click", () => {
        ModalModule.showModal(column.id);
      });

      columnContent.appendChild(addButton);

      // Configurar drag and drop
      columnContent.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      columnContent.addEventListener("drop", (e) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData("taskId");
        moveTaskToColumn(parseInt(taskId), column.id);
        renderBoard();
      });

      columnElement.appendChild(columnHeader);
      columnElement.appendChild(columnContent);
      taskBoard.appendChild(columnElement);
    });
  };

  // Criar elemento de tarefa
  const createTaskElement = (task, users) => {
    const taskElement = document.createElement("div");
    taskElement.className = "task";
    taskElement.draggable = true;
    taskElement.dataset.taskId = task.id;

    const assignee = users.find((u) => u.id === task.assignee);

    // Obter as informações corretamente (agora retornam objetos)
    const statusInfo = UtilsModule.getStatusText(task.status);
    const priorityInfo = UtilsModule.getPriorityText(task.priority);
    const typeInfo = UtilsModule.getTypeText(task.type);

    // Corrigir a classe de prioridade para usar o valor correto
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
            <span class="task-assignee">${assignee ? assignee.name : "Não atribuído"
      }</span>
            <span class="task-client">${task.client || "Sem cliente"}</span>
            <span class="task-due-date">${UtilsModule.formatDate(
        task.dueDate
      )}</span>
        </div>
    `;

    // Configurar drag and drop
    taskElement.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("taskId", task.id);
      taskElement.classList.add("dragging");
    });

    taskElement.addEventListener("dragend", () => {
      taskElement.classList.remove("dragging");
    });

    // Editar tarefa ao clicar
    taskElement.addEventListener("click", () => {
      ModalModule.showModal(null, task.id);
    });

    return taskElement;
  };

  // Obter tarefas por coluna
  const getTasksByColumn = (columnId) => {
    const tasks = StorageModule.getTasks();
    return tasks.filter((task) => task.columnId === columnId);
  };

  // Obter o status correspondente ao ID da coluna
  const getStatusFromColumnId = (columnId) => {
    const columns = StorageModule.getColumns();
    const column = columns.find(c => c.id === columnId);

    if (column) {
      // Mapear o título da coluna para o valor de status correspondente
      switch (column.title) {
        case 'Pendente':
          return 'pending';
        case 'Em Andamento':
          return 'in_progress';
        case 'Em Teste':
          return 'review';
        case 'Concluído':
          return 'completed';
        default:
          return 'pending'; // Valor padrão
      }
    }
    return 'pending'; // Valor padrão se não encontrar a coluna
  };

  // Mover tarefa para outra coluna
  const moveTaskToColumn = (taskId, columnId) => {
    let tasks = StorageModule.getTasks();
    const taskIndex = tasks.findIndex((t) => t.id === taskId);

    if (taskIndex !== -1) {
      tasks[taskIndex].columnId = columnId;
      tasks[taskIndex].status = getStatusFromColumnId(columnId); // Atualizar o status com base na coluna de destino
      StorageModule.saveTasks(tasks);
      return true;
    }
    return false;
  };

  // Renderizar visualização Socíus
  const renderSociousView = () => {
    if (!sociousTableBody) return;

    const tasks = StorageModule.getTasks();
    const users = StorageModule.getUsers();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Remover hora para comparar apenas datas

    sociousTableBody.innerHTML = "";

    tasks.forEach((task) => {
      const assignee = users.find((u) => u.id === task.assignee);
      const statusInfo = UtilsModule.getStatusText(task.status);
      const priorityInfo = UtilsModule.getPriorityText(task.priority);
      const typeInfo = UtilsModule.getTypeText(task.type);

      const row = document.createElement("tr");

      // Verificar se a data de entrega está vencida
      let dataAttribute = "";
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate < today) {
          dataAttribute = 'data-vencida="true"';
        } else if (dueDate.getTime() === today.getTime()) {
          dataAttribute = 'data-hoje="true"';
        } else {
          dataAttribute = 'data-futura="true"';
        }
      }

      row.innerHTML = `
            <td>
                <label class="checkbox-container">
                    <div class="custom-checkbox"></div>
                </label>
            </td>
            <td>${task.title}</td>
            <td>${assignee ? assignee.name : "Não atribuído"}</td>
            <td>${UtilsModule.formatDate(task.requestDate)}</td>
            <td ${dataAttribute}>${UtilsModule.formatDate(task.dueDate)}</td>
            <td class="status-${statusInfo.class}">${statusInfo.text}</td>
            <td class="prioridade-${priorityInfo.class}">${priorityInfo.text
        }</td>
            <td>${task.client || "-"}</td>
            <td class="tipo-${typeInfo.class}">${typeInfo.text}</td>
            <td>
                <button class="action-btn" data-task-id="${task.id}">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;

      // Adicionar evento de clique para editar
      row.querySelector("button").addEventListener("click", (e) => {
        const taskId = parseInt(e.currentTarget.dataset.taskId);
        ModalModule.showModal(null, taskId);
      });

      // Adicionar evento para o checkbox
      const checkbox = row.querySelector(".custom-checkbox");
      checkbox.addEventListener("click", (e) => {
        e.stopPropagation();
        checkbox.classList.toggle("checked");
      });

      sociousTableBody.appendChild(row);
    });

    // Configurar ordenação após renderizar a tabela
    setTimeout(() => {
      if (
        typeof TableSortModule !== "undefined" &&
        TableSortModule.setupColumnSorting
      ) {
        TableSortModule.setupColumnSorting();
      }
    }, 100);
  };

  // Mostrar visualização de board
  const showBoardView = () => {
    if (taskBoard && sociousView) {
      taskBoard.style.display = "flex";
      sociousView.style.display = "none";

      if (boardViewBtn && sociousViewBtn) {
        boardViewBtn.classList.add("active");
        sociousViewBtn.classList.remove("active");
      }

      renderBoard();
    }
  };

  // Mostrar visualização Socíus
  const showSociousView = () => {
    if (taskBoard && sociousView) {
      taskBoard.style.display = "none";
      sociousView.style.display = "block";

      if (boardViewBtn && sociousViewBtn) {
        boardViewBtn.classList.remove("active");
        sociousViewBtn.classList.add("active");
      }

      renderSociousView();
    }
  };

  // Inicializar módulo
  const initBoard = () => {
    // Verificar se estamos na página correta
    if (!taskBoard && !sociousView) return;

    // Configurar event listeners para alternância de visualização
    if (boardViewBtn) {
      boardViewBtn.addEventListener("click", showBoardView);
    }

    if (sociousViewBtn) {
      sociousViewBtn.addEventListener("click", showSociousView);
    }

    // Configurar botão de adicionar tarefa na visualização Socíus
    if (addTaskSocious) {
      addTaskSocious.addEventListener("click", () => {
        ModalModule.showModal(1); // Coluna "Pendente"
      });
    }

    // Configurar dropdown de usuário
    const userDropdown = document.getElementById("userDropdown");
    const userMenu = document.getElementById("userMenu");

    if (userDropdown && userMenu) {
      userDropdown.addEventListener("click", () => {
        userMenu.classList.toggle("show");
      });

      // Fechar dropdown ao clicar fora
      document.addEventListener("click", (e) => {
        if (!userDropdown.contains(e.target) && !userMenu.contains(e.target)) {
          userMenu.classList.remove("show");
        }
      });
    }

    // Inicializar com a visualização de board
    showBoardView();

    // Ouvir eventos de atualização de tarefas
    window.addEventListener("tasksUpdated", () => {
      if (taskBoard.style.display !== "none") {
        renderBoard();
      } else {
        renderSociousView();
      }
    });
  };

  return {
    initBoard,
    renderBoard,
    renderSociousView,
    showBoardView,
    showSociousView,
  };
})();

// Inicializar o módulo quando o DOM estiver carregado
document.addEventListener("DOMContentLoaded", BoardModule.initBoard);
