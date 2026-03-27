
// scripts/relatorios.js
const RelatoriosModule = (() => {
    const tabs = Array.from(document.querySelectorAll('.reports-tab-btn[data-tab]'));
    const panels = Array.from(document.querySelectorAll('.reports-panel[data-panel]'));

    const newReportBtn = document.getElementById('newReportBtn');
    const searchInput = document.getElementById('reportSearchInput');
    const scopeFilter = document.getElementById('reportScopeFilter');

    const listBodyEl = document.getElementById('reportsListBody');
    const builderListBodyEl = document.getElementById('reportsBuilderListBody');

    const reportEditorModal = document.getElementById('reportEditorModal');
    const reportEditorTitle = document.getElementById('reportEditorTitle');
    const closeReportEditorModal = document.getElementById('closeReportEditorModal');
    const cancelReportEditorBtn = document.getElementById('cancelReportEditorBtn');

    const builderForm = document.getElementById('reportBuilderForm');
    const reportIdInput = document.getElementById('reportIdInput');
    const reportNameInput = document.getElementById('reportNameInput');
    const reportDescriptionInput = document.getElementById('reportDescriptionInput');
    const reportVisibilityInput = document.getElementById('reportVisibilityInput');

    const reportFilterStatus = document.getElementById('reportFilterStatus');
    const reportFilterPriority = document.getElementById('reportFilterPriority');
    const reportFilterType = document.getElementById('reportFilterType');
    const reportFilterClient = document.getElementById('reportFilterClient');
    const reportFilterAssignee = document.getElementById('reportFilterAssignee');
    const reportFilterText = document.getElementById('reportFilterText');

    const reportColumnsGrid = document.getElementById('reportColumnsGrid');
    const reportSelectedColumnsOrder = document.getElementById('reportSelectedColumnsOrder');
    const reportGroupsCard = document.getElementById('reportGroupsCard');
    const reportGroupsGrid = document.getElementById('reportGroupsGrid');
    const reportSortColumn = document.getElementById('reportSortColumn');
    const reportSortDirection = document.getElementById('reportSortDirection');

    const previewTitle = document.getElementById('reportResultsTitle');
    const previewMeta = document.getElementById('reportResultsMeta');
    const previewHead = document.getElementById('reportResultsHead');
    const previewBody = document.getElementById('reportResultsBody');
    const reportViewModal = document.getElementById('reportViewModal');
    const reportViewTitle = document.getElementById('reportViewTitle');
    const reportViewMeta = document.getElementById('reportViewMeta');
    const reportViewHead = document.getElementById('reportViewHead');
    const reportViewBody = document.getElementById('reportViewBody');
    const closeReportViewModal = document.getElementById('closeReportViewModal');

    const REPORT_COLUMNS = [
        { key: 'id', label: 'ID', get: (task) => {
            const id = Number(task.id);
            if (Number.isFinite(id) && id > 0) return String(id);
            return String(task.id || '-');
        } },
        { key: 'title', label: 'Título', get: (task) => String(task.title || '') },
        { key: 'status', label: 'Status', get: (task) => statusLabel(task.status) },
        { key: 'priority', label: 'Prioridade', get: (task) => priorityLabel(task.priority) },
        { key: 'type', label: 'Tipo', get: (task) => typeLabel(task.type) },
        { key: 'assignee', label: 'Responsável', get: (task) => String(task.assignee_user?.name || task.assignee || '-') },
        { key: 'client', label: 'Cliente', get: (task) => String(task.client || '-') },
        { key: 'request_date', label: 'Data solicitacao', get: (task) => formatDate(task.request_date) },
        { key: 'due_date', label: 'Data entrega', get: (task) => formatDate(task.due_date) },
        { key: 'jira', label: 'Jira', get: (task) => String(task.jira || '-') },
        { key: 'observation', label: 'Observação', get: (task) => String(task.observation || '-') },
        { key: 'created_at', label: 'Criado em', get: (task) => formatDateTime(task.created_at) },
    ];

    const DEFAULT_DEFINITION = {
        columns: ['id', 'title', 'status', 'priority', 'assignee', 'client', 'due_date'],
        filters: { status: '', priority: '', type: '', client: '', assignee: '', text: '' },
        sorting: { column: '', direction: 'asc' }
    };

    let reports = [];
    let shares = [];
    let groups = [];
    let currentUserId = null;
    let currentUserName = '';
    let currentUserGroupId = null;
    let currentUserRole = 'user';
    let reportPermissions = {
        view: true,
        create: true,
        edit: true,
        share: true,
        export: true,
    };
    let builderSelectedColumns = [...DEFAULT_DEFINITION.columns];
    let initialized = false;

    const notify = (message, type = 'info') => {
        if (window.UtilsModule && typeof window.UtilsModule.showNotification === 'function') {
            window.UtilsModule.showNotification(message, type);
            return;
        }
        console.log(`[${type}] ${message}`);
    };
    const showPermissionDenied = (message) => {
        const fallback = String(message || 'Você não tem permissão para executar esta ação.');
        if (window.UtilsModule && typeof window.UtilsModule.showPermissionDeniedModal === 'function') {
            window.UtilsModule.showPermissionDeniedModal(fallback);
            return;
        }

        let overlay = document.getElementById('permissionDeniedModal');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'permissionDeniedModal';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.right = '0';
            overlay.style.bottom = '0';
            overlay.style.display = 'none';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.background = 'rgba(0,0,0,.55)';
            overlay.style.zIndex = '99999';
            overlay.innerHTML = `
                <div style="width:calc(100% - 32px); max-width:480px; background:#fff; border-radius:10px; box-shadow:0 20px 50px rgba(0,0,0,.25); padding:16px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                        <h3 style="margin:0; font-size:20px; color:#223b54;">Acesso Negado</h3>
                        <button type="button" data-close-permission-modal style="border:0; background:transparent; font-size:24px; cursor:pointer; color:#6b7f93;">&times;</button>
                    </div>
                    <p id="permissionDeniedModalMessage" style="margin: 8px 0 0; color:#3f5872;"></p>
                    <div style="display:flex; justify-content:flex-end; margin-top:16px;">
                        <button type="button" class="btn btn-primary" data-close-permission-modal>Entendi</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.querySelectorAll('[data-close-permission-modal]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    overlay.style.display = 'none';
                });
            });
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) overlay.style.display = 'none';
            });
        }

        const messageEl = document.getElementById('permissionDeniedModalMessage');
        if (messageEl) messageEl.textContent = fallback;
        overlay.style.display = 'flex';
    };

    const showLoading = (message) => {
        if (window.UtilsModule && typeof window.UtilsModule.showLoading === 'function') {
            window.UtilsModule.showLoading(message || 'Carregando relatorios...');
        }
    };

    const hideLoading = () => {
        if (window.UtilsModule && typeof window.UtilsModule.hideLoading === 'function') {
            window.UtilsModule.hideLoading();
        }
    };

    const escapeHtml = (value) => {
        if (window.UtilsModule && typeof window.UtilsModule.escapeHtml === 'function') {
            return window.UtilsModule.escapeHtml(String(value ?? ''));
        }
        const div = document.createElement('div');
        div.textContent = String(value ?? '');
        return div.innerHTML;
    };

    const formatDate = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('pt-BR');
    };

    const formatDateTime = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const statusLabel = (status) => ({ pending: 'Pendente', in_progress: 'Em andamento', review: 'Em teste', completed: 'Concluído' }[String(status || '')] || String(status || '-'));
    const priorityLabel = (priority) => {
        if (window.UtilsModule && typeof window.UtilsModule.getPriorityText === 'function') {
            return window.UtilsModule.getPriorityText(priority).text;
        }
        return String(priority || '-');
    };

    const typeLabel = (type) => {
        if (window.UtilsModule && typeof window.UtilsModule.getTypeText === 'function') {
            return window.UtilsModule.getTypeText(type).text;
        }
        return String(type || '-');
    };

    const normalizeDefinition = (rawDefinition) => {
        const input = rawDefinition && typeof rawDefinition === 'object' ? rawDefinition : {};
        const selectedColumns = Array.isArray(input.columns) ? input.columns : DEFAULT_DEFINITION.columns;
        const validColumns = selectedColumns.filter((col) => REPORT_COLUMNS.some((rc) => rc.key === col));
        const sortingColumn = String(input?.sorting?.column || '');
        const validSortingColumn = REPORT_COLUMNS.some((col) => col.key === sortingColumn) ? sortingColumn : '';
        const sortingDirection = String(input?.sorting?.direction || 'asc') === 'desc' ? 'desc' : 'asc';
        const normalizedPriority = window.UtilsModule && typeof window.UtilsModule.normalizePriorityKey === 'function'
            ? window.UtilsModule.normalizePriorityKey(input?.filters?.priority || '')
            : String(input?.filters?.priority || '');
        const normalizedType = window.UtilsModule && typeof window.UtilsModule.normalizeTypeKey === 'function'
            ? window.UtilsModule.normalizeTypeKey(input?.filters?.type || '')
            : String(input?.filters?.type || '');
        return {
            columns: validColumns.length ? validColumns : [...DEFAULT_DEFINITION.columns],
            filters: {
                status: String(input?.filters?.status || ''),
                priority: normalizedPriority || '',
                type: normalizedType || '',
                client: String(input?.filters?.client || ''),
                assignee: String(input?.filters?.assignee || ''),
                text: String(input?.filters?.text || ''),
            },
            sorting: {
                column: validSortingColumn,
                direction: sortingDirection,
            },
        };
    };

    const openEditorModal = () => { if (reportEditorModal) reportEditorModal.style.display = 'flex'; };
    const closeEditorModal = () => { if (reportEditorModal) reportEditorModal.style.display = 'none'; };
    const openViewModal = () => { if (reportViewModal) reportViewModal.style.display = 'flex'; };
    const closeViewModal = () => { if (reportViewModal) reportViewModal.style.display = 'none'; };

    const loadContext = async () => {
        const { data: sessionData, error: sessionError } = await window.dbClient.auth.getSession();
        if (sessionError) throw sessionError;
        const user = sessionData?.session?.user;
        if (!user?.id) throw new Error('Usuário não autenticado.');

        currentUserId = user.id;
        currentUserName = String(user.user_metadata?.full_name || user.email || 'Operador');

        const { data: currentUserRow, error: currentUserError } = await window.dbClient
            .from('app_users')
            .select('id, role, permission_group_id, email, raw_user_meta_data')
            .eq('id', currentUserId)
            .single();

        if (!currentUserError && currentUserRow) {
            currentUserGroupId = currentUserRow.permission_group_id || null;
            currentUserRole = String(currentUserRow.role || user.user_metadata?.role || 'user').toLowerCase();
            currentUserName = String(currentUserRow.raw_user_meta_data?.full_name || currentUserRow.email || currentUserName);
        }
    };

    const loadGroups = async () => {
        const { data, error } = await window.dbClient.from('permission_groups').select('id,name,status').order('name', { ascending: true });
        if (error) throw error;
        groups = (Array.isArray(data) ? data : []).filter((g) => String(g.status || 'active') === 'active');
    };

    const hasPermission = (optionKey) => reportPermissions[String(optionKey || '')] === true;

    const loadReportPermissions = async () => {
        reportPermissions = {
            view: false,
            create: false,
            edit: false,
            share: false,
            export: false,
        };

        if (!currentUserGroupId) return;

        const { data, error } = await window.dbClient
            .from('permission_group_rules')
            .select('option_key, allowed')
            .eq('group_id', currentUserGroupId)
            .eq('screen_key', 'relatorios');
        if (error) throw error;

        const rows = Array.isArray(data) ? data : [];
        if (!rows.length) return;

        const allowed = new Set(
            rows
                .filter((row) => row.allowed !== false)
                .map((row) => String(row.option_key || '').trim())
                .filter(Boolean)
        );

        reportPermissions = {
            view: allowed.has('view'),
            create: allowed.has('create'),
            edit: allowed.has('edit'),
            share: allowed.has('share'),
            export: allowed.has('export'),
        };
    };

    const applyPermissionsToUi = () => {
        if (newReportBtn) {
            newReportBtn.disabled = false;
            newReportBtn.title = hasPermission('create') ? '' : 'Sem permissão para criar relatórios';
        }

        if (reportVisibilityInput) {
            const canShare = hasPermission('share');
            Array.from(reportVisibilityInput.options).forEach((option) => {
                const value = String(option.value || '');
                if (value === 'groups' || value === 'public') {
                    option.disabled = !canShare;
                }
            });
            if (!canShare && reportVisibilityInput.value !== 'private') {
                reportVisibilityInput.value = 'private';
            }
        }

        const builderTabBtn = tabs.find((btn) => btn.dataset.tab === 'builder');
        if (!builderTabBtn) return;

        const canUseBuilder = hasPermission('view');
        builderTabBtn.disabled = !canUseBuilder;
        builderTabBtn.style.opacity = canUseBuilder ? '' : '0.5';
        builderTabBtn.title = canUseBuilder ? '' : 'Sem permissão para usar o construtor';
        if (!canUseBuilder && builderTabBtn.classList.contains('active')) {
            setActiveTab('list');
        }
    };

const loadReports = async () => {
        const { data, error } = await window.dbClient.from('task_report_definitions').select('*').order('updated_at', { ascending: false });
        if (error) throw error;
        reports = (Array.isArray(data) ? data : []).map((item) => ({
            ...item,
            definition_json: normalizeDefinition(item.definition_json),
            visibility: ['private', 'groups', 'public'].includes(String(item.visibility || '')) ? String(item.visibility) : 'private',
        }));
    };

    const loadShares = async () => {
        const { data, error } = await window.dbClient.from('task_report_group_shares').select('*');
        if (error) throw error;
        shares = Array.isArray(data) ? data : [];
    };
    const getReportShares = (reportId) => shares.filter((s) => String(s.report_id) === String(reportId));
    const getGroupName = (groupId) => String(groups.find((g) => String(g.id) === String(groupId))?.name || 'Grupo');

    const canViewReport = (report) => {
        if (!hasPermission('view')) return false;
        if (!report) return false;
        if (String(report.owner_user_id) === String(currentUserId)) return true;
        if (report.visibility === 'public') return true;
        if (report.visibility !== 'groups' || !currentUserGroupId) return false;
        return getReportShares(report.id).some((s) => String(s.group_id) === String(currentUserGroupId));
    };

    const canEditReport = (report) => hasPermission('edit') && String(report?.owner_user_id || '') === String(currentUserId || '');

    const getVisibilityLabel = (report) => {
        if (report.visibility === 'public') return 'Todos os operadores';
        if (report.visibility === 'groups') {
            const names = getReportShares(report.id).map((s) => getGroupName(s.group_id));
            return names.length ? `Grupos: ${names.join(', ')}` : 'Grupos selecionados';
        }
        return 'Somente criador';
    };

    const getOwnerName = (report) => (String(report.owner_user_id) === String(currentUserId) ? currentUserName : String(report.owner_name || 'Outro operador'));

    const getAccessibleReports = () => {
        const query = String(searchInput?.value || '').trim().toLowerCase();
        const scope = String(scopeFilter?.value || 'all');

        return reports
            .filter((report) => canViewReport(report))
            .filter((report) => {
                if (scope === 'mine') return String(report.owner_user_id) === String(currentUserId);
                if (scope === 'shared') return String(report.owner_user_id) !== String(currentUserId);
                return true;
            })
            .filter((report) => {
                if (!query) return true;
                return `${report.name || ''} ${report.description || ''}`.toLowerCase().includes(query);
            });
    };

    const applyTaskFilters = (tasks, filters) => {
        const f = filters || {};
        const status = String(f.status || '').trim();
        const priority = String(f.priority || '').trim();
        const type = String(f.type || '').trim();
        const client = String(f.client || '').trim().toLowerCase();
        const assignee = String(f.assignee || '').trim().toLowerCase();
        const text = String(f.text || '').trim().toLowerCase();

        return (Array.isArray(tasks) ? tasks : []).filter((task) => {
            if (status && String(task.status || '') !== status) return false;
            const taskPriority = window.UtilsModule && typeof window.UtilsModule.normalizePriorityKey === 'function'
                ? window.UtilsModule.normalizePriorityKey(task.priority || '')
                : String(task.priority || '');
            const taskType = window.UtilsModule && typeof window.UtilsModule.normalizeTypeKey === 'function'
                ? window.UtilsModule.normalizeTypeKey(task.type || '')
                : String(task.type || '');

            if (priority && taskPriority !== priority) return false;
            if (type && taskType !== type) return false;
            if (client && !String(task.client || '').toLowerCase().includes(client)) return false;
            if (assignee && !String(task.assignee_user?.name || task.assignee_user?.email || task.assignee || '').toLowerCase().includes(assignee)) return false;
            if (text) {
                const haystack = `${task.title || ''} ${task.description || ''} ${task.observation || ''} ${task.client || ''} ${task.jira || ''}`.toLowerCase();
                if (!haystack.includes(text)) return false;
            }
            return true;
        });
    };

    const compareValues = (left, right, direction) => {
        const a = String(left ?? '').trim();
        const b = String(right ?? '').trim();
        const aNum = Number(a.replace(',', '.'));
        const bNum = Number(b.replace(',', '.'));
        const bothNumbers = Number.isFinite(aNum) && Number.isFinite(bNum) && a !== '' && b !== '';

        let baseResult = 0;
        if (bothNumbers) {
            baseResult = aNum === bNum ? 0 : (aNum > bNum ? 1 : -1);
        } else {
            baseResult = a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true });
        }

        return direction === 'desc' ? baseResult * -1 : baseResult;
    };

    const applyTaskSorting = (tasks, sorting) => {
        const columnKey = String(sorting?.column || '');
        if (!columnKey) return [...tasks];

        const columnDef = REPORT_COLUMNS.find((col) => col.key === columnKey);
        if (!columnDef) return [...tasks];

        const direction = String(sorting?.direction || 'asc') === 'desc' ? 'desc' : 'asc';
        const data = [...tasks];
        data.sort((a, b) => compareValues(columnDef.get(a), columnDef.get(b), direction));
        return data;
    };

    const getReportDataset = async (report) => {
        const definition = normalizeDefinition(report.definition_json);
        const tasks = await StorageModule.getTasks();
        const filteredRows = applyTaskSorting(applyTaskFilters(tasks, definition.filters), definition.sorting);
        const selectedColumns = definition.columns.map((key) => REPORT_COLUMNS.find((c) => c.key === key)).filter(Boolean);
        return { filteredRows, selectedColumns };
    };

    const renderPreview = (report, rows, selectedColumns) => {
        previewTitle.textContent = `Preview: ${report.name || 'Relatório'}`;
        previewMeta.textContent = `${rows.length} registro(s) encontrado(s). Exibindo no maximo 5.`;

        if (!selectedColumns.length) {
            previewHead.innerHTML = '';
            previewBody.innerHTML = '<tr><td class="report-empty">Nenhuma coluna selecionada no relatorio.</td></tr>';
            return;
        }

        previewHead.innerHTML = `<tr>${selectedColumns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr>`;
        const previewRows = rows.slice(0, 5);

        if (!previewRows.length) {
            previewBody.innerHTML = `<tr><td colspan="${selectedColumns.length}" class="report-empty">Nenhum dado para os filtros selecionados.</td></tr>`;
            return;
        }

        previewBody.innerHTML = previewRows.map((task) => `
            <tr>
                ${selectedColumns.map((c) => `<td>${escapeHtml(c.get(task))}</td>`).join('')}
            </tr>
        `).join('');
    };

    const openPreviewForReport = async (reportId, switchToBuilder = false) => {
        const report = reports.find((r) => String(r.id) === String(reportId));
        if (!report) {
            notify('Relatório não encontrado.', 'warning');
            return;
        }
        if (!canViewReport(report)) {
            showPermissionDenied('Você não tem permissão para visualizar este relatório.');
            return;
        }

        try {
            showLoading('Gerando preview do relatorio...');
            const { filteredRows, selectedColumns } = await getReportDataset(report);
            renderPreview(report, filteredRows, selectedColumns);
            if (switchToBuilder) setActiveTab('builder');
        } catch (error) {
            console.error('Erro ao gerar preview:', error);
            notify(error?.message || 'Não foi possível gerar o preview.', 'error');
        } finally {
            hideLoading();
        }
    };

    const renderReportView = (report, rows, selectedColumns) => {
        if (!reportViewTitle || !reportViewMeta || !reportViewHead || !reportViewBody) return;

        reportViewTitle.textContent = report.name || 'Relatório';
        reportViewMeta.textContent = `${rows.length} registro(s) encontrado(s).`;

        if (!selectedColumns.length) {
            reportViewHead.innerHTML = '';
            reportViewBody.innerHTML = '<tr><td class="report-empty">Nenhuma coluna selecionada no relatorio.</td></tr>';
            return;
        }

        reportViewHead.innerHTML = `<tr>${selectedColumns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr>`;

        if (!rows.length) {
            reportViewBody.innerHTML = `<tr><td colspan="${selectedColumns.length}" class="report-empty">Nenhum dado para os filtros selecionados.</td></tr>`;
            return;
        }

        reportViewBody.innerHTML = rows.map((task) => `
            <tr>
                ${selectedColumns.map((c) => `<td>${escapeHtml(c.get(task))}</td>`).join('')}
            </tr>
        `).join('');
    };

    const openReportForView = async (reportId) => {
        const report = reports.find((r) => String(r.id) === String(reportId));
        if (!report) {
            notify('Relatório não encontrado.', 'warning');
            return;
        }
        if (!canViewReport(report)) {
            showPermissionDenied('Você não tem permissão para visualizar este relatório.');
            return;
        }

        try {
            showLoading('Abrindo relatorio...');
            const { filteredRows, selectedColumns } = await getReportDataset(report);
            renderReportView(report, filteredRows, selectedColumns);
            openViewModal();
        } catch (error) {
            console.error('Erro ao abrir relatorio:', error);
            notify(error?.message || 'Não foi possível abrir o relatorio.', 'error');
        } finally {
            hideLoading();
        }
    };

    const exportExcel = (report, rows, selectedColumns) => {
        const safeName = String(report.name || 'relatorio').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const tableHead = `<tr>${selectedColumns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr>`;
        const tableBody = rows.map((row) => `<tr>${selectedColumns.map((c) => `<td>${escapeHtml(c.get(row))}</td>`).join('')}</tr>`).join('');
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
            table{border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:12px}
            th,td{border:1px solid #d8e3ef;padding:6px 8px;text-align:left;vertical-align:top}
            th{background:#f5f9fd;font-weight:700}
        </style></head><body><table><thead>${tableHead}</thead><tbody>${tableBody}</tbody></table></body></html>`;
        const blob = new Blob([`\ufeff${html}`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${safeName || 'relatorio'}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const exportPdf = (report, rows, selectedColumns) => {
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(report.name || 'Relatório')}</title>
<style>body{font-family:Arial,sans-serif;padding:16px;color:#223b54}h1{font-size:18px;margin:0 0 8px}p{font-size:12px;color:#4d657c}
table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #d8e3ef;padding:6px 8px;font-size:12px;text-align:left;vertical-align:top}
th{background:#f5f9fd}</style></head><body>
<h1>${escapeHtml(report.name || 'Relatório')}</h1><p>${escapeHtml(report.description || '')}</p>
<table><thead><tr>${selectedColumns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr></thead>
<tbody>${rows.map((row) => `<tr>${selectedColumns.map((c) => `<td>${escapeHtml(c.get(row))}</td>`).join('')}</tr>`).join('')}</tbody></table>
<script>window.onload=function(){window.print();}</script></body></html>`;

        const win = window.open('', '_blank');
        if (!win) {
            notify('Não foi possível abrir a janela de impressão do PDF.', 'warning');
            return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
    };

    const exportReport = async (reportId, format) => {
        if (!hasPermission('export')) {
            showPermissionDenied('Você não tem permissão para exportar relatórios.');
            return;
        }
        const report = reports.find((r) => String(r.id) === String(reportId));
        if (!report) {
            notify('Relatório não encontrado.', 'warning');
            return;
        }
        if (!canViewReport(report)) {
            showPermissionDenied('Você não tem permissão para visualizar este relatório.');
            return;
        }

        try {
            showLoading('Preparando exportacao...');
            const { filteredRows, selectedColumns } = await getReportDataset(report);
            if (!selectedColumns.length) {
                notify('Relatório sem colunas selecionadas.', 'warning');
                return;
            }

            if (format === 'pdf') {
                exportPdf(report, filteredRows, selectedColumns);
                notify('Exportacao PDF aberta para impressão.', 'success');
                return;
            }

            exportExcel(report, filteredRows, selectedColumns);
            notify('Exportacao Excel concluída.', 'success');
        } catch (error) {
            console.error('Erro ao exportar relatorio:', error);
            notify(error?.message || 'Não foi possível exportar o relatorio.', 'error');
        } finally {
            hideLoading();
        }
    };
    const renderList = () => {
        if (!listBodyEl) return;
        if (!hasPermission('view')) {
            listBodyEl.innerHTML = '<tr><td colspan="6" class="report-empty">Você não tem permissão para visualizar relatórios.</td></tr>';
            return;
        }
        const items = getAccessibleReports();

        if (!items.length) {
            listBodyEl.innerHTML = '<tr><td colspan="6" class="report-empty">Nenhum relatório encontrado.</td></tr>';
            return;
        }

        listBodyEl.innerHTML = items.map((report) => `
            <tr class="report-click-row" data-run-report="${escapeHtml(report.id)}" title="Clique para abrir o relatorio">
                <td>${escapeHtml(report.name || '-')}</td>
                <td>${escapeHtml(report.description || '-')}</td>
                <td>${escapeHtml(getVisibilityLabel(report))}</td>
                <td>${escapeHtml(getOwnerName(report))}</td>
                <td>${escapeHtml(formatDateTime(report.updated_at || report.created_at))}</td>
                <td>
                    <div class="report-actions">
                        <button type="button" class="btn btn-secondary" data-export="excel" data-report-id="${escapeHtml(report.id)}">Excel</button>
                        <button type="button" class="btn btn-secondary" data-export="pdf" data-report-id="${escapeHtml(report.id)}">PDF</button>
                    </div>
                </td>
            </tr>
        `).join('');

        listBodyEl.querySelectorAll('tr[data-run-report]').forEach((row) => {
            row.addEventListener('click', (event) => {
                if (event.target.closest('button[data-export]')) return;
                void openReportForView(row.getAttribute('data-run-report'));
            });
        });

        listBodyEl.querySelectorAll('button[data-export]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                void exportReport(button.getAttribute('data-report-id'), button.getAttribute('data-export'));
            });
        });
    };

    const renderBuilderList = () => {
        if (!builderListBodyEl) return;
        if (!hasPermission('view')) {
            builderListBodyEl.innerHTML = '<tr><td colspan="5" class="report-empty">Você não tem permissão para visualizar relatórios.</td></tr>';
            return;
        }
        const mine = reports.filter((report) => String(report.owner_user_id || '') === String(currentUserId || ''));

        if (!mine.length) {
            builderListBodyEl.innerHTML = '<tr><td colspan="5" class="report-empty">Nenhum relatório criado por você.</td></tr>';
            return;
        }

        builderListBodyEl.innerHTML = mine.map((report) => `
            <tr class="report-click-row" data-preview-report="${escapeHtml(report.id)}" title="Clique para visualizar preview">
                <td>${escapeHtml(report.name || '-')}</td>
                <td>${escapeHtml(report.description || '-')}</td>
                <td>${escapeHtml(getVisibilityLabel(report))}</td>
                <td>${escapeHtml(formatDateTime(report.updated_at || report.created_at))}</td>
                <td>
                    <div class="report-actions">
                        <button type="button" class="btn btn-secondary" data-edit-report="${escapeHtml(report.id)}">Editar</button>
                        <button type="button" class="btn btn-danger" data-delete-report="${escapeHtml(report.id)}">Excluir</button>
                    </div>
                </td>
            </tr>
        `).join('');

        builderListBodyEl.querySelectorAll('tr[data-preview-report]').forEach((row) => {
            row.addEventListener('click', (event) => {
                if (event.target.closest('button[data-edit-report],button[data-delete-report]')) return;
                void openPreviewForReport(row.getAttribute('data-preview-report'));
            });
        });

        builderListBodyEl.querySelectorAll('[data-edit-report]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                startEditReport(button.getAttribute('data-edit-report'));
            });
        });

        builderListBodyEl.querySelectorAll('[data-delete-report]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                void deleteReport(button.getAttribute('data-delete-report'));
            });
        });
    };

const renderColumnsGrid = () => {
        if (!reportColumnsGrid) return;
        reportColumnsGrid.innerHTML = REPORT_COLUMNS.map((column) => `
            <label class="report-check">
                <input type="checkbox" data-report-column="${escapeHtml(column.key)}" data-column-label="${escapeHtml(column.label)}">
                <span>${escapeHtml(column.label)}</span>
            </label>
        `).join('');
    };

    const renderSortColumns = () => {
        if (!reportSortColumn) return;
        const currentValue = String(reportSortColumn.value || '');
        reportSortColumn.innerHTML = `<option value="">Sem ordenacao</option>${builderSelectedColumns.map((key) => {
            const column = REPORT_COLUMNS.find((item) => item.key === key);
            if (!column) return '';
            return `<option value="${escapeHtml(column.key)}">${escapeHtml(column.label)}</option>`;
        }).join('')}`;
        if (builderSelectedColumns.includes(currentValue)) {
            reportSortColumn.value = currentValue;
        } else {
            reportSortColumn.value = '';
        }
    };

    const refreshBuilderColumnControls = () => {
        Array.from(reportColumnsGrid?.querySelectorAll('input[data-report-column]') || []).forEach((checkbox) => {
            const key = checkbox.getAttribute('data-report-column');
            checkbox.checked = builderSelectedColumns.includes(key);
        });
        renderSelectedColumnsOrder();
    };

    const setSortingValue = (columnKey, direction) => {
        if (reportSortColumn) {
            const safeColumn = builderSelectedColumns.includes(String(columnKey || '')) ? String(columnKey || '') : '';
            reportSortColumn.value = safeColumn;
        }
        if (reportSortDirection) {
            reportSortDirection.value = String(direction || 'asc') === 'desc' ? 'desc' : 'asc';
        }
    };

    const renderSelectedColumnsOrder = () => {
        if (!reportSelectedColumnsOrder) return;
        if (!builderSelectedColumns.length) {
            reportSelectedColumnsOrder.innerHTML = '<p class="report-inline-hint">Selecione ao menos uma coluna.</p>';
            renderSortColumns();
            return;
        }

        reportSelectedColumnsOrder.innerHTML = builderSelectedColumns.map((key, index) => {
            const column = REPORT_COLUMNS.find((item) => item.key === key);
            return `
                <div class="selected-column-chip">
                    <span class="selected-column-name">${escapeHtml(column?.label || key)}</span>
                    <div class="selected-column-actions">
                        <button type="button" class="btn btn-secondary" data-col-move="left" data-col-key="${escapeHtml(key)}" ${index === 0 ? 'disabled' : ''}>&larr;</button>
                        <button type="button" class="btn btn-secondary" data-col-move="right" data-col-key="${escapeHtml(key)}" ${index === builderSelectedColumns.length - 1 ? 'disabled' : ''}>&rarr;</button>
                    </div>
                </div>
            `;
        }).join('');

        reportSelectedColumnsOrder.querySelectorAll('button[data-col-move]').forEach((button) => {
            button.addEventListener('click', () => {
                const key = button.getAttribute('data-col-key');
                const direction = button.getAttribute('data-col-move');
                const currentIndex = builderSelectedColumns.findIndex((colKey) => colKey === key);
                if (currentIndex < 0) return;
                if (direction === 'left' && currentIndex > 0) {
                    [builderSelectedColumns[currentIndex - 1], builderSelectedColumns[currentIndex]] = [builderSelectedColumns[currentIndex], builderSelectedColumns[currentIndex - 1]];
                }
                if (direction === 'right' && currentIndex < builderSelectedColumns.length - 1) {
                    [builderSelectedColumns[currentIndex], builderSelectedColumns[currentIndex + 1]] = [builderSelectedColumns[currentIndex + 1], builderSelectedColumns[currentIndex]];
                }
                refreshBuilderColumnControls();
            });
        });

        renderSortColumns();
    };
    const renderGroupsGrid = () => {
        if (!reportGroupsGrid) return;
        reportGroupsGrid.innerHTML = groups.map((group) => `
            <label class="report-check">
                <input type="checkbox" data-report-group="${escapeHtml(group.id)}">
                <span>${escapeHtml(group.name || 'Grupo')}</span>
            </label>
        `).join('');
    };

    const setBuilderState = (definition, selectedGroupIds = []) => {
        const safeDef = normalizeDefinition(definition);
        builderSelectedColumns = [...safeDef.columns];

        refreshBuilderColumnControls();

        Array.from(reportGroupsGrid?.querySelectorAll('input[data-report-group]') || []).forEach((checkbox) => {
            const key = checkbox.getAttribute('data-report-group');
            checkbox.checked = selectedGroupIds.includes(key);
        });

        reportFilterStatus.value = safeDef.filters.status || '';
        reportFilterPriority.value = safeDef.filters.priority || '';
        reportFilterType.value = safeDef.filters.type || '';
        reportFilterClient.value = safeDef.filters.client || '';
        reportFilterAssignee.value = safeDef.filters.assignee || '';
        reportFilterText.value = safeDef.filters.text || '';
        setSortingValue(safeDef.sorting.column, safeDef.sorting.direction);
    };

    const resetBuilder = () => {
        reportIdInput.value = '';
        reportNameInput.value = '';
        reportDescriptionInput.value = '';
        reportVisibilityInput.value = 'private';
        setBuilderState(DEFAULT_DEFINITION, []);
        toggleGroupCard();
        if (reportEditorTitle) reportEditorTitle.textContent = 'Novo relatorio';
    };
    const toggleGroupCard = () => {
        if (!reportGroupsCard) return;
        reportGroupsCard.style.display = String(reportVisibilityInput?.value || '') === 'groups' ? '' : 'none';
    };

    const readBuilder = () => {
        const selectedColumns = builderSelectedColumns.filter((key) => REPORT_COLUMNS.some((column) => column.key === key));
        if (!selectedColumns.length) throw new Error('Selecione pelo menos uma coluna para o relatorio.');

        const selectedGroups = Array.from(reportGroupsGrid.querySelectorAll('input[data-report-group]:checked'))
            .map((input) => input.getAttribute('data-report-group'))
            .filter(Boolean);

        const visibility = String(reportVisibilityInput.value || 'private');
        if (visibility !== 'private' && !hasPermission('share')) {
            throw new Error('Você não tem permissão para compartilhar relatórios.');
        }
        if (visibility === 'groups' && !selectedGroups.length) {
            throw new Error('Selecione ao menos um grupo para compartilhar.');
        }

        const name = String(reportNameInput.value || '').trim();
        if (!name) throw new Error('Informe o nome do relatorio.');

        return {
            id: String(reportIdInput.value || '').trim(),
            name,
            description: String(reportDescriptionInput.value || '').trim() || null,
            visibility,
            definition_json: normalizeDefinition({
                columns: selectedColumns,
                filters: {
                    status: reportFilterStatus.value || '',
                    priority: reportFilterPriority.value || '',
                    type: reportFilterType.value || '',
                    client: reportFilterClient.value || '',
                    assignee: reportFilterAssignee.value || '',
                    text: reportFilterText.value || '',
                },
                sorting: {
                    column: reportSortColumn?.value || '',
                    direction: reportSortDirection?.value === 'desc' ? 'desc' : 'asc',
                },
            }),
            selectedGroups,
        };
    };

    const syncReportShares = async (reportId, selectedGroupIds) => {
        await window.dbClient.from('task_report_group_shares').delete().eq('report_id', reportId);
        if (!selectedGroupIds.length) return;
        const rows = selectedGroupIds.map((groupId) => ({ report_id: reportId, group_id: groupId, created_by: currentUserId }));
        const { error } = await window.dbClient.from('task_report_group_shares').insert(rows);
        if (error) throw error;
    };

    const saveReport = async (event) => {
        event.preventDefault();
        try {
            const payload = readBuilder();
            showLoading('Salvando relatorio...');

            let reportId = payload.id;
            if (reportId) {
                const existing = reports.find((item) => String(item.id) === String(reportId));
                if (!existing || !canEditReport(existing)) {
                    showPermissionDenied('Você não tem permissão para editar este relatório.');
                    return;
                }
                const { error } = await window.dbClient
                    .from('task_report_definitions')
                    .update({ name: payload.name, description: payload.description, visibility: payload.visibility, definition_json: payload.definition_json, updated_at: new Date().toISOString() })
                    .eq('id', reportId)
                    .eq('owner_user_id', currentUserId);
                if (error) throw error;
            } else {
                if (!hasPermission('create')) {
                    showPermissionDenied('Você não tem permissão para criar relatórios.');
                    return;
                }
                const { data, error } = await window.dbClient
                    .from('task_report_definitions')
                    .insert([{ name: payload.name, description: payload.description, visibility: payload.visibility, definition_json: payload.definition_json, owner_user_id: currentUserId }])
                    .select('*')
                    .single();
                if (error) throw error;
                reportId = String(data?.id || '');
                if (!reportId) throw new Error('Falha ao obter id do relatorio salvo.');
            }

            await syncReportShares(reportId, payload.visibility === 'groups' ? payload.selectedGroups : []);
            await refreshData();
            closeEditorModal();
            resetBuilder();
            notify('Relatório salvo com sucesso.', 'success');
        } catch (error) {
            console.error('Erro ao salvar relatorio:', error);
            const message = error?.message || 'Não foi possível salvar o relatorio.';
            if (String(message).toLowerCase().includes('permiss')) {
                showPermissionDenied(message);
            } else {
                notify(message, 'error');
            }
        } finally {
            hideLoading();
        }
    };

    const startEditReport = (reportId) => {
        const report = reports.find((item) => String(item.id) === String(reportId));
        if (!report || !canEditReport(report)) {
            showPermissionDenied('Você não tem permissão para editar este relatório.');
            return;
        }

        reportIdInput.value = report.id;
        reportNameInput.value = report.name || '';
        reportDescriptionInput.value = report.description || '';
        reportVisibilityInput.value = report.visibility || 'private';
        const groupIds = getReportShares(report.id).map((share) => String(share.group_id));
        setBuilderState(report.definition_json, groupIds);
        toggleGroupCard();
        if (reportEditorTitle) reportEditorTitle.textContent = 'Editar relatorio';
        openEditorModal();
    };

    const deleteReport = async (reportId) => {
        const report = reports.find((item) => String(item.id) === String(reportId));
        if (!report || !canEditReport(report)) {
            showPermissionDenied('Você não tem permissão para excluir este relatório.');
            return;
        }
        if (!window.confirm(`Excluir o relatorio "${report.name}"?`)) return;

        try {
            showLoading('Excluindo relatorio...');
            await window.dbClient.from('task_report_group_shares').delete().eq('report_id', reportId);
            const { error } = await window.dbClient
                .from('task_report_definitions')
                .delete()
                .eq('id', reportId)
                .eq('owner_user_id', currentUserId);
            if (error) throw error;
            await refreshData();
            notify('Relatório excluído com sucesso.', 'success');
        } catch (error) {
            console.error('Erro ao excluir relatorio:', error);
            notify(error?.message || 'Não foi possível excluir o relatorio.', 'error');
        } finally {
            hideLoading();
        }
    };

    const setActiveTab = (tab) => {
        tabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
        panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === tab));
    };

    const refreshView = () => {
        renderList();
        renderBuilderList();
    };

    const refreshData = async () => {
        await Promise.all([loadReports(), loadShares()]);
        refreshView();
    };

    const bindEvents = () => {
        tabs.forEach((btn) => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab || 'list')));
        if (searchInput) searchInput.addEventListener('input', refreshView);
        if (scopeFilter) scopeFilter.addEventListener('change', refreshView);

        if (newReportBtn) {
            newReportBtn.addEventListener('click', () => {
                if (!hasPermission('create')) {
                    showPermissionDenied('Você não tem permissão para criar relatórios.');
                    return;
                }
                resetBuilder();
                if (reportEditorTitle) reportEditorTitle.textContent = 'Novo relatorio';
                openEditorModal();
            });
        }

        if (builderForm) builderForm.addEventListener('submit', (event) => void saveReport(event));
        if (reportColumnsGrid) {
            reportColumnsGrid.addEventListener('change', (event) => {
                const input = event.target?.closest?.('input[data-report-column]');
                if (!input) return;
                const key = input.getAttribute('data-report-column');
                if (!key) return;

                if (input.checked) {
                    if (!builderSelectedColumns.includes(key)) builderSelectedColumns.push(key);
                } else {
                    builderSelectedColumns = builderSelectedColumns.filter((columnKey) => columnKey !== key);
                }
                refreshBuilderColumnControls();
            });
        }
        if (reportVisibilityInput) reportVisibilityInput.addEventListener('change', toggleGroupCard);
        if (closeReportEditorModal) closeReportEditorModal.addEventListener('click', closeEditorModal);
        if (cancelReportEditorBtn) cancelReportEditorBtn.addEventListener('click', closeEditorModal);
        if (closeReportViewModal) closeReportViewModal.addEventListener('click', closeViewModal);

        if (reportEditorModal) {
            reportEditorModal.addEventListener('click', (event) => {
                if (event.target === reportEditorModal) closeEditorModal();
            });
        }
        if (reportViewModal) {
            reportViewModal.addEventListener('click', (event) => {
                if (event.target === reportViewModal) closeViewModal();
            });
        }
    };

    const renderGroupsAndColumns = () => {
        renderColumnsGrid();
        renderSortColumns();
        renderGroupsGrid();
        resetBuilder();
    };

    const shouldShowSchemaMessage = (error) => {
        const raw = String(error?.message || error || '').toLowerCase();
        return raw.includes('task_report_definitions') || raw.includes('task_report_group_shares') || raw.includes('does not exist');
    };

    const init = async () => {
        if (initialized) return;
        initialized = true;

        try {
            if (typeof PermissionService !== 'undefined' && typeof PermissionService.init === 'function') {
                await PermissionService.init();
                if (typeof PermissionService.ensure === 'function' && !PermissionService.has('relatorios', 'view')) {
                    PermissionService.ensure('relatorios', 'view', 'Você não tem permissão para visualizar relatórios.');
                    return;
                }
            }
            showLoading('Carregando relatorios...');
            bindEvents();
            await loadContext();
            await loadReportPermissions();
            applyPermissionsToUi();
            await loadGroups();
            renderGroupsAndColumns();
            await refreshData();
        } catch (error) {
            console.error('Falha ao iniciar relatorios:', error);
            if (shouldShowSchemaMessage(error)) {
                notify('Estrutura de relatórios ainda não existe no banco. Rode o SQL atualizado para habilitar este módulo.', 'warning');
            } else {
                notify(error?.message || 'Falha ao carregar relatorios.', 'error');
            }
        } finally {
            hideLoading();
        }
    };

    return { init };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void RelatoriosModule.init());
} else {
    void RelatoriosModule.init();
}










