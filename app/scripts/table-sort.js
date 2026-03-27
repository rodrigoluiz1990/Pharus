// Modulo de ordenacao para a visualizacao de tabela
const TableSortModule = (() => {
    let currentSort = { column: null, direction: 'asc' };

    // Ordenar tabela pela coluna
    const sortTable = (columnIndex, columnName) => {
        const tableBody = document.getElementById('sociousTableBody');
        if (!tableBody) return;

        const rows = Array.from(tableBody.querySelectorAll('tr'));

        // Determinar direcao da ordenacao
        if (currentSort.column === columnName) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = columnName;
            currentSort.direction = 'asc';
        }

        // Ordenar linhas
        rows.sort((a, b) => {
            const aCell = a.cells[columnIndex];
            const bCell = b.cells[columnIndex];
            const aValue = aCell ? aCell.textContent.trim() : '';
            const bValue = bCell ? bCell.textContent.trim() : '';

            const aNum = parseFloat(aValue.replace(',', '.'));
            const bNum = parseFloat(bValue.replace(',', '.'));
            const aDate = new Date(aValue);
            const bDate = new Date(bValue);

            let comparison = 0;

            if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
                comparison = aNum - bNum;
            } else if (!Number.isNaN(aDate.getTime()) && !Number.isNaN(bDate.getTime())) {
                comparison = aDate - bDate;
            } else {
                comparison = aValue.localeCompare(bValue, 'pt-BR', { sensitivity: 'base' });
            }

            return currentSort.direction === 'asc' ? comparison : -comparison;
        });

        while (tableBody.firstChild) {
            tableBody.removeChild(tableBody.firstChild);
        }

        rows.forEach((row) => tableBody.appendChild(row));
        updateSortIndicators(columnIndex);
    };

    // Atualizar indicadores de ordenacao
    const updateSortIndicators = (activeColumnIndex) => {
        const headers = document.querySelectorAll('.socious-table th');

        headers.forEach((header, index) => {
            header.classList.remove('sort-asc', 'sort-desc');
            if (index === activeColumnIndex) {
                header.classList.add(`sort-${currentSort.direction}`);
            }
        });
    };

    // Configurar ordenacao nas colunas
    const setupColumnSorting = () => {
        const headers = document.querySelectorAll('.socious-table th');
        const sortableColumns = new Set(['title', 'assignee', 'request_date', 'due_date', 'status', 'priority', 'client', 'type']);

        headers.forEach((header, index) => {
            const colKey = header.dataset.col || '';
            if (!sortableColumns.has(colKey)) {
                header.style.cursor = 'default';
                header.title = '';
                header.onclick = null;
                return;
            }

            header.style.cursor = 'pointer';
            header.title = 'Clique para ordenar';
            header.onclick = () => {
                sortTable(index, colKey);
            };
        });
    };

    return {
        setupColumnSorting
    };
})();


