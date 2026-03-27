// scripts/page-bootstrap.js
const PageBootstrap = (() => {
    let bootstrapped = false;

    const getCurrentPage = () => {
        const path = window.location.pathname || '';
        const last = path.split('/').pop();
        return last || 'quadrodetarefas.html';
    };

    const waitForDbClient = () => {
        return new Promise((resolve) => {
            if (window.dbClient) {
                resolve();
                return;
            }

            const interval = setInterval(() => {
                if (window.dbClient) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);

            setTimeout(() => {
                clearInterval(interval);
                resolve();
            }, 5000);
        });
    };

    const loadScriptOnce = (src) => {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            if (typeof ComponentLoader !== 'undefined' && typeof ComponentLoader.loadScript === 'function') {
                ComponentLoader.loadScript(src, resolve);
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    };

    const loadScripts = async (scripts) => {
        for (const src of scripts) {
            await loadScriptOnce(src);
        }
    };

    const initBoardPage = async () => {
        await loadScripts([
            'scripts/utils.js',
            'scripts/storage.js',
            'scripts/modal.js',
            'scripts/filter.js',
            'scripts/sort.js',
            'scripts/table-sort.js',
            'scripts/board.js',
            'scripts/task-import.js',
            'scripts/login-notices-modal.js'
        ]);

        if (typeof ModalModule !== 'undefined' && typeof ModalModule.initModal === 'function') {
            ModalModule.initModal();
        }

        if (typeof FilterModule !== 'undefined' && typeof FilterModule.init === 'function') {
            FilterModule.init();
        }

        if (typeof SortModule !== 'undefined' && typeof SortModule.init === 'function') {
            SortModule.init();
        }

        if (typeof BoardModule !== 'undefined' && typeof BoardModule.initBoard === 'function') {
            await BoardModule.initBoard();
        }

        if (typeof TaskImportModule !== 'undefined' && typeof TaskImportModule.init === 'function') {
            TaskImportModule.init();
        }

        if (typeof LoginNoticesModalModule !== 'undefined' && typeof LoginNoticesModalModule.init === 'function') {
            await LoginNoticesModalModule.init();
        }
    };

    const initUsersPage = async () => {
        await loadScripts([
            'scripts/utils.js',
            'scripts/storage.js',
            'scripts/users.js'
        ]);

        if (typeof UsersModule !== 'undefined' && typeof UsersModule.initUsersModule === 'function') {
            UsersModule.initUsersModule();
        }
    };

    const initClientsPage = async () => {
        await loadScripts([
            'scripts/utils.js',
            'scripts/storage.js',
            'scripts/clients.js'
        ]);

        if (typeof ClientsModule !== 'undefined' && typeof ClientsModule.initClientsModule === 'function') {
            ClientsModule.initClientsModule();
        }
    };

    const initAgendaPage = async () => {
        await loadScripts([
            'scripts/utils.js',
            'scripts/agenda.js'
        ]);

        if (typeof AgendaModule !== 'undefined' && typeof AgendaModule.init === 'function') {
            AgendaModule.init();
        }
    };

    const initNoticesPage = async () => {
        await loadScripts([
            'scripts/utils.js',
            'scripts/avisos.js'
        ]);

        if (typeof AvisosModule !== 'undefined' && typeof AvisosModule.init === 'function') {
            AvisosModule.init();
        }
    };

    const initByPage = async () => {
        const page = getCurrentPage();

        if (page === 'quadrodetarefas.html') {
            await initBoardPage();
            return;
        }

        if (page === 'users.html') {
            await initUsersPage();
            return;
        }

        if (page === 'clientes.html') {
            await initClientsPage();
            return;
        }

        if (page === 'agenda.html') {
            await initAgendaPage();
            return;
        }

        if (page === 'avisos.html') {
            await initNoticesPage();
        }
    };

    const init = async () => {
        if (bootstrapped) return;
        bootstrapped = true;

        await waitForDbClient();

        if (typeof ComponentLoader !== 'undefined' && typeof ComponentLoader.loadAllComponents === 'function') {
            await ComponentLoader.loadAllComponents();
        }

        await initByPage();
    };

    return { init };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        PageBootstrap.init();
    });
} else {
    PageBootstrap.init();
}



