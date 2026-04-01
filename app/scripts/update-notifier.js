const UpdateNotifier = (() => {
    const DISMISSED_VERSION_KEY = 'pharus_update_dismissed_version';
    const NOTICE_ID = 'pharusGlobalUpdateNotice';
    const HIDE_PAGES = new Set(['login.html', 'index.html']);
    let initialized = false;

    const getCurrentPage = () => {
        const path = window.location.pathname || '';
        const last = path.split('/').pop();
        return last || 'quadrodetarefas.html';
    };

    const shouldSkip = () => HIDE_PAGES.has(getCurrentPage());

    const ensureStyles = () => {
        if (document.getElementById('pharusUpdateNoticeStyles')) return;
        const style = document.createElement('style');
        style.id = 'pharusUpdateNoticeStyles';
        style.textContent = `
            .pharus-update-notice {
                position: fixed;
                right: 20px;
                bottom: 20px;
                z-index: 2200;
                max-width: 420px;
                background: #fff;
                border: 1px solid #dbe4ee;
                border-left: 4px solid #f59e0b;
                border-radius: 10px;
                box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);
                padding: 12px 14px;
                color: #1f2937;
            }
            .pharus-update-notice-title {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin-bottom: 4px;
                font-weight: 700;
                font-size: 14px;
            }
            .pharus-update-notice-message {
                margin: 0;
                font-size: 13px;
                color: #374151;
                line-height: 1.4;
            }
            .pharus-update-notice-actions {
                margin-top: 10px;
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }
            .pharus-update-btn {
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                background: #fff;
                color: #334155;
                font-size: 12px;
                font-weight: 600;
                padding: 6px 10px;
                cursor: pointer;
            }
            .pharus-update-btn:hover {
                background: #f8fafc;
            }
            .pharus-update-btn-primary {
                background: #2563eb;
                color: #fff;
                border-color: #2563eb;
            }
            .pharus-update-btn-primary:hover {
                background: #1d4ed8;
            }
            @media (max-width: 768px) {
                .pharus-update-notice {
                    left: 84px;
                    right: 12px;
                    bottom: 12px;
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(style);
    };

    const removeNotice = () => {
        const existing = document.getElementById(NOTICE_ID);
        if (existing) existing.remove();
    };

    const getDismissedVersion = () => String(localStorage.getItem(DISMISSED_VERSION_KEY) || '').trim();

    const dismissVersion = (version) => {
        if (!version) return;
        localStorage.setItem(DISMISSED_VERSION_KEY, String(version));
    };

    const renderNotice = (payload) => {
        removeNotice();
        ensureStyles();

        const latestVersion = String(payload?.latestVersion || '').trim();
        const currentVersion = String(payload?.currentVersion || '').trim();
        const notesUrl = String(payload?.notesUrl || '').trim();

        const root = document.createElement('div');
        root.className = 'pharus-update-notice';
        root.id = NOTICE_ID;
        root.innerHTML = `
            <div class="pharus-update-notice-title">
                <span>Nova versão disponível</span>
                <button type="button" class="pharus-update-btn" data-action="dismiss">Fechar</button>
            </div>
            <p class="pharus-update-notice-message">
                Atual: <strong>${currentVersion || '-'}</strong> | Nova: <strong>${latestVersion || '-'}</strong>
            </p>
            <div class="pharus-update-notice-actions">
                ${notesUrl ? '<button type="button" class="pharus-update-btn" data-action="notes">Notas</button>' : ''}
                <button type="button" class="pharus-update-btn pharus-update-btn-primary" data-action="open-maintenance">Atualizar</button>
            </div>
        `;

        root.addEventListener('click', (event) => {
            const action = event.target?.dataset?.action;
            if (!action) return;

            if (action === 'dismiss') {
                dismissVersion(latestVersion);
                removeNotice();
                return;
            }

            if (action === 'notes' && notesUrl) {
                window.open(notesUrl, '_blank', 'noopener,noreferrer');
                return;
            }

            if (action === 'open-maintenance') {
                window.location.href = 'configuracoes.html?tab=maintenance';
            }
        });

        document.body.appendChild(root);
    };

    const checkForUpdates = async () => {
        if (shouldSkip()) return;
        try {
            const response = await fetch('/api/system/update-check', {
                method: 'GET',
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            });
            if (!response.ok) return;

            const json = await response.json().catch(() => null);
            const data = json?.data || null;
            if (!data || !data.updateAvailable) {
                removeNotice();
                return;
            }

            const latestVersion = String(data.latestVersion || '').trim();
            if (!latestVersion) return;

            if (getDismissedVersion() === latestVersion) return;

            renderNotice(data);
        } catch (_error) {
            // Não bloqueia o uso do sistema se a checagem falhar.
        }
    };

    const init = () => {
        if (initialized) return;
        initialized = true;
        window.setTimeout(() => {
            checkForUpdates();
        }, 1200);
    };

    return { init, checkForUpdates };
})();

window.UpdateNotifier = UpdateNotifier;
