const DashboardModule = (() => {
    const elements = {
        totalTasks: document.getElementById('dashTotalTasks'),
        overdueTasks: document.getElementById('dashOverdueTasks'),
        dueSoonTasks: document.getElementById('dashDueSoonTasks'),
        completedTasks: document.getElementById('dashCompletedTasks'),
        statusBreakdown: document.getElementById('dashStatusBreakdown'),
        priorityBreakdown: document.getElementById('dashPriorityBreakdown'),
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
        high: 'Alta',
        medium: 'Média',
        low: 'Baixa',
    };

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

        renderBreakdown(
            elements.statusBreakdown,
            countBy(normalizedTasks, (task) => STATUS_LABELS[task.status] || 'Sem status')
        );

        renderBreakdown(
            elements.priorityBreakdown,
            countBy(normalizedTasks, (task) => PRIORITY_LABELS[task.priority] || 'Sem prioridade')
        );

        renderRankedList(
            elements.topAssignees,
            countBy(openTasks, (task) => {
                const assignee = task.assignee_user?.name || task.assignee || '';
                return String(assignee || '').trim() || 'Não atribuído';
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

    const renderBreakdown = (container, dataMap) => {
        if (!container) return;
        const entries = sortEntries(dataMap);

        if (!entries.length) {
            container.innerHTML = '<div class="dashboard-empty">Sem dados.</div>';
            return;
        }

        const total = entries.reduce((sum, [, value]) => sum + value, 0) || 1;
        container.innerHTML = entries
            .map(([label, value]) => {
                const pct = Math.round((value / total) * 100);
                return `
                    <div>
                        <div class="dashboard-row">
                            <span class="dashboard-row-label">${escapeHtml(label)}</span>
                            <span class="dashboard-row-value">${value} (${pct}%)</span>
                        </div>
                        <div class="dashboard-bar-track">
                            <div class="dashboard-bar-fill" style="width:${pct}%;"></div>
                        </div>
                    </div>
                `;
            })
            .join('');
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
                        <div class="dashboard-upcoming-title">${escapeHtml(task.title || 'Sem título')}</div>
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
