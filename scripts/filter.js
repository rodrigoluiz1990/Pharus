// filter.js - Sistema de Filtros para o Quadro de Tarefas
const FilterModule = (() => {
    // Estado dos filtros
    let currentFilters = {
        status: [],
        priority: [],
        type: [],
        assignee: '',
        title: '',
        client: '',
        startDate: '',
        endDate: ''
    };
    let isInitialized = false;

    // Elementos do DOM
    const filterModal = document.getElementById('filterModal');
    const filterBtn = document.getElementById('filterBtn');
    const closeFilterModal = document.getElementById('closeFilterModal');
    const cancelFilter = document.getElementById('cancelFilter');
    const filterForm = document.getElementById('filterForm');
    const clearFilters = document.getElementById('clearFilters');
    const filterBadge = document.getElementById('filterBadge');
    const filterAssignee = document.getElementById('filterAssignee');

    // Inicialização do módulo
    const init = () => {
        if (isInitialized) return;

        setupEventListeners();
        loadSavedFilters();
        updateFilterBadge();
        isInitialized = true;
    };

    // Configurar event listeners
    const setupEventListeners = () => {
        if (filterBtn) {filterBtn.addEventListener('click', showFilterModal);}
        if (closeFilterModal) {closeFilterModal.addEventListener('click', hideFilterModal);}
        if (cancelFilter) {cancelFilter.addEventListener('click', hideFilterModal);}
        if (filterForm) {filterForm.addEventListener('submit', applyFilters);}
        if (clearFilters) {clearFilters.addEventListener('click', clearAllFilters);}

        // Fechar modal ao clicar fora
        if (filterModal) {
            filterModal.addEventListener('click', (e) => {
                if (e.target === filterModal) {
                    hideFilterModal();
                }
            });
        }
    };

    // Mostrar modal de filtro
    const showFilterModal = () => {
        if (!filterModal) return;

        populateAssigneeFilter();
        loadFilterValues();
        filterModal.style.display = 'flex';
    };

    // Ocultar modal de filtro
    const hideFilterModal = () => {
        if (filterModal) {
            filterModal.style.display = 'none';
        }
    };

    // Popular filtro de responsáveis
    const populateAssigneeFilter = async () => {
        if (!filterAssignee) return;

        try {
            const users = await StorageModule.getUsers();
            const currentAssignee = filterAssignee.value;

            // Manter opção "Todos" e limpar outras
            filterAssignee.innerHTML = '<option value="">Todos os responsáveis</option>';

            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.name;
                filterAssignee.appendChild(option);
            });

            // Restaurar seleção anterior
            if (currentAssignee) {
                filterAssignee.value = currentAssignee;
            }
        } catch (error) {
            console.error('Erro ao carregar responsáveis:', error);
        }
    };

    // Carregar valores atuais dos filtros
    const loadFilterValues = () => {
        if (!filterForm) return;

        // Status
        const statusSelect = document.getElementById('filterStatus');
        if (statusSelect) {
            Array.from(statusSelect.options).forEach(option => {
                option.selected = currentFilters.status.includes(option.value);
            });
        }

        // Prioridade
        const prioritySelect = document.getElementById('filterPriority');
        if (prioritySelect) {
            Array.from(prioritySelect.options).forEach(option => {
                option.selected = currentFilters.priority.includes(option.value);
            });
        }

        // Tipo
        const typeSelect = document.getElementById('filterType');
        if (typeSelect) {
            Array.from(typeSelect.options).forEach(option => {
                option.selected = currentFilters.type.includes(option.value);
            });
        }

        // Responsável
        if (filterAssignee) {
            filterAssignee.value = currentFilters.assignee;
        }

        // Título
        const titleInput = document.getElementById('filterTitle');
        if (titleInput) {
            titleInput.value = currentFilters.title;
        }

        // Cliente
        const clientInput = document.getElementById('filterClient');
        if (clientInput) {
            clientInput.value = currentFilters.client;
        }

        // Datas
        const startDateInput = document.getElementById('filterStartDate');
        const endDateInput = document.getElementById('filterEndDate');
        if (startDateInput) startDateInput.value = currentFilters.startDate;
        if (endDateInput) endDateInput.value = currentFilters.endDate;
    };

    // Aplicar filtros
    const applyFilters = (e) => {
        e.preventDefault();

        // Coletar valores dos filtros
        const statusSelect = document.getElementById('filterStatus');
        const prioritySelect = document.getElementById('filterPriority');
        const typeSelect = document.getElementById('filterType');
        const titleInput = document.getElementById('filterTitle');
        const clientInput = document.getElementById('filterClient');
        const startDateInput = document.getElementById('filterStartDate');
        const endDateInput = document.getElementById('filterEndDate');

        currentFilters = {
            status: statusSelect ? Array.from(statusSelect.selectedOptions).map(opt => opt.value) : [],
            priority: prioritySelect ? Array.from(prioritySelect.selectedOptions).map(opt => opt.value) : [],
            type: typeSelect ? Array.from(typeSelect.selectedOptions).map(opt => opt.value) : [],
            assignee: filterAssignee ? filterAssignee.value : '',
            title: titleInput ? titleInput.value.trim() : '',
            client: clientInput ? clientInput.value.trim() : '',
            startDate: startDateInput ? startDateInput.value : '',
            endDate: endDateInput ? endDateInput.value : ''
        };

        saveFilters();
        updateFilterBadge();
        hideFilterModal();

        // Disparar evento de filtros aplicados
        window.dispatchEvent(new CustomEvent('filtersApplied', {
            detail: { filters: currentFilters }
        }));
    };

    // Limpar todos os filtros
    const clearAllFilters = () => {
        currentFilters = {
            status: [],
            priority: [],
            type: [],
            assignee: '',
            title: '',
            client: '',
            startDate: '',
            endDate: ''
        };

        saveFilters();
        updateFilterBadge();
        hideFilterModal();

        // Disparar evento de filtros limpos
        window.dispatchEvent(new CustomEvent('filtersApplied', {
            detail: { filters: currentFilters }
        }));
    };

    // Salvar filtros no localStorage
    const saveFilters = () => {
        try {
            localStorage.setItem('taskFilters', JSON.stringify(currentFilters));
        } catch (error) {
            console.error('Erro ao salvar filtros:', error);
        }
    };

    // Carregar filtros salvos
    const loadSavedFilters = () => {
        try {
            const saved = localStorage.getItem('taskFilters');
            if (saved) {
                currentFilters = { ...currentFilters, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Erro ao carregar filtros salvos:', error);
        }
    };

    // Atualizar badge de filtro ativo
    const updateFilterBadge = () => {
        if (!filterBadge) return;

        const hasActiveFilters =
            currentFilters.status.length > 0 ||
            currentFilters.priority.length > 0 ||
            currentFilters.type.length > 0 ||
            currentFilters.assignee !== '' ||
            currentFilters.title !== '' ||
            currentFilters.client !== '' ||
            currentFilters.startDate !== '' ||
            currentFilters.endDate !== '';

        if (hasActiveFilters) {
            filterBadge.style.display = 'inline';
        } else {
            filterBadge.style.display = 'none';
        }
    };

    // Filtrar array de tarefas
    const filterTasks = (tasks) => {
        return tasks.filter(task => {
            // Filtro por status
            if (currentFilters.status.length > 0 && !currentFilters.status.includes(task.status)) {
                return false;
            }

            // Filtro por prioridade
            if (currentFilters.priority.length > 0 && !currentFilters.priority.includes(task.priority)) {
                return false;
            }

            // Filtro por tipo
            if (currentFilters.type.length > 0 && !currentFilters.type.includes(task.type)) {
                return false;
            }

            // Filtro por responsável
            if (currentFilters.assignee && String(task.assignee) !== String(currentFilters.assignee)) {
                return false;
            }

            // Filtro por titulo
            if (currentFilters.title &&
                (!task.title || !task.title.toLowerCase().includes(currentFilters.title.toLowerCase()))) {
                return false;
            }

            // Filtro por cliente
            if (currentFilters.client &&
                (!task.client || !task.client.toLowerCase().includes(currentFilters.client.toLowerCase()))) {
                return false;
            }

            // Filtro por data de entrega
            if (currentFilters.startDate || currentFilters.endDate) {
                if (!task.due_date) return false;

                const taskDate = new Date(task.due_date);
                const startDate = currentFilters.startDate ? new Date(currentFilters.startDate) : null;
                const endDate = currentFilters.endDate ? new Date(currentFilters.endDate) : null;

                if (startDate && taskDate < startDate) return false;
                if (endDate && taskDate > endDate) return false;
            }

            return true;
        });
    };

    // Obter filtros atuais
    const getCurrentFilters = () => {
        return { ...currentFilters };
    };

    // Verificar se há filtros ativos
    const hasActiveFilters = () => {
        return Object.values(currentFilters).some(value =>
            Array.isArray(value) ? value.length > 0 : value !== ''
        );
    };

    return {
        init,
        filterTasks,
        getCurrentFilters,
        hasActiveFilters,
        clearAllFilters
    };
})();

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', FilterModule.init);
} else {
    FilterModule.init();
}






