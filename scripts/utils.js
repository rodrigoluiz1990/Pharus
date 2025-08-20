// Módulo de utilitários
const UtilsModule = (() => {
    // Formatar data
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    };

    // Obter texto do status
    const getStatusText = (status) => {
        const statusMap = {
            'pending': 'Pendente',
            'in_progress': 'Em Andamento',
            'review': 'Em Revisão',
            'completed': 'Concluído'
        };
        return statusMap[status] || status;
    };

    // Obter texto da prioridade
    const getPriorityText = (priority) => {
        const priorityMap = {
            'low': 'Baixa',
            'medium': 'Média',
            'high': 'Alta'
        };
        return priorityMap[priority] || priority;
    };

    // Obter texto do tipo
    const getTypeText = (type) => {
        const typeMap = {
            'task': 'Tarefa',
            'bug': 'Bug',
            'feature': 'Feature',
            'improvement': 'Melhoria'
        };
        return typeMap[type] || type;
    };

    // Obter status baseado na coluna
    const getColumnStatus = (columnId) => {
        const columns = StorageModule.getColumns();
        const column = columns.find(c => c.id === columnId);
        
        if (column) {
            switch (column.title) {
                case 'Pendente': return 'pending';
                case 'Em Andamento': return 'in_progress';
                case 'Em Revisão': return 'review';
                case 'Concluído': return 'completed';
                default: return 'pending';
            }
        }
        return 'pending';
    };

    // Gerar ID único
    const generateId = (items) => {
        return Math.max(0, ...items.map(item => item.id)) + 1;
    };

    // Validar e-mail
    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    // Mostrar notificação
    const showNotification = (message, type = 'info') => {
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
        showNotification
    };
})();