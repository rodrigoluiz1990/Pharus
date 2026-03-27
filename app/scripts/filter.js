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
    const ALLOWED_STATUS = new Set(['pending', 'in_progress', 'review', 'completed']);
    const ALLOWED_PRIORITY = new Set(['very_high', 'high', 'medium', 'low', 'very_low']);
    const ALLOWED_TYPE = new Set(['new', 'optimization', 'improvement', 'discussion', 'suggestion', 'issue', 'epic']);

    const normalizeStatusKey = (value) => {
        const safe = String(value || '').trim().toLowerCase();
        const aliases = {
            pending: 'pending',
            pendente: 'pending',
            in_progress: 'in_progress',
            em_andamento: 'in_progress',
            andamento: 'in_progress',
            review: 'review',
            testing: 'review',
            em_teste: 'review',
            teste: 'review',
            completed: 'completed',
            done: 'completed',
            concluido: 'completed',
            concluído: 'completed',
        };
        return aliases[safe] || safe;
    };

    const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

    const sanitizeFilters = (input) => {
        const raw = input && typeof input === 'object' ? input : {};

        const sanitizeArray = (value, allowedSet) => {
            if (!Array.isArray(value)) return [];
            return value
                .map((item) => String(item || '').trim())
                .filter((item) => allowedSet.has(item));
        };

        const assigneeRaw = String(raw.assignee || '').trim();
        const assignee = /^[0-9]+$/.test(assigneeRaw) ? assigneeRaw : '';

        return {
            status: sanitizeArray(raw.status, ALLOWED_STATUS),
            priority: sanitizeArray(raw.priority, ALLOWED_PRIORITY),
            type: sanitizeArray(raw.type, ALLOWED_TYPE),
            assignee,
            title: String(raw.title || '').trim(),
            client: String(raw.client || '').trim(),
            startDate: String(raw.startDate || '').trim(),
            endDate: String(raw.endDate || '').trim(),
        };
    };

    const parseDateAsLocal = (value, endOfDay = false) => {
        const raw = String(value || '').trim();
        if (!raw) return null;

        const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (ymd) {
            const year = Number(ymd[1]);
            const month = Number(ymd[2]) - 1;
            const day = Number(ymd[3]);
            return endOfDay
                ? new Date(year, month, day, 23, 59, 59, 999)
                : new Date(year, month, day, 0, 0, 0, 0);
        }

        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return null;
        return parsed;
    };

    // Elementos do DOM
    const filterModal = document.getElementById('filterModal');
    const filterBtn = document.getElementById('filterBtn');
    const closeFilterModal = document.getElementById('closeFilterModal');
    const cancelFilter = document.getElementById('cancelFilter');
    const filterForm = document.getElementById('filterForm');
    const clearFilters = document.getElementById('clearFilters');
    const filterBadge = document.getElementById('filterBadge');
    const filterAssignee = document.getElementById('filterAssignee');
    const filterPriority = document.getElementById('filterPriority');
    const filterType = document.getElementById('filterType');

    const getPriorityDefinitions = () => {
        if (window.UtilsModule && typeof window.UtilsModule.getPriorityDefinitions === 'function') {
            return window.UtilsModule.getPriorityDefinitions();
        }
        return [
            { value: 'very_high', label: 'Muito Alta' },
            { value: 'high', label: 'Alta' },
            { value: 'medium', label: 'Média' },
            { value: 'low', label: 'Baixa' },
            { value: 'very_low', label: 'Muito Baixa' },
        ];
    };

    const getTypeDefinitions = () => {
        if (window.UtilsModule && typeof window.UtilsModule.getTypeDefinitions === 'function') {
            return window.UtilsModule.getTypeDefinitions();
        }
        return [
            { value: 'new', label: 'Novo' },
            { value: 'optimization', label: 'Otimização' },
            { value: 'improvement', label: 'Melhoria' },
            { value: 'discussion', label: 'Para Discutir' },
            { value: 'suggestion', label: 'Sugestão' },
            { value: 'issue', label: 'Problema' },
            { value: 'epic', label: 'Épico' },
        ];
    };

    const populateTaxonomyFilterOptions = () => {
        if (filterPriority) {
            const selected = new Set(currentFilters.priority || []);
            filterPriority.innerHTML = getPriorityDefinitions()
                .map((item) => `<option value="${String(item.value)}">${String(item.label)}</option>`)
                .join('');
            Array.from(filterPriority.options).forEach((option) => {
                option.selected = selected.has(option.value);
            });
            filterPriority.size = Math.max(3, Math.min(7, filterPriority.options.length));
        }

        if (filterType) {
            const selected = new Set(currentFilters.type || []);
            filterType.innerHTML = getTypeDefinitions()
                .map((item) => `<option value="${String(item.value)}">${String(item.label)}</option>`)
                .join('');
            Array.from(filterType.options).forEach((option) => {
                option.selected = selected.has(option.value);
            });
            filterType.size = Math.max(3, Math.min(8, filterType.options.length));
        }
    };

    // Inicialização do módulo
    const init = () => {
        if (isInitialized) return;

        populateTaxonomyFilterOptions();
        setupEventListeners();
        loadSavedFilters();
        populateTaxonomyFilterOptions();
        updateFilterBadge();
        window.addEventListener('pharus:task-taxonomy-icons-updated', populateTaxonomyFilterOptions);
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
                if (filterAssignee.value !== currentAssignee) {
                    currentFilters.assignee = '';
                    saveFilters();
                    updateFilterBadge();
                }
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

        currentFilters = sanitizeFilters({
            status: statusSelect ? Array.from(statusSelect.selectedOptions).map(opt => opt.value) : [],
            priority: prioritySelect ? Array.from(prioritySelect.selectedOptions).map(opt => opt.value) : [],
            type: typeSelect ? Array.from(typeSelect.selectedOptions).map(opt => opt.value) : [],
            assignee: filterAssignee ? filterAssignee.value : '',
            title: titleInput ? titleInput.value.trim() : '',
            client: clientInput ? clientInput.value.trim() : '',
            startDate: startDateInput ? startDateInput.value : '',
            endDate: endDateInput ? endDateInput.value : ''
        });

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
                currentFilters = sanitizeFilters(JSON.parse(saved));
                saveFilters();
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
            const normalizedStatus = normalizeStatusKey(task.status);
            const normalizedPriority = window.UtilsModule && typeof window.UtilsModule.normalizePriorityKey === 'function'
                ? window.UtilsModule.normalizePriorityKey(task.priority || '')
                : String(task.priority || '');
            const normalizedType = window.UtilsModule && typeof window.UtilsModule.normalizeTypeKey === 'function'
                ? window.UtilsModule.normalizeTypeKey(task.type || '')
                : String(task.type || '');

            // Filtro por status
            if (currentFilters.status.length > 0 && !currentFilters.status.includes(normalizedStatus)) {
                return false;
            }

            // Filtro por prioridade
            if (currentFilters.priority.length > 0 && !currentFilters.priority.includes(normalizedPriority)) {
                return false;
            }

            // Filtro por tipo
            if (currentFilters.type.length > 0 && !currentFilters.type.includes(normalizedType)) {
                return false;
            }

            // Filtro por responsável
            if (currentFilters.assignee) {
                const selectedAssignee = String(currentFilters.assignee);
                const byId = String(task.assignee || '') === selectedAssignee;
                const byUserId = String(task.assignee_user?.id || '') === selectedAssignee;
                if (!byId && !byUserId) return false;
            }

            // Filtro por titulo
            if (currentFilters.title) {
                const taskTitle = normalizeText(task.title);
                const targetTitle = normalizeText(currentFilters.title);
                if (!taskTitle.includes(targetTitle)) return false;
            }

            // Filtro por cliente
            if (currentFilters.client) {
                const targetClient = normalizeText(currentFilters.client);
                const rawClient = normalizeText(task.client);
                const acronymClient = normalizeText(task.client_acronym);
                const nameClient = normalizeText(task.client_name);
                const mergedClient = `${rawClient} ${acronymClient} ${nameClient}`.trim();
                if (!mergedClient.includes(targetClient)) return false;
            }

            // Filtro por data de entrega
            if (currentFilters.startDate || currentFilters.endDate) {
                if (!task.due_date) return false;

                const taskDate = parseDateAsLocal(task.due_date, true);
                if (!taskDate || Number.isNaN(taskDate.getTime())) return false;

                const startDate = currentFilters.startDate ? parseDateAsLocal(currentFilters.startDate, false) : null;
                const endDate = currentFilters.endDate ? parseDateAsLocal(currentFilters.endDate, true) : null;

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








