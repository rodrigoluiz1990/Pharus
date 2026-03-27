// scripts/settings-permissions.js
const SettingsPermissionsModule = (() => {
    const groupsListEl = document.getElementById('permissionGroupsList');
    const groupsStatusEl = document.getElementById('permissionGroupsStatus');
    const matrixGridEl = document.getElementById('permissionMatrixGrid');
    const matrixStatusEl = document.getElementById('permissionMatrixStatus');
    const groupNameEl = document.getElementById('permissionGroupNameInput');
    const groupDescriptionEl = document.getElementById('permissionGroupDescriptionInput');
    const groupActiveEl = document.getElementById('permissionGroupActiveInput');
    const newGroupBtn = document.getElementById('newPermissionGroupBtn');
    const saveGroupBtn = document.getElementById('savePermissionGroupBtn');
    const deleteGroupBtn = document.getElementById('deletePermissionGroupBtn');
    const markAllBtn = document.getElementById('markAllPermissionsBtn');
    const clearAllBtn = document.getElementById('clearAllPermissionsBtn');
    const saveMatrixBtn = document.getElementById('savePermissionsMatrixBtn');

    const SCREENS = [
        { key: 'dashboard', label: 'Dashboard', options: ['view', 'widgets'] },
        { key: 'agenda', label: 'Agenda', options: ['view', 'create', 'edit', 'delete', 'complete'] },
        { key: 'avisos', label: 'Quadro de avisos', options: ['view', 'create', 'edit', 'delete', 'archive'] },
        { key: 'quadro_tarefas', label: 'Quadro de tarefas', options: ['view', 'create', 'edit', 'move', 'delete', 'pin'] },
        { key: 'clientes', label: 'Clientes', options: ['view', 'create', 'edit', 'delete'] },
        { key: 'usuarios', label: 'Usuários', options: ['view', 'create', 'edit', 'delete', 'chat'] },
        { key: 'chat', label: 'Chat', options: ['view', 'send', 'attachment'] },
        { key: 'relatorios', label: 'Relatórios', options: ['view', 'create', 'edit', 'share', 'export'] },
        { key: 'configuracoes', label: 'Configurações', options: ['view', 'project', 'permissions', 'users', 'table'] },
    ];

    const OPTION_LABELS = {
        view: 'Visualizar',
        widgets: 'Ver indicadores',
        create: 'Criar',
        edit: 'Editar',
        move: 'Mover',
        delete: 'Excluir',
        complete: 'Concluir',
        pin: 'Fixar foco',
        archive: 'Arquivar',
        chat: 'Abrir chat',
        send: 'Enviar mensagem',
        attachment: 'Enviar anexo',
        export: 'Exportar',
        project: 'Editar dados gerais',
        permissions: 'Gerenciar permissões',
        users: 'Gerenciar usuários',
        table: 'Editar tabela',
    };

    let groups = [];
    let selectedGroupId = null;
    let allowedKeys = new Set();
    let schemaOk = true;
    const SAVE_FEEDBACK_ATTR = 'data-permission-save-original';

    const keyOf = (screen, option) => `${screen}|${option}`;
    const notify = (message, type = 'info') => {
        if (window.UtilsModule && typeof window.UtilsModule.showNotification === 'function') {
            window.UtilsModule.showNotification(message, type);
        }
    };
    const showValidationModal = (message) => {
        if (window.UtilsModule && typeof window.UtilsModule.showPermissionDeniedModal === 'function') {
            window.UtilsModule.showPermissionDeniedModal(message);
            return;
        }
        window.alert(String(message || 'Validação inválida.'));
    };
    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = String(text ?? '');
        return div.innerHTML;
    };

    const setStatus = (el, message) => {
        if (!el) return;
        el.textContent = message || '';
        el.style.display = message ? 'block' : 'none';
    };

    const renderMatrix = () => {
        if (!matrixGridEl) return;
        matrixGridEl.innerHTML = '';
        if (!selectedGroupId) {
            matrixGridEl.innerHTML = '<div class="status-hint">Selecione ou crie um grupo para editar permissões.</div>';
            return;
        }

        SCREENS.forEach((screen) => {
            const card = document.createElement('section');
            card.className = 'permission-screen-card';
            card.innerHTML = `<h4 class="permission-screen-title">${escapeHtml(screen.label)}</h4>`;

            const grid = document.createElement('div');
            grid.className = 'permission-options-grid';

            screen.options.forEach((option) => {
                const k = keyOf(screen.key, option);
                const label = document.createElement('label');
                label.className = 'permission-option';
                label.innerHTML = `
                    <input type="checkbox" data-perm-key="${escapeHtml(k)}" ${allowedKeys.has(k) ? 'checked' : ''}>
                    <span>${escapeHtml(OPTION_LABELS[option] || option)}</span>
                `;
                const checkbox = label.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.addEventListener('change', () => {
                        if (checkbox.checked) allowedKeys.add(k);
                        else allowedKeys.delete(k);
                    });
                }
                grid.appendChild(label);
            });

            card.appendChild(grid);
            matrixGridEl.appendChild(card);
        });
    };

    const fillGroupForm = (group) => {
        if (!groupNameEl || !groupDescriptionEl || !groupActiveEl) return;
        if (!group) {
            groupNameEl.value = '';
            groupDescriptionEl.value = '';
            groupActiveEl.checked = true;
            return;
        }
        groupNameEl.value = String(group.name || '');
        groupDescriptionEl.value = String(group.description || '');
        groupActiveEl.checked = String(group.status || 'active') === 'active';
    };

    const renderGroups = () => {
        if (!groupsListEl) return;
        groupsListEl.innerHTML = '';
        if (!groups.length) {
            groupsListEl.innerHTML = '<div class="status-hint">Nenhum grupo cadastrado.</div>';
            return;
        }
        groups.forEach((group) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `permission-group-item ${group.id === selectedGroupId ? 'active' : ''}`;
            button.innerHTML = `
                <span class="group-name">${escapeHtml(group.name || 'Sem nome')}</span>
                <span class="group-meta">${group.status === 'active' ? 'Ativo' : 'Inativo'}</span>
            `;
            button.addEventListener('click', () => void selectGroup(group.id));
            groupsListEl.appendChild(button);
        });
    };

    const ensureSchema = async () => {
        try {
            const { error } = await window.dbClient.from('permission_groups').select('id').order('name', { ascending: true });
            if (error) throw error;
            schemaOk = true;
            return true;
        } catch (error) {
            schemaOk = false;
            const msg = 'Permissões indisponíveis. Rode o SQL atualizado (permission_groups e permission_group_rules).';
            setStatus(groupsStatusEl, msg);
            setStatus(matrixStatusEl, msg);
            console.error(error);
            return false;
        }
    };

    const loadRules = async (groupId) => {
        if (!groupId) {
            allowedKeys = new Set();
            renderMatrix();
            return;
        }
        const { data, error } = await window.dbClient
            .from('permission_group_rules')
            .select('screen_key, option_key, allowed')
            .eq('group_id', groupId)
            .order('screen_key', { ascending: true });
        if (error) throw error;
        allowedKeys = new Set((data || [])
            .filter((item) => item.allowed !== false)
            .map((item) => keyOf(item.screen_key, item.option_key)));
        renderMatrix();
    };

    const loadGroups = async () => {
        const { data, error } = await window.dbClient
            .from('permission_groups')
            .select('id, name, description, status')
            .order('name', { ascending: true });
        if (error) throw error;
        groups = Array.isArray(data) ? data : [];
        if (!groups.some((g) => g.id === selectedGroupId)) {
            selectedGroupId = groups.length ? groups[0].id : null;
        }
        renderGroups();
        fillGroupForm(groups.find((g) => g.id === selectedGroupId) || null);
        await loadRules(selectedGroupId);
        setStatus(groupsStatusEl, '');
    };

    const selectGroup = async (groupId) => {
        selectedGroupId = groupId;
        renderGroups();
        fillGroupForm(groups.find((g) => g.id === selectedGroupId) || null);
        await loadRules(selectedGroupId);
    };

    const saveGroup = async () => {
        const name = String(groupNameEl?.value || '').trim();
        const description = String(groupDescriptionEl?.value || '').trim();
        const status = groupActiveEl?.checked ? 'active' : 'inactive';
        if (!name) {
            notify('Informe o nome do grupo.', 'warning');
            return false;
        }

        const normalizedName = name.toLocaleLowerCase('pt-BR');
        const duplicated = groups.some((group) => {
            const sameId = selectedGroupId && String(group.id) === String(selectedGroupId);
            if (sameId) return false;
            return String(group.name || '').trim().toLocaleLowerCase('pt-BR') === normalizedName;
        });

        if (duplicated) {
            showValidationModal('Já existe um grupo com esse nome. Use um nome diferente.');
            return false;
        }

        setStatus(groupsStatusEl, '');
        if (selectedGroupId) {
            const { error } = await window.dbClient.from('permission_groups').update({ name, description: description || null, status }).eq('id', selectedGroupId);
            if (error) throw error;
        } else {
            const { data, error } = await window.dbClient
                .from('permission_groups')
                .insert([{ name, description: description || null, status }])
                .select('id')
                .single();
            if (error) throw error;
            selectedGroupId = data?.id || null;
        }
        await loadGroups();
        notify('Grupo salvo com sucesso.', 'success');
        return true;
    };

    const deleteGroup = async () => {
        const group = groups.find((g) => g.id === selectedGroupId);
        if (!group) {
            notify('Selecione um grupo para excluir.', 'warning');
            return;
        }
        if (!window.confirm(`Deseja excluir o grupo "${group.name}"?`)) return;
        const { error } = await window.dbClient.from('permission_groups').delete().eq('id', group.id);
        if (error) throw error;
        selectedGroupId = null;
        await loadGroups();
        notify('Grupo excluido com sucesso.', 'success');
    };

    const saveMatrix = async () => {
        if (!selectedGroupId) {
            notify('Selecione um grupo antes de salvar permissões.', 'warning');
            return;
        }
        const { error: deleteError } = await window.dbClient.from('permission_group_rules').delete().eq('group_id', selectedGroupId);
        if (deleteError) throw deleteError;

        const rows = Array.from(allowedKeys).map((k) => {
            const [screen, option] = k.split('|');
            return { group_id: selectedGroupId, screen_key: screen, option_key: option, allowed: true };
        });
        if (rows.length) {
            const { error: insertError } = await window.dbClient.from('permission_group_rules').insert(rows);
            if (insertError) throw insertError;
        }
        setStatus(matrixStatusEl, `Permissões salvas (${rows.length} regra(s)).`);
        notify('Permissões salvas com sucesso.', 'success');
    };

    const toggleAll = (enabled) => {
        if (!selectedGroupId) {
            notify('Selecione um grupo antes de editar permissões.', 'warning');
            return;
        }
        if (!enabled) {
            allowedKeys = new Set();
            renderMatrix();
            return;
        }
        const all = [];
        SCREENS.forEach((screen) => screen.options.forEach((option) => all.push(keyOf(screen.key, option))));
        allowedKeys = new Set(all);
        renderMatrix();
    };

    const init = async () => {
        if (!groupsListEl || !matrixGridEl || !window.dbClient) return;
        renderMatrix();
        if (!(await ensureSchema())) return;

        if (newGroupBtn) newGroupBtn.addEventListener('click', () => {
            selectedGroupId = null;
            fillGroupForm(null);
            allowedKeys = new Set();
            renderGroups();
            renderMatrix();
            setStatus(groupsStatusEl, '');
        });
        if (saveGroupBtn) saveGroupBtn.addEventListener('click', () => void saveGroup()
            .then((saved) => {
                if (saved) applySaveFeedback(saveGroupBtn);
            })
            .catch((e) => notify(`Falha ao salvar grupo: ${e.message || 'erro'}`, 'error')));
        if (deleteGroupBtn) deleteGroupBtn.addEventListener('click', () => void deleteGroup().catch((e) => notify(`Falha ao excluir grupo: ${e.message || 'erro'}`, 'error')));
        if (saveMatrixBtn) saveMatrixBtn.addEventListener('click', () => void saveMatrix()
            .then(() => applySaveFeedback(saveMatrixBtn))
            .catch((e) => notify(`Falha ao salvar permissões: ${e.message || 'erro'}`, 'error')));
        if (markAllBtn) markAllBtn.addEventListener('click', () => toggleAll(true));
        if (clearAllBtn) clearAllBtn.addEventListener('click', () => toggleAll(false));

        await loadGroups();
    };

    const applySaveFeedback = (button) => {
        if (!button) return;
        const originalHtml = button.getAttribute(SAVE_FEEDBACK_ATTR) || button.innerHTML;
        button.setAttribute(SAVE_FEEDBACK_ATTR, originalHtml);
        button.classList.add('save-success-feedback');
        button.classList.remove('permission-save-highlight');
        void button.offsetWidth;
        button.classList.add('permission-save-highlight');
        button.innerHTML = 'Salvo';

        setTimeout(() => {
            const restore = button.getAttribute(SAVE_FEEDBACK_ATTR) || originalHtml;
            button.classList.remove('save-success-feedback');
            button.classList.remove('permission-save-highlight');
            button.innerHTML = restore;
            button.removeAttribute(SAVE_FEEDBACK_ATTR);
        }, 1500);
    };

    return { init };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        void SettingsPermissionsModule.init();
    });
} else {
    void SettingsPermissionsModule.init();
}





