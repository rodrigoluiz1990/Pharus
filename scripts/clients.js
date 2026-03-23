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
    const clientTabButtons = Array.from(document.querySelectorAll('.client-tab-btn[data-client-tab]'));
    const clientTabPanels = Array.from(document.querySelectorAll('.client-tab-panel[data-client-panel]'));
    const searchAddressByZipBtn = document.getElementById('searchAddressByZipBtn');
    const addRemoteConnectionBtn = document.getElementById('addRemoteConnectionBtn');
    const clearRemoteConnectionFormBtn = document.getElementById('clearRemoteConnectionFormBtn');
    const remoteConnectionsTableBody = document.getElementById('remoteConnectionsTableBody');

    let clients = [];
    let filteredClients = [];
    let remoteConnections = [];
    let editingRemoteConnectionIndex = -1;
    let isInitialized = false;

    const setActiveFormTab = (tabId) => {
        const safeTab = ['general', 'address', 'remote'].includes(String(tabId || '')) ? tabId : 'general';

        clientTabButtons.forEach((button) => {
            const isActive = button.dataset.clientTab === safeTab;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        clientTabPanels.forEach((panel) => {
            panel.classList.toggle('active', panel.dataset.clientPanel === safeTab);
        });
    };

    const digitsOnly = (value) => String(value || '').replace(/\D+/g, '');

    const getRemoteConnectionFormValues = () => ({
        tool: document.getElementById('clientRemoteTool').value.trim() || null,
        access_id: document.getElementById('clientRemoteAccessId').value.trim() || null,
        password: document.getElementById('clientRemotePassword').value.trim() || null,
        notes: document.getElementById('clientRemoteNotes').value.trim() || null,
    });

    const fillRemoteConnectionForm = (connection) => {
        const data = connection || {};
        document.getElementById('clientRemoteTool').value = data.tool || 'AnyDesk';
        document.getElementById('clientRemoteAccessId').value = data.access_id || '';
        document.getElementById('clientRemotePassword').value = data.password || '';
        document.getElementById('clientRemoteNotes').value = data.notes || '';
    };

    const clearRemoteConnectionForm = () => {
        editingRemoteConnectionIndex = -1;
        fillRemoteConnectionForm({ tool: 'AnyDesk', access_id: '', password: '', notes: '' });
        if (addRemoteConnectionBtn) {
            addRemoteConnectionBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar conexão';
        }
    };

    const renderRemoteConnectionsTable = () => {
        if (!remoteConnectionsTableBody) return;
        if (!remoteConnections.length) {
            remoteConnectionsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-remote-connections">Nenhuma conexão adicionada.</td>
                </tr>
            `;
            return;
        }

        remoteConnectionsTableBody.innerHTML = '';
        remoteConnections.forEach((connection, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(connection.tool || '-')}</td>
                <td>${escapeHtml(connection.access_id || '-')}</td>
                <td>${escapeHtml(connection.password || '-')}</td>
                <td>${escapeHtml(connection.notes || '-')}</td>
                <td>
                    <div class="remote-row-actions">
                        <button type="button" class="btn-mini" data-remote-edit="${index}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button type="button" class="btn-mini" data-remote-remove="${index}">
                            <i class="fas fa-trash"></i> Remover
                        </button>
                    </div>
                </td>
            `;
            remoteConnectionsTableBody.appendChild(row);
        });

        remoteConnectionsTableBody.querySelectorAll('[data-remote-edit]').forEach((button) => {
            button.addEventListener('click', () => {
                const index = Number(button.getAttribute('data-remote-edit'));
                if (!Number.isInteger(index) || !remoteConnections[index]) return;
                editingRemoteConnectionIndex = index;
                fillRemoteConnectionForm(remoteConnections[index]);
                if (addRemoteConnectionBtn) {
                    addRemoteConnectionBtn.innerHTML = '<i class="fas fa-save"></i> Atualizar conexão';
                }
            });
        });

        remoteConnectionsTableBody.querySelectorAll('[data-remote-remove]').forEach((button) => {
            button.addEventListener('click', () => {
                const index = Number(button.getAttribute('data-remote-remove'));
                if (!Number.isInteger(index) || !remoteConnections[index]) return;
                remoteConnections.splice(index, 1);
                if (editingRemoteConnectionIndex === index) {
                    clearRemoteConnectionForm();
                } else if (editingRemoteConnectionIndex > index) {
                    editingRemoteConnectionIndex -= 1;
                }
                renderRemoteConnectionsTable();
            });
        });
    };

    const addOrUpdateRemoteConnection = () => {
        const values = getRemoteConnectionFormValues();
        if (!values.tool && !values.access_id && !values.password && !values.notes) {
            notify('Preencha ao menos um campo da conexão remota para adicionar.', 'warning');
            return;
        }

        if (editingRemoteConnectionIndex >= 0 && remoteConnections[editingRemoteConnectionIndex]) {
            remoteConnections[editingRemoteConnectionIndex] = values;
        } else {
            remoteConnections.push(values);
        }

        clearRemoteConnectionForm();
        renderRemoteConnectionsTable();
    };

    const fillAddressByZip = async () => {
        const zipField = document.getElementById('clientAddressZipCode');
        if (!zipField) return;

        const zipDigits = digitsOnly(zipField.value);
        if (zipDigits.length !== 8) {
            notify('Informe um CEP valido com 8 digitos.', 'warning');
            return;
        }

        try {
            if (searchAddressByZipBtn) {
                searchAddressByZipBtn.disabled = true;
                searchAddressByZipBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
            }

            const response = await fetch(`https://viacep.com.br/ws/${zipDigits}/json/`);
            if (!response.ok) throw new Error('Falha na consulta de CEP');
            const data = await response.json();
            if (!data || data.erro) {
                notify('CEP nao encontrado.', 'warning');
                return;
            }

            document.getElementById('clientAddressStreet').value = data.logradouro || '';
            document.getElementById('clientAddressDistrict').value = data.bairro || '';
            document.getElementById('clientAddressCity').value = data.localidade || '';
            document.getElementById('clientAddressState').value = String(data.uf || '').toUpperCase();
            zipField.value = zipDigits.replace(/^(\d{5})(\d)/, '$1-$2');

            notify('Endereço preenchido a partir do CEP.', 'success');
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            notify('Não foi possível consultar o CEP agora.', 'error');
        } finally {
            if (searchAddressByZipBtn) {
                searchAddressByZipBtn.disabled = false;
                searchAddressByZipBtn.innerHTML = '<i class="fas fa-search-location"></i> Buscar CEP';
            }
        }
    };

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
                <td>${escapeHtml(client.acronym || '-')}</td>
                <td>${escapeHtml(client.contact_name || '-')}</td>
                <td>${escapeHtml(client.email || '-')}</td>
                <td>${escapeHtml(client.phone || '-')}</td>
                <td><span class="client-status status-${status}">${getStatusText(status)}</span></td>
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
                client.acronym,
                client.contact_name,
                client.email,
                client.phone,
                client.cnpj,
                client.address_city,
                client.address_district,
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
        setActiveFormTab('general');
        const statusField = document.getElementById('clientStatus');
        if (statusField) statusField.value = 'active';
        remoteConnections = [];
        clearRemoteConnectionForm();
        renderRemoteConnectionsTable();
        if (deleteClientBtn) deleteClientBtn.style.display = 'none';
        clientModal.style.display = 'flex';
    };

    const openEditModal = (clientId) => {
        const client = clients.find((item) => item.id === clientId);
        if (!client || !clientModal) return;

        clientModalTitle.textContent = 'Editar Cliente';
        clientIdField.value = client.id;
        document.getElementById('clientName').value = client.name || '';
        document.getElementById('clientAcronym').value = client.acronym || '';
        document.getElementById('clientContactName').value = client.contact_name || '';
        document.getElementById('clientEmail').value = client.email || '';
        document.getElementById('clientPhone').value = client.phone || '';
        document.getElementById('clientCnpj').value = client.cnpj || '';
        document.getElementById('clientMunicipalRegistration').value = client.municipal_registration || '';
        document.getElementById('clientStateRegistration').value = client.state_registration || '';
        document.getElementById('clientStatus').value = getSafeStatus(client.status);
        document.getElementById('clientNotes').value = client.notes || '';
        document.getElementById('clientAddressStreet').value = client.address_street || '';
        document.getElementById('clientAddressNumber').value = client.address_number || '';
        document.getElementById('clientAddressComplement').value = client.address_complement || '';
        document.getElementById('clientAddressDistrict').value = client.address_district || '';
        document.getElementById('clientAddressCity').value = client.address_city || '';
        document.getElementById('clientAddressState').value = client.address_state || '';
        document.getElementById('clientAddressZipCode').value = client.address_zip_code || '';
        const rawConnections = typeof client.remote_connections === 'string'
            ? (() => {
                try { return JSON.parse(client.remote_connections); } catch (_error) { return []; }
            })()
            : client.remote_connections;
        const fromArray = Array.isArray(rawConnections) ? rawConnections : [];
        if (fromArray.length) {
            remoteConnections = fromArray
                .map((item) => ({
                    tool: String(item?.tool || '').trim() || null,
                    access_id: String(item?.access_id || '').trim() || null,
                    password: String(item?.password || '').trim() || null,
                    notes: String(item?.notes || '').trim() || null,
                }))
                .filter((item) => item.tool || item.access_id || item.password || item.notes);
        } else {
            const fallbackConnection = {
                tool: client.remote_tool || null,
                access_id: client.remote_access_id || null,
                password: client.remote_password || null,
                notes: client.remote_notes || null,
            };
            remoteConnections = (fallbackConnection.tool || fallbackConnection.access_id || fallbackConnection.password || fallbackConnection.notes)
                ? [fallbackConnection]
                : [];
        }
        clearRemoteConnectionForm();
        renderRemoteConnectionsTable();
        setActiveFormTab('general');

        if (deleteClientBtn) deleteClientBtn.style.display = 'inline-flex';
        clientModal.style.display = 'flex';
    };

    const closeModal = () => {
        if (clientModal) clientModal.style.display = 'none';
    };

    const validateForm = () => {
        const name = document.getElementById('clientName').value.trim();
        const acronym = document.getElementById('clientAcronym').value.trim();
        const email = document.getElementById('clientEmail').value.trim();
        const cnpjRaw = document.getElementById('clientCnpj').value.trim();

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

        if (acronym.length > 20) {
            notify('A sigla deve ter no maximo 20 caracteres.', 'error');
            return false;
        }

        if (cnpjRaw) {
            const cnpjDigits = digitsOnly(cnpjRaw);
            if (cnpjDigits.length !== 14) {
                notify('CNPJ invalido. Informe 14 digitos.', 'error');
                return false;
            }
        }

        return true;
    };

    const getFormPayload = () => {
        const draftConnection = getRemoteConnectionFormValues();
        const hasDraft = Boolean(draftConnection.tool || draftConnection.access_id || draftConnection.password || draftConnection.notes);
        const mergedConnections = [...remoteConnections];
        if (hasDraft) {
            if (editingRemoteConnectionIndex >= 0 && mergedConnections[editingRemoteConnectionIndex]) {
                mergedConnections[editingRemoteConnectionIndex] = draftConnection;
            } else {
                mergedConnections.push(draftConnection);
            }
        }

        const normalizedConnections = mergedConnections
            .map((item) => ({
                tool: String(item?.tool || '').trim() || null,
                access_id: String(item?.access_id || '').trim() || null,
                password: String(item?.password || '').trim() || null,
                notes: String(item?.notes || '').trim() || null,
            }))
            .filter((item) => item.tool || item.access_id || item.password || item.notes);

        const firstConnection = normalizedConnections[0] || {};

        return {
            name: document.getElementById('clientName').value.trim(),
            acronym: (document.getElementById('clientAcronym').value || '').trim().toUpperCase() || null,
            contact_name: document.getElementById('clientContactName').value.trim() || null,
            email: document.getElementById('clientEmail').value.trim() || null,
            phone: document.getElementById('clientPhone').value.trim() || null,
            cnpj: digitsOnly(document.getElementById('clientCnpj').value) || null,
            municipal_registration: document.getElementById('clientMunicipalRegistration').value.trim() || null,
            state_registration: document.getElementById('clientStateRegistration').value.trim() || null,
            address_street: document.getElementById('clientAddressStreet').value.trim() || null,
            address_number: document.getElementById('clientAddressNumber').value.trim() || null,
            address_complement: document.getElementById('clientAddressComplement').value.trim() || null,
            address_district: document.getElementById('clientAddressDistrict').value.trim() || null,
            address_city: document.getElementById('clientAddressCity').value.trim() || null,
            address_state: (document.getElementById('clientAddressState').value || '').trim().toUpperCase() || null,
            address_zip_code: digitsOnly(document.getElementById('clientAddressZipCode').value) || null,
            remote_tool: firstConnection.tool || null,
            remote_access_id: firstConnection.access_id || null,
            remote_password: firstConnection.password || null,
            remote_notes: firstConnection.notes || null,
            remote_connections: normalizedConnections.length ? normalizedConnections : null,
            status: getSafeStatus(document.getElementById('clientStatus').value),
            notes: document.getElementById('clientNotes').value.trim() || null,
            updated_at: new Date().toISOString(),
        };
    };

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
            const rawMessage = String(error?.message || 'falha inesperada');
            const columnMismatch = rawMessage.includes('column') && rawMessage.includes('clients');
            const finalMessage = columnMismatch
                ? 'Erro ao salvar cliente: atualize o banco com o SQL mais recente (novos campos de clientes).'
                : `Erro ao salvar cliente: ${rawMessage}`;
            notify(finalMessage, 'error');
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
        if (searchAddressByZipBtn) searchAddressByZipBtn.addEventListener('click', () => void fillAddressByZip());
        if (addRemoteConnectionBtn) addRemoteConnectionBtn.addEventListener('click', addOrUpdateRemoteConnection);
        if (clearRemoteConnectionFormBtn) clearRemoteConnectionFormBtn.addEventListener('click', clearRemoteConnectionForm);

        clientTabButtons.forEach((button) => {
            button.addEventListener('click', () => {
                setActiveFormTab(button.dataset.clientTab || 'general');
            });
        });

        const cnpjField = document.getElementById('clientCnpj');
        if (cnpjField) {
            cnpjField.addEventListener('input', () => {
                const digits = digitsOnly(cnpjField.value).slice(0, 14);
                cnpjField.value = digits
                    .replace(/^(\d{2})(\d)/, '$1.$2')
                    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                    .replace(/\.(\d{3})(\d)/, '.$1/$2')
                    .replace(/(\d{4})(\d)/, '$1-$2');
            });
        }

        const cepField = document.getElementById('clientAddressZipCode');
        if (cepField) {
            cepField.addEventListener('input', () => {
                const digits = digitsOnly(cepField.value).slice(0, 8);
                cepField.value = digits.replace(/^(\d{5})(\d)/, '$1-$2');
            });
            cepField.addEventListener('blur', () => {
                const digits = digitsOnly(cepField.value);
                if (digits.length === 8) {
                    void fillAddressByZip();
                }
            });
        }

        const ufField = document.getElementById('clientAddressState');
        if (ufField) {
            ufField.addEventListener('input', () => {
                ufField.value = String(ufField.value || '').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
            });
        }

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
