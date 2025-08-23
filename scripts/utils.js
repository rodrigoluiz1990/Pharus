// Módulo de utilitários
const UtilsModule = (() => {
  // Formatar data - Corrigindo problema de fuso horário
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      // Dividir a data em partes para evitar problemas de fuso horário
      const [year, month, day] = dateString.split("-");
      const date = new Date(year, month - 1, day); // Mês é 0-indexed no JavaScript

      return isNaN(date.getTime()) ? "-" : date.toLocaleDateString("pt-BR");
    } catch (e) {
      // Se falhar, tentar o método original como fallback
      try {
        const date = new Date(dateString);
        // Ajustar para o fuso horário local
        const adjustedDate = new Date(
          date.getTime() + date.getTimezoneOffset() * 60000
        );
        return isNaN(adjustedDate.getTime())
          ? "-"
          : adjustedDate.toLocaleDateString("pt-BR");
      } catch (error) {
        return "-";
      }
    }
  };

  // Obter texto do status
  const getStatusText = (status) => {
    const statusMap = {
      pending: { text: "Pendente", class: "pendente" },
      in_progress: { text: "Em Andamento", class: "em-andamento" },
      review: { text: "Em Teste", class: "review" },
      completed: { text: "Concluído", class: "concluido" },
    };
    return statusMap[status] || { text: status, class: "desconhecido" };
  };

  // Obter texto da prioridade
  const getPriorityText = (priority) => {
    const priorityMap = {
      low: { text: "Baixa", class: "baixa" },
      medium: { text: "Média", class: "media" },
      high: { text: "Alta", class: "alta" },
    };
    return priorityMap[priority] || { text: priority, class: "desconhecida" };
  };

  // Obter texto do tipo
  const getTypeText = (type) => {
    const typeMap = {
      task: { text: "Novo", class: "task" },
      bug: { text: "Erro", class: "bug" },
      improvement: { text: "Melhoria", class: "improvement" },
    };
    return typeMap[type] || { text: type, class: "outro" };
  };

  // Obter status baseado na coluna
  const getColumnStatus = (columnId) => {
    const columns = StorageModule.getColumns();
    const column = columns.find((c) => c.id === columnId);

    if (column) {
      switch (column.title) {
        case "Pendente":
          return "pending";
        case "Em Andamento":
          return "in_progress";
        case "Em Teste":
          return "review";
        case "Concluído":
          return "completed";
        default:
          return "pending";
      }
    }
    return "pending";
  };

  // Gerar ID único
  const generateId = (items) => {
    return Math.max(0, ...items.map((item) => item.id)) + 1;
  };

  // Validar e-mail
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Mostrar notificação
  const showNotification = (message, type = "info") => {
    // Implementação básica de notificação
    alert(`${type.toUpperCase()}: ${message}`);
  };

  return {
    formatDate,
    getStatusText,
    getPriorityText,
    getTypeText,
    getColumnStatus,
    generateId,
    validateEmail,
    showNotification,
  };
})();
