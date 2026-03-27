const DashboardModule = (() => {
    const elements = {
        totalTasks: document.getElementById('dashTotalTasks'),
        overdueTasks: document.getElementById('dashOverdueTasks'),
        dueSoonTasks: document.getElementById('dashDueSoonTasks'),
        completedTasks: document.getElementById('dashCompletedTasks'),
        statusChart: document.getElementById('dashStatusChart'),
        statusLegend: document.getElementById('dashStatusLegend'),
        priorityChart: document.getElementById('dashPriorityChart'),
        priorityLegend: document.getElementById('dashPriorityLegend'),
        typeChart: document.getElementById('dashTypeChart'),
        typeLegend: document.getElementById('dashTypeLegend'),
        topAssignees: document.getElementById('dashTopAssignees'),
        topClients: document.getElementById('dashTopClients'),
        upcomingList: document.getElementById('dashUpcomingList'),
    };

    let refreshTimer = null;

    const STATUS_LABELS = {
        pending: 'Pendente',
        in_progress: 'Em Andamento',
        review: 'Em Teste',
        completed: 'Concluído',
    };

    const PRIORITY_LABELS = {
        very_high: 'Muito Alta',
        high: 'Alta',
        medium: 'Média',
        low: 'Baixa',
        very_low: 'Muito Baixa',
    };

    const TYPE_LABELS = {
        new: 'Novo',
        optimization: 'Otimização',
        improvement: 'Melhoria',
        discussion: 'Para Discutir',
        suggestion: 'Sugestão',
        issue: 'Problema',
        epic: 'Épico',
    };

    const TYPE_COLORS = ['#2f8ee5', '#1f9d57', '#e67e22', '#8e44ad', '#16a085', '#f39c12', '#7f8c8d', '#d35454'];
    const STATUS_COLORS = ['#f39c12', '#2f8ee5', '#8e44ad', '#1f9d57', '#7f8c8d'];
    const PRIORITY_COLORS = ['#d9534f', '#f0ad4e', '#5cb85c', '#7f8c8d'];

    const init = async () => {
        await loadAndRender();
        window.addEventListener('tasksUpdated', loadAndRender);
        refreshTimer = setInterval(loadAndRender, 30000);
    };

    const loadAndRender = async () => {
        const tasks = await StorageModule.getTasks();
        const normalizedTasks = Array.isArray(tasks) ? tasks : [];

        const now = getDateAtStartOfDay(new Date());
        const sevenDays = new Date(now);
        sevenDays.setDate(sevenDays.getDate() + 7);

        const openTasks = normalizedTasks.filter((task) => String(task.status || '') !== 'completed');
        const completedTasks = normalizedTasks.filter((task) => String(task.status || '') === 'completed');

        const overdueTasks = openTasks.filter((task) => {
            const due = parseDate(task.due_date);
            return due && due < now;
        });

        const dueSoonTasks = openTasks.filter((task) => {
            const due = parseDate(task.due_date);
            return due && due >= now && due <= sevenDays;
        });

        setText(elements.totalTasks, normalizedTasks.length);
        setText(elements.overdueTasks, overdueTasks.length);
        setText(elements.dueSoonTasks, dueSoonTasks.length);
        setText(elements.completedTasks, completedTasks.length);

        renderDonutChart(
            elements.statusChart,
            elements.statusLegend,
            countBy(normalizedTasks, (task) => STATUS_LABELS[task.status] || 'Sem status')
            ,
            STATUS_COLORS
        );

        renderDonutChart(
            elements.priorityChart,
            elements.priorityLegend,
            countBy(normalizedTasks, (task) => PRIORITY_LABELS[normalizePriority(task.priority)] || 'Sem prioridade')
            ,
            PRIORITY_COLORS
        );

        renderDonutChart(
            elements.typeChart,
            elements.typeLegend,
            countBy(normalizedTasks, (task) => {
                const key = String(task.type || '').trim().toLowerCase();
                if (!key) return 'Sem tipo';
                return TYPE_LABELS[normalizeType(key)] || key;
            }),
            TYPE_COLORS
        );

        renderRankedList(
            elements.topAssignees,
            countBy(openTasks, (task) => {
                const assignee = task.assignee_user?.name || task.assignee || '';
                return String(assignee || '').trim() || 'Não atribuido';
            }),
            6
        );

        renderRankedList(
            elements.topClients,
            countBy(openTasks, (task) => String(task.client || '').trim() || 'Sem cliente'),
            6
        );

        renderUpcoming(
            elements.upcomingList,
            [...openTasks]
                .filter((task) => parseDate(task.due_date))
                .sort((a, b) => parseDate(a.due_date) - parseDate(b.due_date))
                .slice(0, 8),
            now
        );
    };

    const renderRankedList = (container, dataMap, limit = 6) => {
        if (!container) return;
        const entries = sortEntries(dataMap).slice(0, limit);

        if (!entries.length) {
            container.innerHTML = '<div class="dashboard-empty">Sem dados.</div>';
            return;
        }

        container.innerHTML = entries
            .map(([label, value]) => `
                <div class="dashboard-row">
                    <span class="dashboard-row-label">${escapeHtml(label)}</span>
                    <span class="dashboard-row-value">${value}</span>
                </div>
            `)
            .join('');
    };

    const renderDonutChart = (canvas, legendContainer, dataMap, colors) => {
        if (!canvas || !legendContainer) return;
        const entries = sortEntries(dataMap);

        if (!entries.length) {
            clearCanvas(canvas);
            legendContainer.innerHTML = '<div class="dashboard-empty">Sem dados.</div>';
            return;
        }

        const total = entries.reduce((sum, [, value]) => sum + value, 0) || 1;
        drawDonut(canvas, entries, total, colors);

        legendContainer.innerHTML = entries
            .map(([label, value], index) => {
                const pct = Math.round((value / total) * 100);
                const color = colors[index % colors.length];
                return `
                    <div class="dashboard-legend-row">
                        <span class="dashboard-legend-swatch" style="background:${color};"></span>
                        <span class="dashboard-legend-label">${escapeHtml(label)}</span>
                        <span class="dashboard-legend-value">${value} (${pct}%)</span>
                    </div>
                `;
            })
            .join('');
    };

    const clearCanvas = (canvas) => {
        const context = canvas.getContext('2d');
        if (!context) return;
        const size = 220;
        canvas.width = size;
        canvas.height = size;
        context.clearRect(0, 0, size, size);
    };

    const drawDonut = (canvas, entries, total, colors) => {
        const context = canvas.getContext('2d');
        if (!context) return;

        const displaySize = Math.max(140, Math.round(canvas.clientWidth || 220));
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(displaySize * dpr);
        canvas.height = Math.round(displaySize * dpr);
        canvas.style.width = `${displaySize}px`;
        canvas.style.height = `${displaySize}px`;

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.scale(dpr, dpr);

        const centerX = displaySize / 2;
        const centerY = displaySize / 2;
        const radius = Math.round(displaySize * 0.39);
        const lineWidth = Math.max(20, Math.round(displaySize * 0.16));
        let currentAngle = -Math.PI / 2;

        entries.forEach(([, value], index) => {
            const sliceAngle = (value / total) * Math.PI * 2;
            context.beginPath();
            context.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            context.strokeStyle = colors[index % colors.length];
            context.lineWidth = lineWidth;
            context.lineCap = 'butt';
            context.stroke();
            currentAngle += sliceAngle;
        });

        context.beginPath();
        context.arc(centerX, centerY, radius - lineWidth / 2, 0, Math.PI * 2);
        context.fillStyle = '#ffffff';
        context.fill();

        context.fillStyle = '#2c3f53';
        context.font = '600 14px Arial, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(`${total} tarefas`, centerX, centerY);
    };

    const renderUpcoming = (container, tasks, today) => {
        if (!container) return;

        if (!tasks.length) {
            container.innerHTML = '<div class="dashboard-empty">Sem tarefas com prazo definido.</div>';
            return;
        }

        container.innerHTML = tasks
            .map((task) => {
                const due = parseDate(task.due_date);
                const overdue = due && due < today;
                const dueLabel = formatDate(task.due_date);
                const statusLabel = STATUS_LABELS[task.status] || 'Sem status';
                const clientLabel = String(task.client || '').trim() || 'Sem cliente';
                return `
                    <div class="dashboard-upcoming-item ${overdue ? 'overdue' : ''}">
                        <div class="dashboard-upcoming-title">${escapeHtml(task.title || 'Sem titulo')}</div>
                        <div class="dashboard-upcoming-meta">Prazo: ${escapeHtml(dueLabel)} | Status: ${escapeHtml(statusLabel)} | Cliente: ${escapeHtml(clientLabel)}</div>
                    </div>
                `;
            })
            .join('');
    };

    const countBy = (items, keyFn) => {
        const map = new Map();
        (items || []).forEach((item) => {
            const key = keyFn(item);
            map.set(key, (map.get(key) || 0) + 1);
        });
        return map;
    };

    const sortEntries = (map) => {
        return [...map.entries()].sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            return String(a[0]).localeCompare(String(b[0]), 'pt-BR');
        });
    };

    const parseDate = (value) => {
        if (!value) return null;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return getDateAtStartOfDay(date);
    };

    const normalizePriority = (value) => {
        const safe = String(value || '').trim().toLowerCase();
        const map = {
            very_high: 'very_high',
            urgent: 'very_high',
            urgente: 'very_high',
            high: 'high',
            medium: 'medium',
            normal: 'medium',
            low: 'low',
            very_low: 'very_low',
        };
        return map[safe] || 'medium';
    };

    const normalizeType = (value) => {
        const safe = String(value || '').trim().toLowerCase();
        const map = {
            task: 'new',
            new: 'new',
            bug: 'issue',
            issue: 'issue',
            optimization: 'optimization',
            improvement: 'improvement',
            discussion: 'discussion',
            suggestion: 'suggestion',
            epic: 'epic',
        };
        return map[safe] || safe;
    };

    const getDateAtStartOfDay = (date) => {
        const normalized = new Date(date);
        normalized.setHours(0, 0, 0, 0);
        return normalized;
    };

    const formatDate = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('pt-BR');
    };

    const setText = (element, value) => {
        if (!element) return;
        element.textContent = String(value);
    };

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = String(text ?? '');
        return div.innerHTML;
    };

    window.addEventListener('beforeunload', () => {
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    });

    return { init };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DashboardModule.init());
} else {
    DashboardModule.init();
}



