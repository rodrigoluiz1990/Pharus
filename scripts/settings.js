// scripts/settings.js
const SettingsModule = (() => {
    const openExtensionsBtn = document.getElementById('openExtensionsBtn');
    const copyExtensionsUrlBtn = document.getElementById('copyExtensionsUrlBtn');
    const copyFolderHintBtn = document.getElementById('copyFolderHintBtn');
    const extensionFolderPath = document.getElementById('extensionFolderPath');
    const extensionInstallHint = document.getElementById('extensionInstallHint');

    const EXTENSIONS_URL = 'chrome://extensions';

    const showCopiedFeedback = (button, originalHtml) => {
        if (!button) return;
        button.classList.add('btn-copied');
        button.innerHTML = '<i class="fas fa-check"></i> Copiado!';

        setTimeout(() => {
            button.classList.remove('btn-copied');
            button.innerHTML = originalHtml;
        }, 1600);
    };

    const notify = (message, type = 'info') => {
        if (typeof UtilsModule !== 'undefined' && typeof UtilsModule.showNotification === 'function') {
            UtilsModule.showNotification(message, type);
            return;
        }
        if (extensionInstallHint) {
            extensionInstallHint.textContent = message;
        }
    };

    const fallbackCopyText = (value) => {
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = value;
        tempTextArea.setAttribute('readonly', '');
        tempTextArea.style.position = 'fixed';
        tempTextArea.style.opacity = '0';
        tempTextArea.style.pointerEvents = 'none';
        document.body.appendChild(tempTextArea);
        tempTextArea.focus();
        tempTextArea.select();

        let copied = false;
        try {
            copied = document.execCommand('copy');
        } catch (_error) {
            copied = false;
        }

        document.body.removeChild(tempTextArea);
        return copied;
    };

    const copyText = async (value, successMessage) => {
        try {
            await navigator.clipboard.writeText(value);
            notify(successMessage, 'success');
            return true;
        } catch (error) {
            const copiedByFallback = fallbackCopyText(value);
            if (copiedByFallback) {
                notify(successMessage, 'success');
                return true;
            }
            console.error('Falha ao copiar texto:', error);
            notify('Nao foi possivel copiar automaticamente. Copie manualmente.', 'warning');
            return false;
        }
    };

    const tryOpenExtensionsPage = async () => {
        const popup = window.open(EXTENSIONS_URL, '_blank');

        if (popup) {
            notify('Tentando abrir chrome://extensions...', 'info');
            return;
        }

        const copied = await copyText(EXTENSIONS_URL, 'Link copiado: cole na barra de endereco do Chrome.');
        if (!copied) {
            notify('Abra manualmente: chrome://extensions', 'warning');
        }
    };

    const init = () => {
        if (openExtensionsBtn) {
            openExtensionsBtn.addEventListener('click', (event) => {
                event.preventDefault();
                tryOpenExtensionsPage();
            });
        }

        if (copyExtensionsUrlBtn) {
            copyExtensionsUrlBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                const originalHtml = copyExtensionsUrlBtn.innerHTML;
                const copied = await copyText(EXTENSIONS_URL, 'Link chrome://extensions copiado com sucesso.');
                if (copied) {
                    showCopiedFeedback(copyExtensionsUrlBtn, originalHtml);
                }
            });
        }

        if (copyFolderHintBtn && extensionFolderPath) {
            copyFolderHintBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                const originalHtml = copyFolderHintBtn.innerHTML;
                const copied = await copyText(extensionFolderPath.textContent.trim(), 'Nome da pasta copiado com sucesso.');
                if (copied) {
                    showCopiedFeedback(copyFolderHintBtn, originalHtml);
                }
            });
        }
    };

    return { init };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', SettingsModule.init);
} else {
    SettingsModule.init();
}
