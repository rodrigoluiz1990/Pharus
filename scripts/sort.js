// sort.js - Ordenação de tarefas
const SortModule = (() => {
    const STORAGE_KEY = 'taskSorting';
    const LEVELS = [1, 2, 3];

    const FIXED_FIELDS = new Set(['priority', 'type', 'status', 'assignee', 'client']);

    const PRIORITY_OPTIONS = [
        { value: 'high', label: 'Alta' },
        { value: 'medium', label: 'Média' },
        { value: 'low', label: 'Baixa' },
    ];

    const TYPE_OPTIONS = [
        { value: 'task', label: 'Novo' },
        { value: 'bug', label: 'Erro' },
        { value: 'improvement', label: 'Melhoria' },
    ];

    const STATUS_OPTIONS = [
        { value: 'pending', label: 'Pendente' },
        { value: 'in_progress', label: 'Em Andamento' },
        { value: 'review', label: 'Em Teste' },
        { value: 'completed', label: 'Concluído' },
    ];

    const PRIORITY_WEIGHT = { low: 1, medium: 2, high: 3 };
    const STATUS_WEIGHT = { pending: 1, in_progress: 2, review: 3, completed: 4 };

    const DEFAULT_SORT = {
        criteria: [{ field: 'created_at', mode: 'direction', direction: 'desc' }],
    };

    let currentSort = JSON.parse(JSON.stringify(DEFAULT_SORT));
    let isInitialized = false;
    let cachedTasks = [];
    let cachedUsersById = {};

    const manualStateByLevel = {
        1: { draggedEl: null },
        2: { draggedEl: null },
        3: { draggedEl: null },
    };

    const elements = {
        sortBtn: document.getElementById('sortBtn'),
        sortModal: document.getElementById('sortModal'),
        closeSortModal: document.getElementById('closeSortModal'),
        cancelSort: document.getElementById('cancelSort'),
        clearSorting: document.getElementById('clearSorting'),
        sortForm: document.getElementById('sortForm'),
    };

    const getLevelElements = (level) => ({
        field: document.getElementById(`sortField${level}`),
        direction: document.getElementById(`sortDirection${level}`),
        directionGroup: document.getElementById(`sortDirectionGroup${level}`),
        manualGroup: document.getElementById(`sortManualGroup${level}`),
        manualList: document.getElementById(`sortManualList${level}`),
    });

    const compareText = (a, b) => String(a || '').localeCompare(String(b || ''), 'pt-BR', { sensitivity: 'base' });

    const uniqueValues = (values) => {
        const seen = new Set();
        const out = [];
        values.forEach((value) => {
            const key = String(value || '');
            if (!key || seen.has(key)) return;
            seen.add(key);
            out.push(key);
        });
        return out;
    };

    const getAssigneeLabel = (assigneeValue) => {
        if (!assigneeValue) return '';
        const user = cachedUsersById[String(assigneeValue)];
        if (!user) return String(assigneeValue);
        return user.name || user.full_name || user.email || String(assigneeValue);
    };

    const getFieldDisplayLabel = (field, value) => {
        if (!value && value !== 0) return '';

        if (field === 'priority') {
            return PRIORITY_OPTIONS.find((o) => o.value === value)?.label || String(value);
        }
        if (field === 'type') {
            return TYPE_OPTIONS.find((o) => o.value === value)?.label || String(value);
        }
        if (field === 'status') {
            return STATUS_OPTIONS.find((o) => o.value === value)?.label || String(value);
        }
        if (field === 'assignee') {
            return getAssigneeLabel(value);
        }
        return String(value);
    };

    const parseFieldValue = (task, field) => {
        if (field === 'priority') return PRIORITY_WEIGHT[task.priority] || 0;
        if (field === 'status') return STATUS_WEIGHT[task.status] || 0;

        const raw = task[field];
        if (raw === null || raw === undefined) return '';

        if (field.includes('date') || field.endsWith('_at')) {
            const ts = new Date(raw).getTime();
            return Number.isNaN(ts) ? 0 : ts;
        }

        if (field === 'assignee') {
            return getAssigneeLabel(raw).toLowerCase();
        }

        return String(raw).toLowerCase();
    };

    const getRawFieldValue = (task, field) => {
        const value = task[field];
        if (value === null || value === undefined) return '';
        return String(value);
    };

    const buildUsersMap = (users) => {
        const map = {};
        (users || []).forEach((user) => {
            if (!user || user.id === null || user.id === undefined) return;
            map[String(user.id)] = user;
        });
        return map;
    };

    const refreshDataContext = async () => {
        if (typeof StorageModule === 'undefined') return;

        try {
            if (typeof StorageModule.getTasks === 'function') {
                const tasks = await StorageModule.getTasks();
                cachedTasks = Array.isArray(tasks) ? tasks : [];
            }
        } catch (error) {
            console.error('Erro ao carregar tarefas para ordenação:', error);
            cachedTasks = [];
        }

        try {
            if (typeof StorageModule.getUsers === 'function') {
                const users = await StorageModule.getUsers();
                cachedUsersById = buildUsersMap(users);
            }
        } catch (error) {
            console.error('Erro ao carregar usuários para ordenação:', error);
            cachedUsersById = {};
        }
    };

    const getManualOptionsForField = (field) => {
        if (field === 'priority') return [...PRIORITY_OPTIONS];
        if (field === 'type') return [...TYPE_OPTIONS];
        if (field === 'status') return [...STATUS_OPTIONS];

        if (field === 'assignee') {
            const assigneeValues = uniqueValues(
                (cachedTasks || [])
                    .map((task) => task?.assignee)
                    .filter((value) => value !== null && value !== undefined && String(value).trim() !== '')
                    .map((value) => String(value))
            );

            return assigneeValues
                .map((value) => ({ value, label: getAssigneeLabel(value) || value }))
                .sort((a, b) => compareText(a.label, b.label));
        }

        if (field === 'client') {
            const clientValues = uniqueValues(
                (cachedTasks || [])
                    .map((task) => task?.client)
                    .filter((value) => value !== null && value !== undefined && String(value).trim() !== '')
                    .map((value) => String(value).trim())
            );

            return clientValues.map((value) => ({ value, label: value })).sort((a, b) => compareText(a.label, b.label));
        }

        return [];
    };

    const setupDragAndDropForList = (level, listEl) => {
        if (!listEl) return;

        const state = manualStateByLevel[level];

        listEl.addEventListener('dragstart', (event) => {
            const item = event.target.closest('.sort-manual-item');
            if (!item) return;
            state.draggedEl = item;
            item.classList.add('dragging');
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', item.dataset.value || '');
            }
        });

        listEl.addEventListener('dragend', () => {
            const dragging = listEl.querySelector('.sort-manual-item.dragging');
            if (dragging) dragging.classList.remove('dragging');
            state.draggedEl = null;
        });

        listEl.addEventListener('dragover', (event) => {
            event.preventDefault();
            const dragged = state.draggedEl;
            if (!dragged) return;

            const targetItem = event.target.closest('.sort-manual-item');
            if (targetItem && targetItem !== dragged && targetItem.parentElement === listEl) {
                const rect = targetItem.getBoundingClientRect();
                const isAfter =
                    Math.abs(event.clientY - (rect.top + rect.height / 2)) > Math.abs(event.clientX - (rect.left + rect.width / 2))
                        ? event.clientY > rect.top + rect.height / 2
                        : event.clientX > rect.left + rect.width / 2;

                if (isAfter) {
                    listEl.insertBefore(dragged, targetItem.nextSibling);
                } else {
                    listEl.insertBefore(dragged, targetItem);
                }
                return;
            }

            const afterElement = getDragAfterElementByPointer(listEl, event.clientX, event.clientY);
            if (afterElement) {
                listEl.insertBefore(dragged, afterElement);
                return;
            }

            listEl.appendChild(dragged);
        });

        listEl.addEventListener('drop', (event) => {
            event.preventDefault();
        });
    };

    const getDragAfterElementByPointer = (container, x, y) => {
        const draggableElements = [...container.querySelectorAll('.sort-manual-item:not(.dragging)')];
        if (draggableElements.length === 0) return null;

        return draggableElements.reduce(
            (closest, child) => {
                const box = child.getBoundingClientRect();
                const dx = x - (box.left + box.width / 2);
                const dy = y - (box.top + box.height / 2);
                const weightedDistance = Math.abs(dx) + Math.abs(dy) * 1.2;

                if (dy < 0 && weightedDistance < closest.distance) {
                    return { distance: weightedDistance, element: child };
                }

                return closest;
            },
            { distance: Number.POSITIVE_INFINITY, element: null }
        ).element;
    };

    const readManualOrder = (level) => {
        const { manualList } = getLevelElements(level);
        if (!manualList) return [];

        return [...manualList.querySelectorAll('.sort-manual-item')]
            .map((item) => item.dataset.value || '')
            .filter((value) => value);
    };

    const sortOptionsBySavedOrder = (options, savedOrder) => {
        if (!savedOrder || !savedOrder.length) return options;

        const map = new Map(options.map((opt) => [String(opt.value), opt]));
        const ordered = [];

        savedOrder.forEach((value) => {
            const key = String(value);
            if (!map.has(key)) return;
            ordered.push(map.get(key));
            map.delete(key);
        });

        const remaining = [...map.values()].sort((a, b) => compareText(a.label, b.label));
        return [...ordered, ...remaining];
    };

    const renderManualList = (level, field, savedOrder = []) => {
        const { manualList } = getLevelElements(level);
        if (!manualList) return;

        const options = sortOptionsBySavedOrder(getManualOptionsForField(field), savedOrder);

        if (options.length === 0) {
            manualList.innerHTML = '<li class="sort-manual-empty">Sem valores disponíveis para este campo.</li>';
            return;
        }

        manualList.innerHTML = options
            .map((option) => {
                const safeValue = String(option.value).replace(/"/g, '&quot;');
                return `
                    <li class="sort-manual-item" draggable="true" data-value="${safeValue}">
                        <span class="sort-manual-grip" aria-hidden="true"><i class="fas fa-grip-vertical"></i></span>
                        <span class="sort-manual-label">${option.label}</span>
                    </li>
                `;
            })
            .join('');
    };

    const getManualCriterionFromLegacy = (field, optionOrder) => {
        const options = getManualOptionsForField(field);
        const defaultOrder = options.map((opt) => opt.value);

        if (!optionOrder || optionOrder === 'auto') return { field, mode: 'manual', order: defaultOrder };

        if (optionOrder.startsWith('value_first::')) {
            const value = decodeURIComponent(optionOrder.replace('value_first::', ''));
            const rest = defaultOrder.filter((v) => String(v) !== String(value));
            return { field, mode: 'manual', order: [value, ...rest] };
        }

        if (field === 'priority') {
            if (optionOrder === 'high_first') return { field, mode: 'manual', order: ['high', 'medium', 'low'] };
            if (optionOrder === 'low_first') return { field, mode: 'manual', order: ['low', 'medium', 'high'] };
        }

        if (field === 'status') {
            if (optionOrder === 'flow') return { field, mode: 'manual', order: ['pending', 'in_progress', 'review', 'completed'] };
            if (optionOrder === 'completed_first') return { field, mode: 'manual', order: ['completed', 'review', 'in_progress', 'pending'] };
        }

        if (field === 'type') {
            if (optionOrder === 'task_bug_improvement') return { field, mode: 'manual', order: ['task', 'bug', 'improvement'] };
            if (optionOrder === 'bug_first') return { field, mode: 'manual', order: ['bug', 'task', 'improvement'] };
        }

        return { field, mode: 'manual', order: defaultOrder };
    };

    const normalizeCriterion = (criterion) => {
        if (!criterion || !criterion.field) return null;
        const field = String(criterion.field);

        if (FIXED_FIELDS.has(field)) {
            if (criterion.mode === 'manual' && Array.isArray(criterion.order)) {
                return { field, mode: 'manual', order: criterion.order.map((v) => String(v)) };
            }
            return getManualCriterionFromLegacy(field, criterion.optionOrder || 'auto');
        }

        return {
            field,
            mode: 'direction',
            direction: criterion.direction === 'asc' ? 'asc' : 'desc',
        };
    };

    const saveSort = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSort));
        } catch (error) {
            console.error('Erro ao salvar ordenação:', error);
        }
    };

    const loadSavedSort = async () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                currentSort = JSON.parse(JSON.stringify(DEFAULT_SORT));
                return;
            }

            const parsed = JSON.parse(raw);

            if (parsed && Array.isArray(parsed.criteria)) {
                const normalized = parsed.criteria.map(normalizeCriterion).filter((c) => c && c.field).slice(0, 3);
                currentSort = normalized.length > 0 ? { criteria: normalized } : JSON.parse(JSON.stringify(DEFAULT_SORT));
                return;
            }

            if (parsed && parsed.field) {
                const legacy = normalizeCriterion({ field: parsed.field, direction: parsed.direction || 'desc' });
                currentSort = legacy ? { criteria: [legacy] } : JSON.parse(JSON.stringify(DEFAULT_SORT));
                return;
            }

            currentSort = JSON.parse(JSON.stringify(DEFAULT_SORT));
        } catch (error) {
            console.error('Erro ao carregar ordenação salva:', error);
            currentSort = JSON.parse(JSON.stringify(DEFAULT_SORT));
        }
    };

    const setupEventListeners = () => {
        if (elements.sortBtn) elements.sortBtn.addEventListener('click', showSortModal);
        if (elements.closeSortModal) elements.closeSortModal.addEventListener('click', hideSortModal);
        if (elements.cancelSort) elements.cancelSort.addEventListener('click', hideSortModal);
        if (elements.clearSorting) elements.clearSorting.addEventListener('click', clearSorting);
        if (elements.sortForm) elements.sortForm.addEventListener('submit', applySorting);

        LEVELS.forEach((level) => {
            const levelEls = getLevelElements(level);
            if (levelEls.field) {
                levelEls.field.addEventListener('change', () => {
                    updateLevelUI(level);
                });
            }
            setupDragAndDropForList(level, levelEls.manualList);
        });

        if (elements.sortModal) {
            elements.sortModal.addEventListener('click', (e) => {
                if (e.target === elements.sortModal) hideSortModal();
            });
        }
    };

    const updateLevelUI = (level, savedOrder = null) => {
        const { field, directionGroup, manualGroup, manualList } = getLevelElements(level);
        if (!field) return;

        const selectedField = field.value;
        const isEmpty = !selectedField;
        const isFixed = FIXED_FIELDS.has(selectedField);

        if (directionGroup) directionGroup.style.display = !isEmpty && !isFixed ? '' : 'none';
        if (manualGroup) manualGroup.style.display = !isEmpty && isFixed ? '' : 'none';

        if (manualList && !isEmpty && isFixed) {
            renderManualList(level, selectedField, Array.isArray(savedOrder) ? savedOrder : []);
        }
    };

    const loadSortValues = async () => {
        await refreshDataContext();

        const c1 = currentSort.criteria[0] || { field: 'created_at', mode: 'direction', direction: 'desc' };
        const c2 = currentSort.criteria[1] || { field: '', mode: 'direction', direction: 'desc' };
        const c3 = currentSort.criteria[2] || { field: '', mode: 'direction', direction: 'desc' };

        const criteriaByLevel = { 1: c1, 2: c2, 3: c3 };

        LEVELS.forEach((level) => {
            const criterion = criteriaByLevel[level] || {};
            const levelEls = getLevelElements(level);
            if (!levelEls.field) return;

            levelEls.field.value = criterion.field || (level === 1 ? 'created_at' : '');
            if (levelEls.direction) levelEls.direction.value = criterion.direction === 'asc' ? 'asc' : 'desc';

            updateLevelUI(level, criterion.order || []);
        });
    };

    const showSortModal = async () => {
        if (!elements.sortModal) return;
        await loadSortValues();
        elements.sortModal.style.display = 'flex';
    };

    const hideSortModal = () => {
        if (!elements.sortModal) return;
        elements.sortModal.style.display = 'none';
    };

    const applySorting = (e) => {
        e.preventDefault();

        const criteria = [];

        LEVELS.forEach((level) => {
            const { field, direction } = getLevelElements(level);
            if (!field || !field.value) return;

            const selectedField = field.value;

            if (FIXED_FIELDS.has(selectedField)) {
                criteria.push({ field: selectedField, mode: 'manual', order: readManualOrder(level) });
                return;
            }

            criteria.push({
                field: selectedField,
                mode: 'direction',
                direction: direction && direction.value === 'asc' ? 'asc' : 'desc',
            });
        });

        currentSort = criteria.length > 0 ? { criteria } : JSON.parse(JSON.stringify(DEFAULT_SORT));

        saveSort();
        hideSortModal();
        window.dispatchEvent(new CustomEvent('sortsApplied', { detail: { sort: currentSort } }));
    };

    const clearSorting = () => {
        currentSort = JSON.parse(JSON.stringify(DEFAULT_SORT));
        saveSort();
        loadSortValues();
        hideSortModal();
        window.dispatchEvent(new CustomEvent('sortsApplied', { detail: { sort: currentSort } }));
    };

    const compareByDirection = (aTask, bTask, criterion) => {
        const aValue = parseFieldValue(aTask, criterion.field);
        const bValue = parseFieldValue(bTask, criterion.field);
        const multiplier = criterion.direction === 'asc' ? 1 : -1;

        if (aValue < bValue) return -1 * multiplier;
        if (aValue > bValue) return 1 * multiplier;
        return 0;
    };

    const compareByManualOrder = (aTask, bTask, criterion) => {
        const order = Array.isArray(criterion.order) ? criterion.order.map((v) => String(v)) : [];
        const indexMap = new Map(order.map((value, index) => [String(value), index]));

        const aRaw = getRawFieldValue(aTask, criterion.field);
        const bRaw = getRawFieldValue(bTask, criterion.field);

        const aIndex = indexMap.has(aRaw) ? indexMap.get(aRaw) : Number.MAX_SAFE_INTEGER;
        const bIndex = indexMap.has(bRaw) ? indexMap.get(bRaw) : Number.MAX_SAFE_INTEGER;

        if (aIndex < bIndex) return -1;
        if (aIndex > bIndex) return 1;

        const aLabel = getFieldDisplayLabel(criterion.field, aRaw);
        const bLabel = getFieldDisplayLabel(criterion.field, bRaw);
        return compareText(aLabel, bLabel);
    };

    const sortTasks = (tasks) => {
        const sorted = [...(tasks || [])];
        const criteria = (currentSort.criteria || []).map(normalizeCriterion).filter((c) => c && c.field);
        if (criteria.length === 0) return sorted;

        sorted.sort((aTask, bTask) => {
            for (const criterion of criteria) {
                const result = criterion.mode === 'manual'
                    ? compareByManualOrder(aTask, bTask, criterion)
                    : compareByDirection(aTask, bTask, criterion);

                if (result !== 0) return result;
            }
            return 0;
        });

        return sorted;
    };

    const getCurrentSort = () => ({
        criteria: (currentSort.criteria || []).map((criterion) => ({ ...criterion })),
    });

    const init = async () => {
        if (isInitialized) return;
        await refreshDataContext();
        await loadSavedSort();
        setupEventListeners();
        await loadSortValues();
        isInitialized = true;
    };

    return {
        init,
        sortTasks,
        getCurrentSort,
        clearSorting,
    };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', SortModule.init);
} else {
    SortModule.init();
}


