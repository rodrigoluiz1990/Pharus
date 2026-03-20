// scripts/clients.js
const ClientsModule = (() => {
    const clientsTableBody = document.getElementById('clientsTableBody');
    const addClientBtn = document.getElementById('addClientBtn');
    const clientModal = document.getElementById('clientModal');
    const clientForm = document.getElementById('clientForm');
    const clientModalTitle = document.getElementById('clientModalTitle');
    const clientIdField = document.getElementById('clientId');
    const closeClientModal = document.getElementById('closeClientModal');
    const cancelClientBtn = document.getElementById('cancelClient');
    const deleteClientBtn = document.getElementById('deleteClient');
    const clientSearchInput = document.getElementById('clientSearch');
    const clientStatusFilter = document.getElementById('clientStatusFilter');

    let clients = [];
    let filteredClients = [];
    let isInitialized = false;

    const showLoading = (message) => {
        if (typeof UtilsModule !== 'undefined' && typeof UtilsModule.showLoading === 'function') {
            UtilsModule.showLoading(message || 'Carregando...');
        }
    };

    const hideLoading = () => {
        if (typeof UtilsModule !== 'undefined' && typeof UtilsModule.hideLoading === 'function') {
            UtilsModule.hideLoading();
        }
    };

    const notify = (message, type) => {
        if (typeof UtilsModule !== 'undefined' && typeof UtilsModule.showNotification === 'function') {
            UtilsModule.showNotification(message, type || 'info');
            return;
        }
        alert(message);
    };

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = String(text ?? '');
        return div.innerHTML;
    };

    const formatDate = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('pt-BR');
    };

    const getStatusText = (status) => (status === 'inactive' ? 'Inativo' : 'Ativo');

    const getSafeStatus = (status) => (status === 'inactive' ? 'inactive' : 'active');

    const showTableLoading = () => {
        if (!clientsTableBody) return;
        clientsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-clients">
                    <i class="fas fa-spinner fa-spin"></i> Carregando clientes...
                </td>
            </tr>
        `;
    };

    const renderTable = () => {
        if (!clientsTableBody) return;

        if (!filteredClients.length) {
            clientsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-clients">
                        <i class="fas fa-building"></i>
                        <div>Nenhum cliente encontrado</div>
                    </td>
                </tr>
            `;
            return;
        }

        clientsTableBody.innerHTML = '';

        filteredClients.forEach((client) => {
            const status = getSafeStatus(client.status);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(client.name || '-')}</td>
                <td>${escapeHtml(client.contact_name || '-')}</td>
                <td>${escapeHtml(client.email || '-')}</td>
                <td>${escapeHtml(client.phone || '-')}</td>
                <td><span class="client-status status-${status}">${getStatusText(status)}</span></td>
                <td>${formatDate(client.created_at)}</td>
                <td>
                    <div class="client-actions">
                        <button class="btn-edit" data-client-id="${client.id}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    </div>
                </td>
            `;
            clientsTableBody.appendChild(row);
        });

        addTableListeners();
    };

    const applyFilters = () => {
        const searchTerm = (clientSearchInput?.value || '').trim().toLowerCase();
        const status = clientStatusFilter?.value || '';

        filteredClients = clients.filter((client) => {
            if (status && getSafeStatus(client.status) !== status) return false;

            if (!searchTerm) return true;

            const values = [
                client.name,
                client.contact_name,
                client.email,
                client.phone,
            ]
                .map((v) => String(v || '').toLowerCase())
                .join(' ');

            return values.includes(searchTerm);
        });

        renderTable();
    };

    const loadClients = async () => {
        try {
            showTableLoading();

            const { data: sessionData, error: sessionError } = await window.supabaseClient.auth.getSession();
            if (sessionError || !sessionData?.session) {
                throw new Error('Usuario nao autenticado. Faca login novamente.');
            }

            const { data, error } = await window.supabaseClient
                .from('clients')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

            clients = Array.isArray(data) ? data : [];
            applyFilters();
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            if (clientsTableBody) {
                clientsTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="empty-clients" style="color:#c0392b;">
                            <i class="fas fa-exclamation-triangle"></i>
                            <div>${escapeHtml(error.message || 'Falha ao carregar clientes')}</div>
                        </td>
                    </tr>
                `;
            }
        }
    };

    const openAddModal = () => {
        if (!clientModal || !clientForm) return;
        clientModalTitle.textContent = 'Novo Cliente';
        clientIdField.value = '';
        clientForm.reset();
        const statusField = document.getElementById('clientStatus');
        if (statusField) statusField.value = 'active';
        if (deleteClientBtn) deleteClientBtn.style.display = 'none';
        clientModal.style.display = 'flex';
    };

    const openEditModal = (clientId) => {
        const client = clients.find((item) => item.id === clientId);
        if (!client || !clientModal) return;

        clientModalTitle.textContent = 'Editar Cliente';
        clientIdField.value = client.id;
        document.getElementById('clientName').value = client.name || '';
        document.getElementById('clientContactName').value = client.contact_name || '';
        document.getElementById('clientEmail').value = client.email || '';
        document.getElementById('clientPhone').value = client.phone || '';
        document.getElementById('clientStatus').value = getSafeStatus(client.status);
        document.getElementById('clientNotes').value = client.notes || '';

        if (deleteClientBtn) deleteClientBtn.style.display = 'inline-flex';
        clientModal.style.display = 'flex';
    };

    const closeModal = () => {
        if (clientModal) clientModal.style.display = 'none';
    };

    const validateForm = () => {
        const name = document.getElementById('clientName').value.trim();
        const email = document.getElementById('clientEmail').value.trim();

        if (!name) {
            notify('Nome do cliente e obrigatorio.', 'error');
            return false;
        }

        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                notify('Email invalido.', 'error');
                return false;
            }
        }

        return true;
    };

    const getFormPayload = () => ({
        name: document.getElementById('clientName').value.trim(),
        contact_name: document.getElementById('clientContactName').value.trim() || null,
        email: document.getElementById('clientEmail').value.trim() || null,
        phone: document.getElementById('clientPhone').value.trim() || null,
        status: getSafeStatus(document.getElementById('clientStatus').value),
        notes: document.getElementById('clientNotes').value.trim() || null,
        updated_at: new Date().toISOString(),
    });

    const saveClient = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            showLoading('Salvando cliente...');

            const payload = getFormPayload();
            const clientId = clientIdField.value;
            let error = null;

            if (!clientId) {
                const insertPayload = { ...payload };
                delete insertPayload.updated_at;

                const result = await window.supabaseClient
                    .from('clients')
                    .insert([insertPayload])
                    .select('*')
                    .single();
                error = result.error;
            } else {
                const result = await window.supabaseClient
                    .from('clients')
                    .update(payload)
                    .eq('id', clientId)
                    .select('*')
                    .single();
                error = result.error;
            }

            if (error) throw error;

            hideLoading();
            notify('Cliente salvo com sucesso.', 'success');
            closeModal();
            await loadClients();
        } catch (error) {
            hideLoading();
            console.error('Erro ao salvar cliente:', error);
            notify(`Erro ao salvar cliente: ${error.message || 'falha inesperada'}`, 'error');
        }
    };

    const deleteClient = async () => {
        const clientId = clientIdField.value;
        if (!clientId) return;

        const confirmed = window.confirm('Deseja excluir este cliente?');
        if (!confirmed) return;

        try {
            showLoading('Excluindo cliente...');

            const { error } = await window.supabaseClient
                .from('clients')
                .delete()
                .eq('id', clientId);

            if (error) throw error;

            hideLoading();
            notify('Cliente excluido com sucesso.', 'success');
            closeModal();
            await loadClients();
        } catch (error) {
            hideLoading();
            console.error('Erro ao excluir cliente:', error);
            notify(`Erro ao excluir cliente: ${error.message || 'falha inesperada'}`, 'error');
        }
    };

    const addTableListeners = () => {
        const editButtons = document.querySelectorAll('.client-actions .btn-edit');
        editButtons.forEach((button) => {
            button.addEventListener('click', (event) => {
                const clientId = event.currentTarget.getAttribute('data-client-id');
                if (clientId) openEditModal(clientId);
            });
        });
    };

    const attachEvents = () => {
        if (addClientBtn) addClientBtn.addEventListener('click', openAddModal);
        if (clientForm) clientForm.addEventListener('submit', saveClient);
        if (closeClientModal) closeClientModal.addEventListener('click', closeModal);
        if (cancelClientBtn) cancelClientBtn.addEventListener('click', closeModal);
        if (deleteClientBtn) deleteClientBtn.addEventListener('click', deleteClient);

        if (clientSearchInput) {
            clientSearchInput.addEventListener('input', applyFilters);
        }

        if (clientStatusFilter) {
            clientStatusFilter.addEventListener('change', applyFilters);
        }

        if (clientModal) {
            clientModal.addEventListener('click', (event) => {
                if (event.target === clientModal) closeModal();
            });
        }
    };

    const initClientsModule = async () => {
        if (isInitialized) return;
        isInitialized = true;

        attachEvents();
        await loadClients();
    };

    return {
        initClientsModule,
        loadClients,
    };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ClientsModule.initClientsModule();
    });
} else {
    ClientsModule.initClientsModule();
}
