// Módulo de ordenação para a visualização de tabela
const TableSortModule = (() => {
    let currentSort = { column: null, direction: 'asc' };
    
    // Ordenar tabela pela coluna
    const sortTable = (columnIndex, columnName) => {
        const tableBody = document.getElementById('sociousTableBody');
        if (!tableBody) return;
        
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        
        // Determinar direção da ordenação
        if (currentSort.column === columnName) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = columnName;
            currentSort.direction = 'asc';
        }
        
        // Ordenar linhas
        rows.sort((a, b) => {
            const aValue = a.cells[columnIndex].textContent.trim();
            const bValue = b.cells[columnIndex].textContent.trim();
            
            // Verificar se são valores numéricos ou datas
            const aNum = parseFloat(aValue.replace(',', '.'));
            const bNum = parseFloat(bValue.replace(',', '.'));
            const aDate = new Date(aValue);
            const bDate = new Date(bValue);
            
            let comparison = 0;
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
                // Comparação numérica
                comparison = aNum - bNum;
            } else if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
                // Comparação de datas
                comparison = aDate - bDate;
            } else {
                // Comparação de texto
                comparison = aValue.localeCompare(bValue, 'pt-BR', { sensitivity: 'base' });
            }
            
            return currentSort.direction === 'asc' ? comparison : -comparison;
        });
        
        // Remover todas as linhas
        while (tableBody.firstChild) {
            tableBody.removeChild(tableBody.firstChild);
        }
        
        // Adicionar linhas ordenadas
        rows.forEach(row => tableBody.appendChild(row));
        
        // Atualizar indicadores de ordenação nos cabeçalhos
        updateSortIndicators(columnIndex);
    };
    
    // Atualizar indicadores de ordenação
    const updateSortIndicators = (activeColumnIndex) => {
        const headers = document.querySelectorAll('.socious-table th');
        
        headers.forEach((header, index) => {
            header.classList.remove('sort-asc', 'sort-desc');
            
            if (index === activeColumnIndex) {
                header.classList.add(`sort-${currentSort.direction}`);
            }
        });
    };
    
    // Configurar ordenação nas colunas
    const setupColumnSorting = () => {
        const headers = document.querySelectorAll('.socious-table th');
        const sortableColumns = {
            1: 'title',        // Tarefa
            2: 'assignee',     // Responsável
            3: 'requestDate',  // Data Solicitação
            4: 'status',       // Status
            5: 'priority',     // Prioridade
            6: 'client',       // Cliente
            7: 'type'          // Tipo
        };
        
        headers.forEach((header, index) => {
            if (sortableColumns[index]) {
                header.style.cursor = 'pointer';
                header.title = 'Clique para ordenar';
                
                header.addEventListener('click', () => {
                    sortTable(index, sortableColumns[index]);
                });
            }
        });
    };
    
    return {
        setupColumnSorting
    };
})();