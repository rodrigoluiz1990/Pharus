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

  // Mostrar loading global
  const showLoading = function (message = 'Carregando...') {
    const loading = document.getElementById('globalLoading');
    if (loading) {
      loading.querySelector('span').textContent = message;
      loading.style.display = 'flex';
    }
  };

  // Esconder loading global
  const hideLoading = function () {
    const loading = document.getElementById('globalLoading');
    if (loading) {
      loading.style.display = 'none';
    }
  };

  // Tratamento de erros de API
  const handleApiError = function (error, context = 'operação') {
    console.error(`Erro em ${context}:`, error);

    let message = 'Erro inesperado';
    if (error.message) {
      message = error.message;
    } else if (error.code) {
      message = `Erro ${error.code}: ${error.message}`;
    }

    showNotification(`Erro ao ${context}: ${message}`, 'error');
    return false;
  };

  // Formatar data para input type="date"
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';

      // Ajustar para o fuso horário local
      const offset = date.getTimezoneOffset();
      const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
      return adjustedDate.toISOString().split('T')[0];
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return '';
    }
  };

  // Obter status da coluna do Supabase
  const getColumnStatusFromSupabase = async (columnId) => {
    try {
      const { data: column, error } = await window.supabaseClient
        .from('columns')
        .select('type')
        .eq('id', columnId)
        .single();

      if (error) throw error;
      return column?.type || 'pending';
    } catch (error) {
      console.error('Erro ao buscar status da coluna:', error);
      return 'pending';
    }
  };

  return {
    // Mantenha todas as exportações existentes
    formatDate,
    getStatusText,
    getPriorityText,
    getTypeText,
    getColumnStatus,
    generateId,
    validateEmail,
    showNotification,

    // Adicione as novas exportações
    showLoading,
    hideLoading,
    handleApiError,
    formatDateForInput,
    getColumnStatusFromSupabase
  };
})();
