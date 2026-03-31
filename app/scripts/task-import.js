// scripts/task-import.js
const TaskImportModule = (() => {
    const importBtn = document.getElementById('importTasksBtn');
    const fileInput = document.getElementById('tasksImportInput');
    const importModal = document.getElementById('importTasksModal');
    const startImportBtn = document.getElementById('startImportTasksBtn');
    const cancelImportBtn = document.getElementById('cancelImportTasksBtn');
    const closeImportBtn = document.getElementById('closeImportTasksModal');
    const introStepEl = document.getElementById('importIntroStep');
    const previewStepEl = document.getElementById('importPreviewStep');
    const previewSummaryEl = document.getElementById('importPreviewSummary');
    const previewTableBodyEl = document.getElementById('importPreviewTableBody');
    const backPreviewBtn = document.getElementById('backImportPreviewBtn');
    const cancelPreviewBtn = document.getElementById('cancelImportPreviewBtn');
    const confirmImportBtn = document.getElementById('confirmImportTasksBtn');

    let isInitialized = false;
    let xlsxLoaderPromise = null;
    let previewRows = [];
    let lookupData = null;
    const ensureImportPermission = (message) => {
        if (typeof PermissionService === 'undefined' || typeof PermissionService.ensure !== 'function') return true;
        return PermissionService.ensure('quadro_tarefas', 'import', message || 'Você não tem permissão para importar tarefas.');
    };

    const HEADER_ALIASES = {
        title: ['title', 'titulo', 'nome'],
        description: ['description', 'descrição'],
        status: ['status', 'situacao'],
        priority: ['priority', 'prioridade'],
        assignee: ['assignee', 'responsavel', 'responsavel_email', 'email_responsavel', 'usuario'],
        request_date: ['request_date', 'data_solicitacao', 'data_solicitacao_abertura', 'abertura'],
        due_date: ['due_date', 'data_entrega', 'prazo', 'data_vencimento'],
        observation: ['observation', 'observação', 'obs'],
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
                if (!inQuotes && char === candidate) count += 1;
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
        if (!raw) return { headers: [], rows: [] };

        const lines = raw.split(/\r?\n/).filter((line) => String(line || '').trim() !== '');
        if (!lines.length) return { headers: [], rows: [] };

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
        if (!isExcel) throw new Error('formato de arquivo nao suportado');

        const XLSX = await loadSheetJs();
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames?.[0];
        if (!firstSheetName) return { headers: [], rows: [] };

        const worksheet = workbook.Sheets[firstSheetName];
        const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
        if (!Array.isArray(matrix) || matrix.length === 0) return { headers: [], rows: [] };

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
            very_high: 'very_high',
            muito_alta: 'very_high',
            urgente: 'very_high',
            low: 'low',
            baixa: 'low',
            medium: 'medium',
            media: 'medium',
            normal: 'medium',
            high: 'high',
            alta: 'high',
            critica: 'high',
            very_low: 'very_low',
            muito_baixa: 'very_low'
        };
        return map[raw] || 'medium';
    };

    const normalizeType = (value) => {
        const raw = normalizeText(value);
        const map = {
            new: 'new',
            task: 'new',
            novo: 'new',
            tarefa: 'new',
            optimization: 'optimization',
            otimizacao: 'optimization',
            improvement: 'improvement',
            melhoria: 'improvement',
            discussion: 'discussion',
            para_discutir: 'discussion',
            suggestion: 'suggestion',
            sugestao: 'suggestion',
            issue: 'issue',
            problema: 'issue',
            bug: 'issue',
            erro: 'issue',
            epic: 'epic',
            epico: 'epic'
        };
        return map[raw] || 'new';
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

        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

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
        const existingTasks = await StorageModule.getTasks();

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
            if (acronym) clientsByKey.set(normalizeText(acronym), name || acronym);
        });

        const columnsByType = {};
        (columns || []).forEach((column) => {
            const type = String(column.type || '').trim();
            if (type && !columnsByType[type]) {
                columnsByType[type] = column.id;
            }
        });

        const usersOptions = (users || [])
            .map((user) => {
                const id = String(user.id || '').trim();
                const name = String(user.name || '').trim();
                const email = String(user.email || '').trim();
                if (!id) return null;
                return {
                    value: id,
                    label: name ? `${name}${email ? ` (${email})` : ''}` : (email || id)
                };
            })
            .filter(Boolean);

        const usersCatalog = (users || [])
            .map((user) => {
                const id = String(user.id || '').trim();
                const name = String(user.name || '').trim();
                const email = String(user.email || '').trim();
                if (!id) return null;
                return {
                    id,
                    name,
                    email,
                    nameKey: normalizeText(name),
                    emailKey: normalizeText(email),
                    label: name ? `${name}${email ? ` (${email})` : ''}` : (email || id)
                };
            })
            .filter(Boolean);

        const clientsOptions = (clients || [])
            .map((client) => {
                const name = String(client.name || '').trim();
                const acronym = String(client.acronym || '').trim();
                if (!name) return null;
                return {
                    value: name,
                    label: acronym ? `${name} (${acronym})` : name
                };
            })
            .filter(Boolean);

        const clientsCatalog = (clients || [])
            .map((client) => {
                const name = String(client.name || '').trim();
                const acronym = String(client.acronym || '').trim();
                if (!name) return null;
                return {
                    value: name,
                    name,
                    acronym,
                    nameKey: normalizeText(name),
                    acronymKey: normalizeText(acronym),
                    label: acronym ? `${name} (${acronym})` : name
                };
            })
            .filter(Boolean);

        const existingTitleKeys = new Set();
        (existingTasks || []).forEach((task) => {
            const key = normalizeText(task?.title || '');
            if (key) existingTitleKeys.add(key);
        });

        return {
            usersByKey,
            clientsByKey,
            columnsByType,
            usersOptions,
            clientsOptions,
            usersCatalog,
            clientsCatalog,
            existingTitleKeys
        };
    };

    const buildDraftFromRow = (row, lineNumber) => {
        const requestDate = parseDateToIso(row.request_date) || getTodayIso();
        const dueDate = parseDateToIso(row.due_date);
        const isPinned = parseBoolean(row.is_pinned);
        const focusOrderRaw = String(row.focus_order || '').trim();

        return {
            lineNumber,
            title: String(row.title || '').trim(),
            description: String(row.description || '').trim(),
            status: normalizeStatus(row.status),
            priority: normalizePriority(row.priority),
            assignee: String(row.assignee || '').trim(),
            request_date: requestDate,
            due_date: dueDate || '',
            observation: String(row.observation || '').trim(),
            jira: String(row.jira || '').trim(),
            client: String(row.client || '').trim(),
            type: normalizeType(row.type),
            is_pinned: isPinned,
            focus_order: isPinned && /^\d+$/.test(focusOrderRaw) ? String(Number(focusOrderRaw)) : '',
            error: ''
        };
    };

    const levenshteinDistance = (a, b) => {
        const left = String(a || '');
        const right = String(b || '');
        if (left === right) return 0;
        if (!left.length) return right.length;
        if (!right.length) return left.length;

        const dp = Array.from({ length: left.length + 1 }, (_, i) => [i]);
        for (let j = 0; j <= right.length; j += 1) dp[0][j] = j;
        for (let i = 1; i <= left.length; i += 1) {
            for (let j = 1; j <= right.length; j += 1) {
                const cost = left[i - 1] === right[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + cost
                );
            }
        }
        return dp[left.length][right.length];
    };

    const similarityScore = (source, candidate) => {
        const a = String(source || '');
        const b = String(candidate || '');
        if (!a || !b) return 0;
        if (a === b) return 1;
        if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) / Math.max(a.length, b.length);
        const distance = levenshteinDistance(a, b);
        return 1 - (distance / Math.max(a.length, b.length));
    };

    const splitTokens = (value) => normalizeText(value)
        .split('_')
        .filter((token) => token.length > 0);

    const tokenMatchScore = (queryKey, candidateKey) => {
        const query = String(queryKey || '');
        const candidate = String(candidateKey || '');
        if (!query || !candidate) return 0;
        if (query === candidate) return 1;
        if (candidate.startsWith(query) || query.startsWith(candidate)) return 0.93;

        const queryTokens = splitTokens(query);
        const candidateTokens = splitTokens(candidate);
        if (!queryTokens.length || !candidateTokens.length) return 0;

        let matches = 0;
        queryTokens.forEach((qToken) => {
            const hit = candidateTokens.some((cToken) => (
                cToken === qToken
                || cToken.startsWith(qToken)
                || qToken.startsWith(cToken)
            ));
            if (hit) matches += 1;
        });

        if (matches === 0) return 0;
        const coverage = matches / queryTokens.length;
        return 0.65 + (coverage * 0.3);
    };

    const findBestUserMatch = (rawValue, lookup) => {
        const key = normalizeText(rawValue);
        const candidates = lookup?.usersCatalog || [];
        let best = null;
        let bestScore = 0;
        candidates.forEach((candidate) => {
            const score = Math.max(
                similarityScore(key, candidate.nameKey),
                similarityScore(key, candidate.emailKey),
                tokenMatchScore(key, candidate.nameKey),
                tokenMatchScore(key, candidate.emailKey)
            );
            if (score > bestScore) {
                bestScore = score;
                best = candidate;
            }
        });
        if (!best || bestScore < 0.6) return null;
        return best;
    };

    const findBestClientMatch = (rawValue, lookup) => {
        const key = normalizeText(rawValue);
        const candidates = lookup?.clientsCatalog || [];
        let best = null;
        let bestScore = 0;
        candidates.forEach((candidate) => {
            const acronymExact = candidate.acronymKey && candidate.acronymKey === key ? 1 : 0;
            const acronymPrefix = candidate.acronymKey && (candidate.acronymKey.startsWith(key) || key.startsWith(candidate.acronymKey)) ? 0.9 : 0;
            const score = Math.max(
                acronymExact,
                acronymPrefix,
                similarityScore(key, candidate.nameKey),
                tokenMatchScore(key, candidate.nameKey)
            );
            if (score > bestScore) {
                bestScore = score;
                best = candidate;
            }
        });
        if (!best || bestScore < 0.6) return null;
        return best;
    };

    const resolveAssignee = (rawValue, lookup) => {
        const raw = String(rawValue || '').trim();
        if (!raw) return { matched: true, value: null, suggestion: '' };
        const key = normalizeText(raw);
        const exact = lookup?.usersByKey?.get(key);
        if (exact) return { matched: true, value: exact, suggestion: '' };
        const similar = findBestUserMatch(raw, lookup);
        if (similar) return { matched: true, value: similar.id, suggestion: similar.label };
        return { matched: false, value: null, suggestion: '' };
    };

    const resolveClient = (rawValue, lookup) => {
        const raw = String(rawValue || '').trim();
        if (!raw) return { matched: true, value: null, suggestion: '' };
        const key = normalizeText(raw);
        const exact = lookup?.clientsByKey?.get(key);
        if (exact) return { matched: true, value: exact, suggestion: '' };
        const similar = findBestClientMatch(raw, lookup);
        if (similar) return { matched: true, value: similar.value, suggestion: similar.label };
        return { matched: false, value: null, suggestion: '' };
    };

    const validateDraft = (draft, lookup) => {
        const title = String(draft.title || '').trim();
        if (!title) return 'Título obrigatório';
        if (lookup?.existingTitleKeys?.has(normalizeText(title))) return 'Já existe tarefa com este título no quadro';
        const assigneeResolved = resolveAssignee(draft.assignee, lookup);
        if (String(draft.assignee || '').trim() && !assigneeResolved.matched) return 'Responsável não encontrado no cadastro';
        const clientResolved = resolveClient(draft.client, lookup);
        if (String(draft.client || '').trim() && !clientResolved.matched) return 'Cliente não encontrado (use nome similar ou sigla cadastrada)';
        if (draft.request_date && !/^\d{4}-\d{2}-\d{2}$/.test(draft.request_date)) return 'Data solicitação inválida';
        if (draft.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(draft.due_date)) return 'Data entrega inválida';
        if (draft.is_pinned && draft.focus_order && !/^\d+$/.test(String(draft.focus_order))) return 'Ordem inválida';
        return '';
    };

    const toTaskPayload = (draft, lookup) => {
        const assignee = resolveAssignee(draft.assignee, lookup).value;
        const client = resolveClient(draft.client, lookup).value;

        const status = normalizeStatus(draft.status);
        const columnId = lookup.columnsByType[status] || lookup.columnsByType.pending || null;

        return {
            title: String(draft.title || '').trim(),
            description: String(draft.description || '').trim() || null,
            status,
            priority: normalizePriority(draft.priority),
            assignee,
            request_date: draft.request_date || getTodayIso(),
            due_date: draft.due_date || null,
            observation: String(draft.observation || '').trim() || null,
            jira: String(draft.jira || '').trim() || null,
            client,
            type: normalizeType(draft.type),
            is_pinned: Boolean(draft.is_pinned),
            focus_order: Boolean(draft.is_pinned) && /^\d+$/.test(String(draft.focus_order || '')) ? Number(draft.focus_order) : null,
            board_column_id: columnId
        };
    };

    const setStep = (step) => {
        if (!introStepEl || !previewStepEl) return;
        const showPreview = step === 'preview';
        introStepEl.style.display = showPreview ? 'none' : '';
        previewStepEl.style.display = showPreview ? '' : 'none';
    };

    const openImportModal = () => {
        if (!importModal) return;
        importModal.style.display = 'flex';
        setStep('intro');
    };

    const closeImportModal = () => {
        if (!importModal) return;
        importModal.style.display = 'none';
        if (fileInput) fileInput.value = '';
        previewRows = [];
        lookupData = null;
        if (previewTableBodyEl) previewTableBodyEl.innerHTML = '';
        if (previewSummaryEl) previewSummaryEl.textContent = '';
    };

    const updatePreviewSummary = () => {
        if (!previewSummaryEl) return;
        const total = previewRows.length;
        const invalid = previewRows.filter((row) => row.error).length;
        const valid = total - invalid;
        previewSummaryEl.textContent = `${total} registro(s) carregado(s): ${valid} válido(s) e ${invalid} com ajuste pendente.`;
    };

    const buildSelectOptions = (current, options) => {
        return options.map((item) => {
            const selected = item.value === current ? ' selected' : '';
            return `<option value="${escapeHtml(item.value)}"${selected}>${escapeHtml(item.label)}</option>`;
        }).join('');
    };

    const buildAssigneeOptions = (row) => {
        const options = [{ value: '', label: 'Sem responsável' }];
        const currentRaw = String(row.assignee || '').trim();
        const resolved = resolveAssignee(currentRaw, lookupData);
        const selectedValue = String(resolved.value || '').trim();

        (lookupData?.usersOptions || []).forEach((item) => options.push(item));

        if (currentRaw && !selectedValue) {
            options.push({ value: currentRaw, label: `${currentRaw} (não cadastrado)` });
        }

        return { options, selectedValue: selectedValue || currentRaw };
    };

    const buildClientOptions = (row) => {
        const options = [{ value: '', label: 'Sem cliente' }];
        const currentRaw = String(row.client || '').trim();
        const resolved = resolveClient(currentRaw, lookupData);
        const mappedClient = String(resolved.value || '').trim();

        (lookupData?.clientsOptions || []).forEach((item) => options.push(item));

        if (currentRaw && !mappedClient && !options.some((item) => item.value === currentRaw)) {
            options.push({ value: currentRaw, label: `${currentRaw} (não cadastrado)` });
        }

        return { options, selectedValue: mappedClient || currentRaw };
    };

    const renderPreviewTable = () => {
        if (!previewTableBodyEl) return;

        const statusOptions = [
            { value: 'pending', label: 'Pendente' },
            { value: 'in_progress', label: 'Em andamento' },
            { value: 'review', label: 'Em teste' },
            { value: 'completed', label: 'Concluído' }
        ];

        const priorityOptions = [
            { value: 'very_high', label: 'Muito alta' },
            { value: 'high', label: 'Alta' },
            { value: 'medium', label: 'Média' },
            { value: 'low', label: 'Baixa' },
            { value: 'very_low', label: 'Muito baixa' }
        ];

        const typeOptions = [
            { value: 'new', label: 'Novo' },
            { value: 'optimization', label: 'Otimização' },
            { value: 'improvement', label: 'Melhoria' },
            { value: 'discussion', label: 'Para discutir' },
            { value: 'suggestion', label: 'Sugestão' },
            { value: 'issue', label: 'Problema' },
            { value: 'epic', label: 'Épico' }
        ];

        previewTableBodyEl.innerHTML = previewRows.map((row, idx) => {
            const assigneeSelect = buildAssigneeOptions(row);
            const clientSelect = buildClientOptions(row);
            return `
            <tr data-index="${idx}">
                <td class="import-preview-line">${row.lineNumber}</td>
                <td><input class="form-control" data-field="title" value="${escapeHtml(row.title)}"></td>
                <td><select class="form-control" data-field="status">${buildSelectOptions(row.status, statusOptions)}</select></td>
                <td><select class="form-control" data-field="priority">${buildSelectOptions(row.priority, priorityOptions)}</select></td>
                <td><select class="form-control" data-field="assignee">${buildSelectOptions(assigneeSelect.selectedValue, assigneeSelect.options)}</select></td>
                <td><select class="form-control" data-field="client">${buildSelectOptions(clientSelect.selectedValue, clientSelect.options)}</select></td>
                <td><input type="date" class="form-control" data-field="request_date" value="${escapeHtml(row.request_date)}"></td>
                <td><input type="date" class="form-control" data-field="due_date" value="${escapeHtml(row.due_date)}"></td>
                <td><select class="form-control" data-field="type">${buildSelectOptions(row.type, typeOptions)}</select></td>
                <td style="text-align:center;"><input type="checkbox" data-field="is_pinned" ${row.is_pinned ? 'checked' : ''}></td>
                <td><input class="form-control" data-field="focus_order" value="${escapeHtml(row.focus_order)}"></td>
                <td style="text-align:center;">
                    <button type="button" class="btn btn-danger import-preview-remove-btn" data-action="remove-row">Remover</button>
                </td>
                <td class="import-preview-error">${escapeHtml(row.error || '')}</td>
            </tr>
        `;
        }).join('');

        updatePreviewSummary();
    };

    const escapeHtml = (value) => {
        const div = document.createElement('div');
        div.textContent = String(value ?? '');
        return div.innerHTML;
    };

    const applyRowValidation = (rowIndex) => {
        const row = previewRows[rowIndex];
        if (!row) return;
        row.error = validateDraft(row, lookupData);

        const tr = previewTableBodyEl?.querySelector(`tr[data-index="${rowIndex}"]`);
        if (!tr) return;
        const errorCell = tr.querySelector('.import-preview-error');
        if (errorCell) errorCell.textContent = row.error || '';
        updatePreviewSummary();
    };

    const onPreviewFieldChange = (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const tr = target.closest('tr[data-index]');
        if (!tr) return;

        const index = Number(tr.getAttribute('data-index'));
        if (!Number.isInteger(index) || !previewRows[index]) return;

        const field = target.getAttribute('data-field');
        const action = target.getAttribute('data-action');
        if (action === 'remove-row') {
            previewRows.splice(index, 1);
            renderPreviewTable();
            return;
        }
        if (!field) return;

        if (target instanceof HTMLInputElement && target.type === 'checkbox') {
            previewRows[index][field] = Boolean(target.checked);
        } else if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) {
            previewRows[index][field] = String(target.value || '');
        }

        if (field === 'status') {
            previewRows[index].status = normalizeStatus(previewRows[index].status);
        }
        if (field === 'priority') {
            previewRows[index].priority = normalizePriority(previewRows[index].priority);
        }
        if (field === 'type') {
            previewRows[index].type = normalizeType(previewRows[index].type);
        }
        if (field === 'is_pinned' && !previewRows[index].is_pinned) {
            previewRows[index].focus_order = '';
            const focusInput = tr.querySelector('input[data-field="focus_order"]');
            if (focusInput) focusInput.value = '';
        }

        applyRowValidation(index);
    };

    const onImportClick = () => {
        if (!ensureImportPermission()) return;
        openImportModal();
    };

    const onStartImportClick = () => {
        if (!ensureImportPermission()) return;
        if (!fileInput) return;
        fileInput.click();
    };

    const onFileChange = async (event) => {
        const file = event?.target?.files?.[0];
        if (!file) return;

        try {
            UtilsModule.showLoading('Lendo planilha para pre-visualização...');
            const parsed = await parseSpreadsheetFile(file);
            const rows = Array.isArray(parsed.rows) ? parsed.rows : [];

            if (!rows.length) {
                UtilsModule.showNotification('Planilha vazia. Use um arquivo CSV com cabecalho.', 'warning');
                return;
            }

            lookupData = await buildLookupData();
            previewRows = rows.map((row, idx) => {
                const draft = buildDraftFromRow(row, idx + 2);
                draft.error = validateDraft(draft, lookupData);
                return draft;
            });

            renderPreviewTable();
            setStep('preview');
        } catch (error) {
            console.error('Erro ao ler planilha:', error);
            UtilsModule.showNotification('Não foi possível ler a planilha.', 'error');
        } finally {
            UtilsModule.hideLoading();
            if (fileInput) fileInput.value = '';
        }
    };

    const onConfirmImportClick = async () => {
        if (!ensureImportPermission()) return;
        if (!lookupData || !previewRows.length) return;

        const invalid = previewRows.filter((row) => row.error);
        if (invalid.length > 0) {
            window.alert(`Existem ${invalid.length} registro(s) com erro. Corrija os erros na pré-visualização antes de confirmar a importação.`);
            return;
        }

        try {
            UtilsModule.showLoading('Importando tarefas da pre-visualização...');
            let successCount = 0;
            const errors = [];

            for (let i = 0; i < previewRows.length; i += 1) {
                const row = previewRows[i];
                try {
                    const payload = toTaskPayload(row, lookupData);
                    const result = await StorageModule.saveTask(payload);
                    if (!result) {
                        errors.push(`linha ${row.lineNumber}: falha ao salvar`);
                        continue;
                    }
                    successCount += 1;
                } catch (rowError) {
                    errors.push(`linha ${row.lineNumber}: ${String(rowError?.message || 'erro desconhecido')}`);
                }
            }

            if (successCount > 0) {
                window.dispatchEvent(new CustomEvent('tasksUpdated'));
            }

            if (errors.length === 0) {
                UtilsModule.showNotification(`${successCount} tarefa(s) importada(s) com sucesso.`, 'success');
                closeImportModal();
                return;
            }

            const details = errors.slice(0, 3).join(' | ');
            UtilsModule.showNotification(
                `${successCount} importada(s), ${errors.length} com erro. ${details}`,
                successCount > 0 ? 'warning' : 'error'
            );
        } catch (error) {
            console.error('Erro ao importar tarefas:', error);
            UtilsModule.showNotification('Não foi possível concluir a importacao.', 'error');
        } finally {
            UtilsModule.hideLoading();
        }
    };

    const init = () => {
        if (isInitialized) return;
        if (!importBtn || !fileInput || !importModal || !startImportBtn || !cancelImportBtn || !closeImportBtn) return;
        const allowed = typeof PermissionService === 'undefined' || typeof PermissionService.has !== 'function'
            ? true
            : PermissionService.has('quadro_tarefas', 'import');
        importBtn.disabled = !allowed;

        importBtn.addEventListener('click', onImportClick);
        startImportBtn.addEventListener('click', onStartImportClick);
        confirmImportBtn?.addEventListener('click', () => void onConfirmImportClick());
        backPreviewBtn?.addEventListener('click', () => setStep('intro'));
        cancelImportBtn.addEventListener('click', closeImportModal);
        cancelPreviewBtn?.addEventListener('click', closeImportModal);
        closeImportBtn.addEventListener('click', closeImportModal);
        importModal.addEventListener('click', (event) => {
            if (event.target === importModal) {
                closeImportModal();
            }
        });

        previewTableBodyEl?.addEventListener('input', onPreviewFieldChange);
        previewTableBodyEl?.addEventListener('change', onPreviewFieldChange);
        previewTableBodyEl?.addEventListener('click', onPreviewFieldChange);
        fileInput.addEventListener('change', onFileChange);
        isInitialized = true;
    };

    return { init };
})();



