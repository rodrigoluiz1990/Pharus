// scripts/task-import.js
const TaskImportModule = (() => {
    const importBtn = document.getElementById('importTasksBtn');
    const fileInput = document.getElementById('tasksImportInput');
    const importModal = document.getElementById('importTasksModal');
    const startImportBtn = document.getElementById('startImportTasksBtn');
    const cancelImportBtn = document.getElementById('cancelImportTasksBtn');
    const closeImportBtn = document.getElementById('closeImportTasksModal');
    let isInitialized = false;
    let xlsxLoaderPromise = null;

    const HEADER_ALIASES = {
        title: ['title', 'titulo', 'nome'],
        description: ['description', 'descricao'],
        status: ['status', 'situacao'],
        priority: ['priority', 'prioridade'],
        assignee: ['assignee', 'responsavel', 'responsavel_email', 'email_responsavel', 'usuario'],
        request_date: ['request_date', 'data_solicitacao', 'data_solicitacao_abertura', 'abertura'],
        due_date: ['due_date', 'data_entrega', 'prazo', 'data_vencimento'],
        observation: ['observation', 'observacao', 'obs'],
        jira: ['jira', 'tarefa_jira', 'chamado_jira'],
        client: ['client', 'cliente', 'cliente_sigla', 'sigla_cliente'],
        type: ['type', 'tipo'],
        is_pinned: ['is_pinned', 'pin', 'postit', 'destacar_postit', 'post_it'],
        focus_order: ['focus_order', 'ordem_postit', 'ordem_post_it', 'ordem']
    };

    const normalizeText = (value) => String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_+/g, '_');

    const getTodayIso = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        return new Date(now.getTime() - offset).toISOString().split('T')[0];
    };

    const buildHeaderMap = () => {
        const map = new Map();
        Object.entries(HEADER_ALIASES).forEach(([canonical, aliases]) => {
            aliases.forEach((alias) => map.set(normalizeText(alias), canonical));
        });
        return map;
    };

    const HEADER_MAP = buildHeaderMap();

    const detectDelimiter = (headerLine) => {
        if (!headerLine) return ',';
        const candidates = [',', ';', '\t'];
        let best = ',';
        let bestCount = -1;

        candidates.forEach((candidate) => {
            let count = 0;
            let inQuotes = false;
            for (let i = 0; i < headerLine.length; i += 1) {
                const char = headerLine[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                    continue;
                }
                if (!inQuotes && char === candidate) {
                    count += 1;
                }
            }
            if (count > bestCount) {
                bestCount = count;
                best = candidate;
            }
        });

        return best;
    };

    const parseCsvLine = (line, delimiter) => {
        const cells = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i += 1) {
            const char = line[i];
            const next = line[i + 1];

            if (char === '"' && inQuotes && next === '"') {
                current += '"';
                i += 1;
                continue;
            }

            if (char === '"') {
                inQuotes = !inQuotes;
                continue;
            }

            if (char === delimiter && !inQuotes) {
                cells.push(current.trim());
                current = '';
                continue;
            }

            current += char;
        }

        cells.push(current.trim());
        return cells;
    };

    const parseCsv = (text) => {
        const raw = String(text || '').replace(/^\uFEFF/, '').trim();
        if (!raw) {
            return { headers: [], rows: [] };
        }

        const lines = raw.split(/\r?\n/).filter((line) => String(line || '').trim() !== '');
        if (!lines.length) {
            return { headers: [], rows: [] };
        }

        const delimiter = detectDelimiter(lines[0]);
        const originalHeaders = parseCsvLine(lines[0], delimiter);
        const headers = originalHeaders.map((header) => HEADER_MAP.get(normalizeText(header)) || normalizeText(header));
        const rows = [];

        for (let i = 1; i < lines.length; i += 1) {
            const values = parseCsvLine(lines[i], delimiter);
            const row = {};
            headers.forEach((header, index) => {
                row[header] = String(values[index] || '').trim();
            });
            rows.push(row);
        }

        return { headers, rows };
    };

    const loadSheetJs = () => {
        if (window.XLSX) return Promise.resolve(window.XLSX);
        if (xlsxLoaderPromise) return xlsxLoaderPromise;

        xlsxLoaderPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js';
            script.async = true;
            script.onload = () => {
                if (window.XLSX) {
                    resolve(window.XLSX);
                    return;
                }
                reject(new Error('biblioteca XLSX nao disponivel'));
            };
            script.onerror = () => reject(new Error('falha ao carregar biblioteca XLSX'));
            document.head.appendChild(script);
        });

        return xlsxLoaderPromise;
    };

    const parseSpreadsheetFile = async (file) => {
        const fileName = String(file?.name || '').toLowerCase();
        const isCsv = fileName.endsWith('.csv') || file.type === 'text/csv';
        if (isCsv) {
            const text = await file.text();
            return parseCsv(text);
        }

        const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
        if (!isExcel) {
            throw new Error('formato de arquivo nao suportado');
        }

        const XLSX = await loadSheetJs();
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames?.[0];
        if (!firstSheetName) {
            return { headers: [], rows: [] };
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const matrix = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            raw: false
        });

        if (!Array.isArray(matrix) || matrix.length === 0) {
            return { headers: [], rows: [] };
        }

        const originalHeaders = (matrix[0] || []).map((header) => String(header || '').trim());
        const headers = originalHeaders.map((header) => HEADER_MAP.get(normalizeText(header)) || normalizeText(header));
        const rows = [];

        for (let i = 1; i < matrix.length; i += 1) {
            const values = Array.isArray(matrix[i]) ? matrix[i] : [];
            const hasAnyValue = values.some((value) => String(value || '').trim() !== '');
            if (!hasAnyValue) continue;

            const row = {};
            headers.forEach((header, index) => {
                row[header] = String(values[index] || '').trim();
            });
            rows.push(row);
        }

        return { headers, rows };
    };

    const normalizeStatus = (value) => {
        const raw = normalizeText(value);
        const map = {
            pending: 'pending',
            pendente: 'pending',
            aberto: 'pending',
            open: 'pending',
            in_progress: 'in_progress',
            andamento: 'in_progress',
            em_andamento: 'in_progress',
            doing: 'in_progress',
            review: 'review',
            teste: 'review',
            em_teste: 'review',
            homologacao: 'review',
            completed: 'completed',
            concluido: 'completed',
            concluida: 'completed',
            done: 'completed',
            finalizado: 'completed'
        };
        return map[raw] || 'pending';
    };

    const normalizePriority = (value) => {
        const raw = normalizeText(value);
        const map = {
            low: 'low',
            baixa: 'low',
            medium: 'medium',
            media: 'medium',
            normal: 'medium',
            high: 'high',
            alta: 'high',
            urgente: 'high',
            critica: 'high'
        };
        return map[raw] || 'medium';
    };

    const normalizeType = (value) => {
        const raw = normalizeText(value);
        const map = {
            task: 'task',
            novo: 'task',
            tarefa: 'task',
            bug: 'bug',
            erro: 'bug',
            improvement: 'improvement',
            melhoria: 'improvement'
        };
        return map[raw] || 'task';
    };

    const parseBoolean = (value) => {
        const raw = normalizeText(value);
        return ['1', 'true', 'sim', 's', 'yes', 'y', 'x'].includes(raw);
    };

    const excelSerialToIso = (value) => {
        const serial = Number(value);
        if (!Number.isFinite(serial) || serial <= 0) return null;
        const base = new Date(Date.UTC(1899, 11, 30));
        const ms = serial * 24 * 60 * 60 * 1000;
        const date = new Date(base.getTime() + ms);
        if (Number.isNaN(date.getTime())) return null;
        return date.toISOString().split('T')[0];
    };

    const parseDateToIso = (value) => {
        const raw = String(value || '').trim();
        if (!raw) return null;

        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return raw;
        }

        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw) || /^\d{1,2}-\d{1,2}-\d{4}$/.test(raw)) {
            const parts = raw.replace(/-/g, '/').split('/');
            const day = Number(parts[0]);
            const month = Number(parts[1]);
            const year = Number(parts[2]);
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
                return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            }
        }

        if (/^\d+(\.\d+)?$/.test(raw)) {
            const serialIso = excelSerialToIso(raw);
            if (serialIso) return serialIso;
        }

        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return null;
        return parsed.toISOString().split('T')[0];
    };

    const buildLookupData = async () => {
        let columns = await StorageModule.getColumns();
        if (!Array.isArray(columns) || columns.length === 0) {
            columns = await StorageModule.createDefaultColumns();
        }

        const users = await StorageModule.getUsers();
        const clients = await StorageModule.getClients();

        const usersByKey = new Map();
        (users || []).forEach((user) => {
            const id = String(user.id || '').trim();
            const email = normalizeText(user.email || '');
            const name = normalizeText(user.name || '');
            if (id) usersByKey.set(normalizeText(id), user.id);
            if (email) usersByKey.set(email, user.id);
            if (name) usersByKey.set(name, user.id);
        });

        const clientsByKey = new Map();
        (clients || []).forEach((client) => {
            const name = String(client.name || '').trim();
            const acronym = String(client.acronym || '').trim();
            if (name) clientsByKey.set(normalizeText(name), name);
            if (acronym) clientsByKey.set(normalizeText(acronym), acronym);
        });

        const columnsByType = {};
        (columns || []).forEach((column) => {
            const type = String(column.type || '').trim();
            if (type && !columnsByType[type]) {
                columnsByType[type] = column.id;
            }
        });

        return {
            usersByKey,
            clientsByKey,
            columnsByType
        };
    };

    const buildTaskFromRow = (row, lookup, lineNumber) => {
        const title = String(row.title || '').trim();
        if (!title) {
            throw new Error(`linha ${lineNumber}: titulo obrigatorio`);
        }

        const status = normalizeStatus(row.status);
        const priority = normalizePriority(row.priority);
        const type = normalizeType(row.type);
        const assigneeRaw = normalizeText(row.assignee || '');
        const assignee = assigneeRaw ? (lookup.usersByKey.get(assigneeRaw) || null) : null;
        const clientRaw = String(row.client || '').trim();
        const client = clientRaw ? (lookup.clientsByKey.get(normalizeText(clientRaw)) || clientRaw) : null;
        const isPinned = parseBoolean(row.is_pinned);
        const focusOrderRaw = String(row.focus_order || '').trim();
        const focusOrder = isPinned && /^\d+$/.test(focusOrderRaw) ? Number(focusOrderRaw) : null;
        const requestDate = parseDateToIso(row.request_date) || getTodayIso();
        const dueDate = parseDateToIso(row.due_date);
        const columnId = lookup.columnsByType[status] || lookup.columnsByType.pending || null;

        return {
            title,
            description: String(row.description || '').trim() || null,
            status,
            priority,
            assignee,
            request_date: requestDate,
            due_date: dueDate,
            observation: String(row.observation || '').trim() || null,
            jira: String(row.jira || '').trim() || null,
            client,
            type,
            is_pinned: isPinned,
            focus_order: focusOrder,
            column_id: columnId
        };
    };

    const openImportModal = () => {
        if (!importModal) return;
        importModal.style.display = 'flex';
    };

    const closeImportModal = () => {
        if (!importModal) return;
        importModal.style.display = 'none';
    };

    const onImportClick = () => {
        openImportModal();
    };

    const onStartImportClick = () => {
        closeImportModal();
        if (!fileInput) return;
        fileInput.click();
    };

    const onFileChange = async (event) => {
        const file = event?.target?.files?.[0];
        if (!file) return;

        try {
            UtilsModule.showLoading('Importando tarefas da planilha...');
            const parsed = await parseSpreadsheetFile(file);
            const rows = Array.isArray(parsed.rows) ? parsed.rows : [];

            if (!rows.length) {
                UtilsModule.showNotification('Planilha vazia. Use um arquivo CSV com cabecalho.', 'warning');
                return;
            }

            const lookup = await buildLookupData();
            const errors = [];
            let successCount = 0;

            for (let i = 0; i < rows.length; i += 1) {
                const lineNumber = i + 2;
                try {
                    const taskPayload = buildTaskFromRow(rows[i], lookup, lineNumber);
                    const result = await StorageModule.saveTask(taskPayload);
                    if (!result) {
                        errors.push(`linha ${lineNumber}: falha ao salvar`);
                        continue;
                    }
                    successCount += 1;
                } catch (rowError) {
                    errors.push(String(rowError?.message || `linha ${lineNumber}: erro desconhecido`));
                }
            }

            if (successCount > 0) {
                window.dispatchEvent(new CustomEvent('tasksUpdated'));
            }

            if (errors.length === 0) {
                UtilsModule.showNotification(`${successCount} tarefa(s) importada(s) com sucesso.`, 'success');
                return;
            }

            const details = errors.slice(0, 3).join(' | ');
            UtilsModule.showNotification(
                `${successCount} importada(s), ${errors.length} com erro. ${details}`,
                successCount > 0 ? 'warning' : 'error'
            );
        } catch (error) {
            console.error('Erro ao importar tarefas:', error);
            UtilsModule.showNotification('Nao foi possivel importar a planilha.', 'error');
        } finally {
            UtilsModule.hideLoading();
            if (fileInput) fileInput.value = '';
        }
    };

    const init = () => {
        if (isInitialized) return;
        if (!importBtn || !fileInput || !importModal || !startImportBtn || !cancelImportBtn || !closeImportBtn) return;

        importBtn.addEventListener('click', onImportClick);
        startImportBtn.addEventListener('click', onStartImportClick);
        cancelImportBtn.addEventListener('click', closeImportModal);
        closeImportBtn.addEventListener('click', closeImportModal);
        importModal.addEventListener('click', (event) => {
            if (event.target === importModal) {
                closeImportModal();
            }
        });
        fileInput.addEventListener('change', onFileChange);
        isInitialized = true;
    };

    return {
        init
    };
})();
