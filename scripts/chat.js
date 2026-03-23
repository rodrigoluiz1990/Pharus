// scripts/chat.js
const ChatModule = (() => {
    let currentReceiver = null;
    let chatSocket = null;
    let currentUser = null;
    let unreadMessages = new Map();
    let isInitialized = false;
    let isInitializing = false;
    let conversationRefreshInterval = null;
    let contactsRefreshInterval = null;
    let lastMessagesSnapshot = new Map();
    let selectedAttachment = null;
    let isSendingAttachment = false;
    let editingMessageId = null;
    let autoOpenHandled = false;
    let newMessageToastTimer = null;
    const EMOJI_OPTIONS = [
        '\u{1F600}', '\u{1F601}', '\u{1F602}', '\u{1F60A}', '\u{1F609}',
        '\u{1F60D}', '\u{1F60E}', '\u{1F914}', '\u{1F44D}', '\u{1F44F}',
        '\u{1F64F}', '\u{1F3AF}', '\u{1F525}', '\u{2705}', '\u{26A0}\u{FE0F}',
        '\u{2757}', '\u{1F4A1}', '\u{1F4CC}', '\u{1F680}', '\u{1F4AC}',
    ];

    const elements = {
        chatContainer: null,
        chatToggle: null,
        contactsList: null,
        chatMessages: null,
        messageInput: null,
        sendButton: null,
        closeChat: null,
        backToContacts: null,
        chatSearch: null,
        onlineCount: null,
        unreadBadge: null,
        currentChatName: null,
        currentChatStatus: null,
        currentChatAvatar: null,
        attachFileBtn: null,
        chatAttachmentInput: null,
        selectedAttachmentInfo: null,
        emojiBtn: null,
        emojiPicker: null
    };

    const initChatModule = async () => {
        if (isInitialized || isInitializing) {
            return;
        }
        isInitializing = true;

        try {
            await createChatInterface();
            await loadCurrentUser();
            setupEventListeners();
            setupRealtimeSubscription();
            await loadContacts();
            updateUnreadBadge();
            isInitialized = true;
            maybeAutoOpenChatFromUrl();
            
            console.log('MÃ³dulo de chat inicializado com sucesso');
        } catch (error) {
            console.error('Erro ao inicializar mÃ³dulo de chat:', error);
        } finally {
            isInitializing = false;
        }
    };

    const createChatInterface = async () => {
        // Carregar o template do chat
        try {
            // Evitar duplicidade de elementos do chat no DOM
            if (document.getElementById('chatContainer')) {
                elements.chatContainer = document.getElementById('chatContainer');
                elements.chatToggle = document.getElementById('chatToggle');
                elements.contactsList = document.getElementById('contactsList');
                elements.chatMessages = document.getElementById('chatMessages');
                elements.messageInput = document.getElementById('messageInput');
                elements.sendButton = document.getElementById('sendMessage');
                elements.closeChat = document.getElementById('closeChat');
                elements.backToContacts = document.getElementById('backToContacts');
                elements.chatSearch = document.getElementById('chatSearch');
                elements.onlineCount = document.getElementById('onlineCount');
                elements.unreadBadge = document.getElementById('unreadBadge');
                elements.currentChatName = document.getElementById('currentChatName');
                elements.currentChatStatus = document.getElementById('currentChatStatus');
                elements.currentChatAvatar = document.getElementById('currentChatAvatar');
                elements.attachFileBtn = document.getElementById('attachFileBtn');
                elements.chatAttachmentInput = document.getElementById('chatAttachmentInput');
                elements.selectedAttachmentInfo = document.getElementById('selectedAttachmentInfo');
                elements.emojiBtn = document.getElementById('emojiBtn');
                elements.emojiPicker = document.getElementById('emojiPicker');
                return;
            }

            const response = await fetch('chat.html');
            const chatHTML = await response.text();
            
            // Adicionar ao DOM
            const chatContainer = document.createElement('div');
            chatContainer.innerHTML = chatHTML;
            document.body.appendChild(chatContainer);
            
            // Configurar elementos
            elements.chatContainer = document.getElementById('chatContainer');
            elements.chatToggle = document.getElementById('chatToggle');
            elements.contactsList = document.getElementById('contactsList');
            elements.chatMessages = document.getElementById('chatMessages');
            elements.messageInput = document.getElementById('messageInput');
            elements.sendButton = document.getElementById('sendMessage');
            elements.closeChat = document.getElementById('closeChat');
            elements.backToContacts = document.getElementById('backToContacts');
            elements.chatSearch = document.getElementById('chatSearch');
            elements.onlineCount = document.getElementById('onlineCount');
            elements.unreadBadge = document.getElementById('unreadBadge');
            elements.currentChatName = document.getElementById('currentChatName');
            elements.currentChatStatus = document.getElementById('currentChatStatus');
            elements.currentChatAvatar = document.getElementById('currentChatAvatar');
            elements.attachFileBtn = document.getElementById('attachFileBtn');
            elements.chatAttachmentInput = document.getElementById('chatAttachmentInput');
            elements.selectedAttachmentInfo = document.getElementById('selectedAttachmentInfo');
            elements.emojiBtn = document.getElementById('emojiBtn');
            elements.emojiPicker = document.getElementById('emojiPicker');
            
            // Aplicar estilos se nÃ£o estiverem carregados
            if (!document.querySelector('link[href="styles/chat.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'styles/chat.css';
                document.head.appendChild(link);
            }
        } catch (error) {
            console.error('Erro ao carregar interface do chat:', error);
            // Criar interface bÃ¡sica se o arquivo nÃ£o existir
            createFallbackInterface();
        }
    };

    const createFallbackInterface = () => {
        // ImplementaÃ§Ã£o de fallback caso o chat.html nÃ£o exista
        const chatHTML = `
            <div id="chatContainer" class="chat-hidden">
                <div class="chat-header">
                    <h3>Chat</h3>
                </div>
                <div class="chat-contacts">
                    <div id="contactsList"></div>
                </div>
                <div class="chat-messages-container">
                    <div id="chatHeader" class="chat-conversation-header">
                        <button id="backToContacts" class="back-button" type="button" title="Voltar para contatos" aria-label="Voltar para contatos">
                            <span class="back-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                                    <path d="M15.5 5.5L9 12l6.5 6.5" />
                                </svg>
                            </span>
                            <span class="back-label">Voltar</span>
                        </button>
                        <div id="currentChatInfo"></div>
                    </div>
                    <div id="chatMessages" class="chat-messages"></div>
                    <div id="selectedAttachmentInfo" class="selected-attachment-info" style="display: none;"></div>
                    <div class="chat-input-container">
                        <input type="text" id="messageInput" placeholder="Digite uma mensagem...">
                        <input type="file" id="chatAttachmentInput" style="display: none;">
                        <button id="attachFileBtn" class="chat-input-btn"><i class="fas fa-paperclip"></i></button>
                        <button id="emojiBtn" class="chat-input-btn"><i class="fas fa-face-smile"></i></button>
                        <button id="sendMessage" class="send-button"><i class="fas fa-paper-plane"></i></button>
                        <div id="emojiPicker" class="emoji-picker hidden" aria-hidden="true"></div>
                    </div>
                </div>
            </div>
            <button id="chatToggle" class="chat-toggle">
                <i class="fas fa-comment"></i>
                <span id="unreadBadge" class="unread-badge" style="display: none;">0</span>
            </button>
        `;
        
        const container = document.createElement('div');
        container.innerHTML = chatHTML;
        document.body.appendChild(container);
        
        // Configurar elementos
        elements.chatContainer = document.getElementById('chatContainer');
        elements.chatToggle = document.getElementById('chatToggle');
        elements.contactsList = document.getElementById('contactsList');
        elements.chatMessages = document.getElementById('chatMessages');
        elements.messageInput = document.getElementById('messageInput');
        elements.sendButton = document.getElementById('sendMessage');
        elements.closeChat = document.getElementById('closeChat');
        elements.backToContacts = document.getElementById('backToContacts');
        elements.unreadBadge = document.getElementById('unreadBadge');
        elements.attachFileBtn = document.getElementById('attachFileBtn');
        elements.chatAttachmentInput = document.getElementById('chatAttachmentInput');
        elements.selectedAttachmentInfo = document.getElementById('selectedAttachmentInfo');
        elements.emojiBtn = document.getElementById('emojiBtn');
        elements.emojiPicker = document.getElementById('emojiPicker');
    };

    const loadCurrentUser = async () => {
        try {
            // Verificar se o Supabase Client estÃ¡ disponÃ­vel
            if (!window.supabaseClient) {
                console.warn('Supabase Client nÃ£o disponÃ­vel');
                throw new Error('Supabase Client nÃ£o estÃ¡ disponÃ­vel');
            }
            
            // Verificar se o mÃ©todo auth.getUser existe
            if (!window.supabaseClient.auth || typeof window.supabaseClient.auth.getUser !== 'function') {
                console.warn('MÃ©todo auth.getUser nÃ£o disponÃ­vel');
                throw new Error('AutenticaÃ§Ã£o nÃ£o disponÃ­vel');
            }
            
            const { data, error } = await window.supabaseClient.auth.getUser();
            
            if (error) {
                console.error('Erro ao obter usuÃ¡rio:', error);
                throw error;
            }
            
            if (!data || !data.user) {
                console.warn('Nenhum usuÃ¡rio autenticado encontrado');
                throw new Error('UsuÃ¡rio nÃ£o autenticado');
            }
            
            currentUser = data.user;
            console.log('UsuÃ¡rio carregado:', currentUser.id);
            
        } catch (error) {
            console.error('Erro ao carregar usuÃ¡rio atual:', error);
            // Tentar obter o usuÃ¡rio da sessÃ£o como fallback
            await tryGetUserFromSession();
        }
    };

    const tryGetUserFromSession = async () => {
        try {
            if (window.supabaseClient && window.supabaseClient.auth.getSession) {
                const { data: sessionData } = await window.supabaseClient.auth.getSession();
                if (sessionData && sessionData.session && sessionData.session.user) {
                    currentUser = sessionData.session.user;
                    console.log('UsuÃ¡rio obtido da sessÃ£o:', currentUser.id);
                }
            }
        } catch (sessionError) {
            console.error('Erro ao obter usuÃ¡rio da sessÃ£o:', sessionError);
        }
    };

    const setupEventListeners = () => {
        if (elements.chatToggle) {
            if (!elements.chatToggle.dataset.boundToggle) {
                elements.chatToggle.addEventListener('click', toggleChat);
                elements.chatToggle.dataset.boundToggle = 'true';
            }
        }
        
        if (elements.closeChat) {
            if (!elements.closeChat.dataset.boundClose) {
                elements.closeChat.addEventListener('click', closeChat);
                elements.closeChat.dataset.boundClose = 'true';
            }
        }
        
        if (elements.sendButton) {
            if (!elements.sendButton.dataset.boundSend) {
                elements.sendButton.addEventListener('click', sendMessage);
                elements.sendButton.dataset.boundSend = 'true';
            }
        }
        
        if (elements.messageInput) {
            elements.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendMessage();
            });
            
            elements.messageInput.addEventListener('input', () => {
                updateSendButtonState();
            });
        }
        
        if (elements.backToContacts) {
            if (!elements.backToContacts.dataset.boundBack) {
                elements.backToContacts.addEventListener('click', showContacts);
                elements.backToContacts.dataset.boundBack = 'true';
            }
        }

        if (elements.attachFileBtn) {
            if (!elements.attachFileBtn.dataset.boundAttach) {
                elements.attachFileBtn.addEventListener('click', handleAttachmentButtonClick);
                elements.attachFileBtn.dataset.boundAttach = 'true';
            }
        }

        if (elements.chatAttachmentInput) {
            if (!elements.chatAttachmentInput.dataset.boundAttachmentInput) {
                elements.chatAttachmentInput.addEventListener('change', handleAttachmentSelected);
                elements.chatAttachmentInput.dataset.boundAttachmentInput = 'true';
            }
        }

        if (elements.emojiBtn) {
            if (!elements.emojiBtn.dataset.boundEmoji) {
                elements.emojiBtn.addEventListener('click', toggleEmojiPicker);
                elements.emojiBtn.dataset.boundEmoji = 'true';
            }
        }
        
        if (elements.chatSearch) {
            if (!elements.chatSearch.dataset.boundSearch) {
                elements.chatSearch.addEventListener('input', filterContacts);
                elements.chatSearch.dataset.boundSearch = 'true';
            }
        }
        
        if (!document.body.dataset.chatEmojiBound) {
            document.addEventListener('click', handleDocumentClickForEmojiPicker);
            document.body.dataset.chatEmojiBound = 'true';
        }

        buildEmojiPicker();

        updateSendButtonState();
    };

    const updateSendButtonState = () => {
        if (!elements.sendButton || !elements.messageInput) return;
        const hasText = Boolean(elements.messageInput.value.trim());
        const hasAttachment = Boolean(selectedAttachment);
        elements.sendButton.disabled = isSendingAttachment || (!hasText && !hasAttachment);
    };

    const toggleChat = () => {
        if (!elements.chatContainer) return;
        
        // Se o usuÃ¡rio nÃ£o estiver carregado, tentar carregar novamente
        if (!currentUser) {
            loadCurrentUser().then(() => {
                if (currentUser) {
                    elements.chatContainer.classList.toggle('chat-open');
                    if (elements.chatContainer.classList.contains('chat-open')) {
                        loadContacts();
                        startContactsPolling();
                    } else {
                        stopContactsPolling();
                        stopConversationPolling();
                    }
                } else {
                    console.error('NÃ£o foi possÃ­vel carregar o usuÃ¡rio para o chat');
                    UtilsModule.showNotification('Erro ao abrir o chat. FaÃ§a login novamente.', 'error');
                }
            });
            return;
        }
        
        elements.chatContainer.classList.toggle('chat-open');
        if (elements.chatContainer.classList.contains('chat-open')) {
            loadContacts();
            startContactsPolling();
        } else {
            stopContactsPolling();
            stopConversationPolling();
        }
    };

    const maybeAutoOpenChatFromUrl = () => {
        if (autoOpenHandled) return;

        const search = new URLSearchParams(window.location.search || '');
        const openChatParam = String(search.get('openChat') || '').toLowerCase();
        const hash = String(window.location.hash || '').toLowerCase();
        const shouldAutoOpen = openChatParam === '1' || openChatParam === 'true' || hash === '#chat';
        if (!shouldAutoOpen) return;

        autoOpenHandled = true;
        setTimeout(() => {
            if (!elements.chatContainer || elements.chatContainer.classList.contains('chat-open')) return;
            toggleChat();
        }, 250);
    };

    const closeChat = () => {
        if (elements.chatContainer) {
            elements.chatContainer.classList.remove('chat-open');
        }
        currentReceiver = null;
        hideEmojiPicker();
        stopContactsPolling();
        stopConversationPolling();
    };

    const showContacts = () => {
        if (document.querySelector('.chat-contacts')) {
            document.querySelector('.chat-contacts').style.display = 'flex';
        }
        if (document.querySelector('.chat-messages-container')) {
            document.querySelector('.chat-messages-container').style.display = 'none';
        }
        currentReceiver = null;
        hideEmojiPicker();
        stopConversationPolling();
        clearSelectedAttachment();
    };

    const filterContacts = () => {
        if (!elements.chatSearch || !elements.contactsList) return;
        
        const searchTerm = elements.chatSearch.value.toLowerCase();
        const contactItems = elements.contactsList.querySelectorAll('.contact-item');
        
        contactItems.forEach(item => {
            const nameElement = item.querySelector('.contact-name');
            const statusElement = item.querySelector('.contact-status');
            
            if (nameElement && statusElement) {
                const name = nameElement.textContent.toLowerCase();
                const email = statusElement.textContent.toLowerCase();
                
                if (name.includes(searchTerm) || email.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            }
        });
    };

    const buildUnreadMap = (messages) => {
        const map = new Map();
        (messages || []).forEach((message) => {
            const senderId = String(message.sender_id || '');
            if (!senderId) return;
            map.set(senderId, (map.get(senderId) || 0) + 1);
        });
        return map;
    };

    const buildLastMessageMap = (messages) => {
        const map = new Map();
        (messages || []).forEach((message) => {
            const senderId = String(message.sender_id || '');
            const receiverId = String(message.receiver_id || '');
            const contactId = senderId === String(currentUser.id) ? receiverId : senderId;
            if (!contactId || map.has(contactId)) return;
            map.set(contactId, message);
        });
        return map;
    };

    const loadContacts = async () => {
        try {
            if (!elements.contactsList || !currentUser) return;

            elements.contactsList.innerHTML = '<div class="loading-contacts">Carregando contatos...</div>';

            const [contactsResult, unreadResult, messagesResult] = await Promise.all([
                window.supabaseClient
                    .from('user_profiles')
                    .select('id, full_name, email, status, last_sign_in_at')
                    .neq('id', currentUser.id)
                    .order('full_name', { ascending: true }),
                window.supabaseClient
                    .from('chat_messages')
                    .select('id, sender_id, receiver_id, is_read')
                    .eq('receiver_id', currentUser.id)
                    .eq('is_read', false),
                window.supabaseClient
                    .from('chat_messages')
                    .select('id, sender_id, receiver_id, message, created_at')
                    .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
                    .order('created_at', { ascending: false }),
            ]);

            if (contactsResult.error) throw contactsResult.error;
            if (unreadResult.error) throw unreadResult.error;
            if (messagesResult.error) throw messagesResult.error;

            const contacts = contactsResult.data || [];
            const unreadBySender = buildUnreadMap(unreadResult.data || []);
            const lastByContact = buildLastMessageMap(messagesResult.data || []);

            unreadMessages = unreadBySender;
            updateUnreadBadge();

            elements.contactsList.innerHTML = '';

            if (!contacts.length) {
                elements.contactsList.innerHTML = '<div class="no-contacts">Nenhum contato disponivel</div>';
                return;
            }

            contacts.sort((a, b) => {
                const aLast = lastByContact.get(a.id);
                const bLast = lastByContact.get(b.id);
                const aTime = aLast?.created_at ? new Date(aLast.created_at).getTime() : 0;
                const bTime = bLast?.created_at ? new Date(bLast.created_at).getTime() : 0;
                if (aTime !== bTime) return bTime - aTime;
                const aName = String(a.full_name || a.email || '');
                const bName = String(b.full_name || b.email || '');
                return aName.localeCompare(bName, 'pt-BR');
            });

            const onlineCount = contacts.filter((contact) => contact.status === 'active').length;
            if (elements.onlineCount) {
                elements.onlineCount.textContent = `${onlineCount} online`;
            }

            contacts.forEach((contact) => {
                const contactElement = document.createElement('div');
                const statusClass = getSafeStatusClass(contact.status);
                contactElement.className = `contact-item ${statusClass}`;
                contactElement.dataset.userId = contact.id;

                const avatarText = contact.full_name
                    ? contact.full_name.charAt(0).toUpperCase()
                    : contact.email.charAt(0).toUpperCase();

                const unreadCount = unreadMessages.get(contact.id) || 0;

                contactElement.innerHTML = `
                    <div class="contact-avatar">${escapeHtml(avatarText)}</div>
                    <div class="contact-info">
                        <div class="contact-name">${escapeHtml(contact.full_name || contact.email)}</div>
                        <div class="contact-status">${statusClass === 'active' ? 'Online' : 'Offline'}</div>
                    </div>
                    ${unreadCount > 0 ? `<div class="unread-count">${unreadCount}</div>` : ''}
                `;

                contactElement.addEventListener('click', () => openChat(contact));
                elements.contactsList.appendChild(contactElement);
            });
        } catch (error) {
            console.error('Erro ao carregar contatos:', error);
            if (elements.contactsList) {
                elements.contactsList.innerHTML = '<div class="error-contacts">Erro ao carregar contatos</div>';
            }
        }
    };
    const openChat = async (contact) => {
        if (!currentUser) {
            console.error('UsuÃ¡rio nÃ£o autenticado, nÃ£o Ã© possÃ­vel abrir chat');
            return;
        }
        
        currentReceiver = contact;
        hideEmojiPicker();
        clearSelectedAttachment();
        
        // Atualizar header do chat
        if (elements.currentChatName && elements.currentChatStatus && elements.currentChatAvatar) {
            elements.currentChatName.textContent = contact.full_name || contact.email;
            elements.currentChatStatus.textContent = contact.status === 'active' ? 'Online' : 'Offline';
            elements.currentChatAvatar.textContent = contact.full_name 
                ? contact.full_name.charAt(0).toUpperCase() 
                : contact.email.charAt(0).toUpperCase();
        }
        
        // Mostrar Ã¡rea de mensagens
        if (document.querySelector('.chat-contacts')) {
            document.querySelector('.chat-contacts').style.display = 'none';
        }
        if (document.querySelector('.chat-messages-container')) {
            document.querySelector('.chat-messages-container').style.display = 'flex';
        }
        
        // Carregar mensagens
        await loadMessages(contact.id, { silent: false, forceRender: true, autoScroll: true });
        
        // Limpar contador de nÃ£o lidas
        unreadMessages.set(contact.id, 0);
        updateUnreadBadge();
        
        // Focar no input de mensagem
        if (elements.messageInput) {
            elements.messageInput.focus();
        }

        startConversationPolling();
    };

    const loadMessages = async (contactId, options = {}) => {
        const { silent = false, forceRender = false, autoScroll = false } = options;
        try {
            if (!elements.chatMessages || !currentUser) return;

            if (!silent) {
                elements.chatMessages.innerHTML = '<div class="loading-messages">Carregando mensagens...</div>';
            }
            
            const { data: messages, error } = await window.supabaseClient
                .from('chat_messages')
                .select('*')
                .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${currentUser.id})`)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            
            const safeMessages = messages || [];
            const last = safeMessages.length > 0 ? safeMessages[safeMessages.length - 1] : null;
            const snapshot = `${safeMessages.length}:${last ? last.id : 'none'}:${last ? last.created_at : 'none'}`;
            const previousSnapshot = lastMessagesSnapshot.get(contactId);

            if (forceRender || snapshot !== previousSnapshot) {
                renderMessages(safeMessages);
                lastMessagesSnapshot.set(contactId, snapshot);
            }
            
            // Marcar mensagens como lidas
            await markMessagesAsRead(contactId);
            
            if (autoScroll) {
                scrollToBottom();
            }
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
            if (!silent && elements.chatMessages) {
                elements.chatMessages.innerHTML = '<div class="error-messages">Erro ao carregar mensagens</div>';
            }
        }
    };

    const renderMessages = (messages) => {
        if (!elements.chatMessages) return;
        
        elements.chatMessages.innerHTML = '';
        
        if (!messages || messages.length === 0) {
            elements.chatMessages.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-comments"></i>
                    <div>Nenhuma mensagem ainda. Inicie a conversa!</div>
                </div>
            `;
            return;
        }
        
        messages.forEach(message => {
            const messageElement = document.createElement('div');
            const isCurrentUser = message.sender_id === currentUser.id;
            const hasAttachment = Boolean(message.attachment_path);
            const isEdited = Boolean(message.edited_at);
            const canEditTextMessage = isCurrentUser && !hasAttachment;
            const isEditingThisMessage = editingMessageId === message.id;
            const safeAttachmentName = escapeHtml(message.attachment_name || 'Anexo');
            const safeAttachmentType = escapeHtml(message.attachment_type || '');
            const attachmentMeta = message.attachment_size
                ? `<div class="attachment-size">${formatFileSize(Number(message.attachment_size))}</div>`
                : '';
            const attachmentUrl = hasAttachment
                ? `${window.location.origin}/api/chat/attachment/${encodeURIComponent(message.id)}`
                : '';
            
            messageElement.className = `message ${isCurrentUser ? 'sent' : 'received'}${isEditingThisMessage ? ' message-editing' : ''}`;
            messageElement.dataset.messageId = String(message.id);
            messageElement.innerHTML = `
                <div class="message-content">${escapeHtml(message.message)}</div>
                ${hasAttachment ? `
                <a class="message-attachment" href="${attachmentUrl}" target="_blank" rel="noopener noreferrer">
                    <i class="fas fa-paperclip"></i>
                    <div class="attachment-text">
                        <div class="attachment-name">${safeAttachmentName}</div>
                        <div class="attachment-type">${safeAttachmentType}</div>
                        ${attachmentMeta}
                    </div>
                </a>` : ''}
                <div class="message-footer">
                    <div class="message-time">${formatTime(message.created_at)}${isEdited ? ' (editada)' : ''}</div>
                    ${canEditTextMessage ? `<button class="message-edit-btn" data-message-id="${message.id}" title="Editar mensagem"><i class="fas fa-pen"></i></button>` : ''}
                </div>
            `;

            if (canEditTextMessage) {
                const editBtn = messageElement.querySelector('.message-edit-btn');
                if (editBtn) {
                    editBtn.addEventListener('click', (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        editMessage(message, messageElement);
                    });
                }
            }
            
            elements.chatMessages.appendChild(messageElement);
        });
    };

    const editMessage = async (message, messageElement) => {
        if (!message || !message.id || !currentUser || !messageElement) return;
        if (message.attachment_path) return;

        if (editingMessageId && editingMessageId !== message.id) {
            if (window.UtilsModule && window.UtilsModule.showNotification) {
                window.UtilsModule.showNotification('Finalize ou cancele a edicao atual antes de editar outra mensagem.', 'warning');
            }
            return;
        }

        const contentElement = messageElement.querySelector('.message-content');
        const footerElement = messageElement.querySelector('.message-footer');
        if (!contentElement || !footerElement) return;

        const originalText = String(message.message || '');
        editingMessageId = message.id;
        messageElement.classList.add('message-editing');

        contentElement.innerHTML = `
            <input class="message-edit-input" type="text" maxlength="5000" value="${escapeHtml(originalText)}">
        `;

        footerElement.innerHTML = `
            <button type="button" class="message-inline-btn message-inline-cancel">Cancelar</button>
            <button type="button" class="message-inline-btn message-inline-save">Salvar</button>
        `;

        const editInput = contentElement.querySelector('.message-edit-input');
        const cancelBtn = footerElement.querySelector('.message-inline-cancel');
        const saveBtn = footerElement.querySelector('.message-inline-save');
        if (!editInput || !cancelBtn || !saveBtn) return;

        editInput.focus();
        editInput.setSelectionRange(editInput.value.length, editInput.value.length);

        const cancelEdit = async () => {
            editingMessageId = null;
            await loadMessages(currentReceiver.id, { silent: true, forceRender: true });
        };

        const saveEdit = async () => {
            const nextText = editInput.value.trim();
            if (!nextText) {
                if (window.UtilsModule && window.UtilsModule.showNotification) {
                    window.UtilsModule.showNotification('A mensagem nao pode ficar vazia.', 'warning');
                }
                return;
            }

            if (nextText === originalText.trim()) {
                await cancelEdit();
                return;
            }

            try {
                saveBtn.disabled = true;
                cancelBtn.disabled = true;

                const { error } = await window.supabaseClient
                    .from('chat_messages')
                    .update({
                        message: nextText,
                        edited_at: new Date().toISOString(),
                    })
                    .eq('id', message.id)
                    .eq('sender_id', currentUser.id);

                if (error) throw error;

                editingMessageId = null;
                await loadMessages(currentReceiver.id, { silent: true, forceRender: true });
            } catch (error) {
                console.error('Erro ao editar mensagem:', error);
                saveBtn.disabled = false;
                cancelBtn.disabled = false;
                if (window.UtilsModule && window.UtilsModule.showNotification) {
                    window.UtilsModule.showNotification(`Erro ao editar mensagem: ${error.message}`, 'error');
                }
            }
        };

        cancelBtn.addEventListener('click', cancelEdit);
        saveBtn.addEventListener('click', saveEdit);
        editInput.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                cancelEdit();
                return;
            }
            if (event.key === 'Enter') {
                event.preventDefault();
                saveEdit();
            }
        });
    };

    const sendMessage = async () => {
        if (!elements.messageInput || !currentReceiver || !currentUser) return;
        if (isSendingAttachment) return;
        hideEmojiPicker();
        
        const messageText = elements.messageInput.value.trim();
        if (!messageText && !selectedAttachment) return;

        if (selectedAttachment) {
            await sendAttachment(selectedAttachment, messageText);
            return;
        }
        
        try {
            // Desabilitar botÃ£o durante o envio
            if (elements.sendButton) {
                elements.sendButton.disabled = true;
            }
            
            const { error } = await window.supabaseClient
                .from('chat_messages')
                .insert([
                    {
                        sender_id: currentUser.id,
                        receiver_id: currentReceiver.id,
                        message: messageText
                    }
                ]);
            
            if (error) throw error;
            
            // Limpar input
            elements.messageInput.value = '';
            if (elements.sendButton) {
                elements.sendButton.disabled = true;
            }
            
            // Recarregar silenciosamente para mostrar a nova sem piscar
            await loadMessages(currentReceiver.id, { silent: true, forceRender: true, autoScroll: true });
            
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            if (window.UtilsModule && window.UtilsModule.showNotification) {
                window.UtilsModule.showNotification('Erro ao enviar mensagem', 'error');
            } else {
                alert('Erro ao enviar mensagem: ' + error.message);
            }
        } finally {
            updateSendButtonState();
        }
    };

    const setupRealtimeSubscription = () => {
        if (!currentUser) {
            console.warn('NÃ£o Ã© possÃ­vel configurar subscription: usuÃ¡rio nÃ£o autenticado');
            return;
        }
        
        if (chatSocket) {
            window.supabaseClient.removeChannel(chatSocket);
        }
        
        chatSocket = window.supabaseClient
            .channel('chat-messages')
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'chat_messages',
                    filter: `receiver_id=eq.${currentUser.id}`
                }, 
                (payload) => {
                    handleNewMessage(payload.new);
                }
            )
            .subscribe((status) => {
                console.log('Status da subscription do chat:', status);
            });
    };

    const handleNewMessage = async (message) => {
        // Se estivermos no chat com o remetente, adicionar a mensagem
        if (currentReceiver && currentReceiver.id === message.sender_id) {
            const messageElement = document.createElement('div');
            messageElement.className = 'message received new-message';
            messageElement.innerHTML = `
                <div class="message-content">${escapeHtml(message.message)}</div>
                <div class="message-time">${formatTime(message.created_at)}</div>
            `;
            
            if (elements.chatMessages) {
                elements.chatMessages.appendChild(messageElement);
                scrollToBottom();
            }
            
            // Marcar como lida
            await markMessageAsRead(message.id);
            flashChatContainer();
        } else {
            // Mostrar notificaÃ§Ã£o
            const senderName = await getSenderName(message.sender_id);
            if (window.UtilsModule && window.UtilsModule.showNotification) {
                window.UtilsModule.showNotification(`Nova mensagem de ${senderName}: ${message.message.substring(0, 50)}${message.message.length > 50 ? '...' : ''}`, 'info');
            }
            
            // Atualizar contador de nÃ£o lidas
            showInChatNewMessageToast(senderName, message.message);
            updateUnreadCount(message.sender_id);
        }
    };

    const getSenderName = async (senderId) => {
        try {
            const { data, error } = await window.supabaseClient
                .from('user_profiles')
                .select('full_name, email')
                .eq('id', senderId)
                .single();
            
            if (error) throw error;
            
            return data.full_name || data.email;
        } catch (error) {
            console.error('Erro ao obter nome do remetente:', error);
            return 'AlguÃ©m';
        }
    };

    const updateUnreadCount = (senderId) => {
        const currentCount = unreadMessages.get(senderId) || 0;
        unreadMessages.set(senderId, currentCount + 1);
        updateUnreadBadge();
        
        // Atualizar na lista de contatos se visÃ­vel
        if (elements.contactsList) {
            const contactElement = elements.contactsList.querySelector(`[data-user-id="${senderId}"]`);
            if (contactElement) {
                let unreadElement = contactElement.querySelector('.unread-count');
                if (!unreadElement) {
                    unreadElement = document.createElement('div');
                    unreadElement.className = 'unread-count';
                    contactElement.appendChild(unreadElement);
                }
                unreadElement.textContent = currentCount + 1;
                unreadElement.style.display = 'flex';
                unreadElement.classList.remove('new-unread');
                void unreadElement.offsetWidth;
                unreadElement.classList.add('new-unread');
                contactElement.classList.remove('contact-new-message');
                void contactElement.offsetWidth;
                contactElement.classList.add('contact-new-message');
                setTimeout(() => {
                    contactElement.classList.remove('contact-new-message');
                }, 1600);
            }
        }
        flashChatContainer();
    };

    const updateUnreadBadge = () => {
        const totalUnread = Array.from(unreadMessages.values()).reduce((sum, count) => sum + count, 0);

        window.dispatchEvent(new CustomEvent('pharus:chat-unread-updated', {
            detail: { totalUnread }
        }));

        if (!elements.unreadBadge) return;
        
        if (totalUnread > 0) {
            elements.unreadBadge.textContent = totalUnread > 99 ? '99+' : totalUnread;
            elements.unreadBadge.style.display = 'flex';
            elements.unreadBadge.classList.remove('new-unread');
            void elements.unreadBadge.offsetWidth;
            elements.unreadBadge.classList.add('new-unread');
            
            // Adicionar animaÃ§Ã£o de pulsaÃ§Ã£o
            if (elements.chatToggle) {
                elements.chatToggle.classList.add('pulse');
                setTimeout(() => {
                    elements.chatToggle.classList.remove('pulse');
                }, 1000);
            }
        } else {
            elements.unreadBadge.style.display = 'none';
        }
    };

    const flashChatContainer = () => {
        if (!elements.chatContainer) return;
        elements.chatContainer.classList.remove('chat-has-new-message');
        void elements.chatContainer.offsetWidth;
        elements.chatContainer.classList.add('chat-has-new-message');
        setTimeout(() => {
            if (elements.chatContainer) {
                elements.chatContainer.classList.remove('chat-has-new-message');
            }
        }, 900);
    };

    const showInChatNewMessageToast = (senderName, messageText) => {
        if (!elements.chatContainer) return;

        let toast = document.getElementById('chatNewMessageToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'chatNewMessageToast';
            toast.className = 'chat-new-message-toast';
            elements.chatContainer.appendChild(toast);
        }

        const safeName = escapeHtml(senderName || 'Contato');
        const safePreview = escapeHtml(String(messageText || '').trim() || 'Nova mensagem');
        const previewText = safePreview.length > 72 ? `${safePreview.slice(0, 72)}...` : safePreview;
        toast.innerHTML = `<strong>${safeName}</strong>: ${previewText}`;
        toast.classList.remove('visible');
        void toast.offsetWidth;
        toast.classList.add('visible');

        if (newMessageToastTimer) {
            clearTimeout(newMessageToastTimer);
        }
        newMessageToastTimer = setTimeout(() => {
            toast.classList.remove('visible');
        }, 2600);
    };

    const markMessagesAsRead = async (contactId) => {
        try {
            const { error } = await window.supabaseClient
                .from('chat_messages')
                .update({ is_read: true })
                .eq('sender_id', contactId)
                .eq('receiver_id', currentUser.id)
                .eq('is_read', false);
            
            if (error) throw error;
            
            // Atualizar contador de nÃ£o lidas
            unreadMessages.set(contactId, 0);
            updateUnreadBadge();
            
            // Atualizar na lista de contatos
            if (elements.contactsList) {
                const contactElement = elements.contactsList.querySelector(`[data-user-id="${contactId}"]`);
                if (contactElement) {
                    const unreadElement = contactElement.querySelector('.unread-count');
                    if (unreadElement) {
                        unreadElement.style.display = 'none';
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao marcar mensagens como lidas:', error);
        }
    };

    const markMessageAsRead = async (messageId) => {
        try {
            const { error } = await window.supabaseClient
                .from('chat_messages')
                .update({ is_read: true })
                .eq('id', messageId);
            
            if (error) throw error;
        } catch (error) {
            console.error('Erro ao marcar mensagem como lida:', error);
        }
    };

    const scrollToBottom = () => {
        if (elements.chatMessages) {
            elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
        }
    };

    const handleAttachmentButtonClick = () => {
        if (!elements.chatAttachmentInput) return;
        elements.chatAttachmentInput.click();
    };

    const buildEmojiPicker = () => {
        if (!elements.emojiPicker) return;
        elements.emojiPicker.innerHTML = '';

        EMOJI_OPTIONS.forEach((emoji) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'emoji-option';
            button.textContent = emoji;
            button.title = `Inserir ${emoji}`;
            button.addEventListener('click', () => {
                appendEmojiToMessage(emoji);
                hideEmojiPicker();
            });
            elements.emojiPicker.appendChild(button);
        });
    };

    const toggleEmojiPicker = (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (!elements.emojiPicker) return;
        const shouldShow = elements.emojiPicker.classList.contains('hidden');
        elements.emojiPicker.classList.toggle('hidden', !shouldShow);
        elements.emojiPicker.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
    };

    const hideEmojiPicker = () => {
        if (!elements.emojiPicker) return;
        elements.emojiPicker.classList.add('hidden');
        elements.emojiPicker.setAttribute('aria-hidden', 'true');
    };

    const handleDocumentClickForEmojiPicker = (event) => {
        if (!elements.emojiPicker || !elements.emojiBtn) return;
        const target = event.target;
        if (!target) return;
        if (elements.emojiPicker.contains(target) || elements.emojiBtn.contains(target)) return;
        hideEmojiPicker();
    };

    const appendEmojiToMessage = (emoji) => {
        if (!elements.messageInput) return;

        const input = elements.messageInput;
        const start = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
        const end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : input.value.length;
        const prefix = input.value.slice(0, start);
        const suffix = input.value.slice(end);
        input.value = `${prefix}${emoji}${suffix}`;
        const nextCursor = start + emoji.length;
        input.focus();
        input.setSelectionRange(nextCursor, nextCursor);
        updateSendButtonState();
    };

    const handleAttachmentSelected = (event) => {
        const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
        if (!file) return;

        const extension = getFileExtension(file.name);
        if (!isAllowedAttachmentExtension(extension)) {
            const allowedList = '.pdf, .jpg, .jpeg, .png, .webp, .txt, .zip, .patch, .diff, .doc, .docx, .xls, .xlsx, .log, .json, .csv, .xml, .sql, .ps1, .sh, .md';
            if (window.UtilsModule && window.UtilsModule.showNotification) {
                window.UtilsModule.showNotification(`Tipo de arquivo nÃ£o permitido (${extension || 'sem extensÃ£o'}). Permitidos: ${allowedList}`, 'error');
            }
            event.target.value = '';
            return;
        }

        const maxBytes = 10 * 1024 * 1024;
        if (file.size > maxBytes) {
            if (window.UtilsModule && window.UtilsModule.showNotification) {
                window.UtilsModule.showNotification('Arquivo excede o limite de 10 MB.', 'error');
            }
            event.target.value = '';
            return;
        }

        selectedAttachment = file;
        renderSelectedAttachmentInfo();
        updateSendButtonState();
        if (window.UtilsModule && window.UtilsModule.showNotification) {
            window.UtilsModule.showNotification(`Anexo selecionado: ${file.name}`, 'info');
        }
    };

    const getFileExtension = (fileName) => {
        const name = String(fileName || '').toLowerCase();
        const index = name.lastIndexOf('.');
        if (index < 0) return '';
        return name.slice(index);
    };

    const isAllowedAttachmentExtension = (extension) => {
        const allowed = new Set([
            '.jpg', '.jpeg', '.png', '.webp', '.pdf', '.txt', '.zip',
            '.patch', '.diff', '.doc', '.docx', '.xls', '.xlsx',
            '.log', '.json', '.csv', '.xml', '.sql', '.ps1', '.sh', '.md',
        ]);
        return allowed.has(String(extension || '').toLowerCase());
    };

    const renderSelectedAttachmentInfo = (uploadPercent = null, uploadStatus = '') => {
        if (!elements.selectedAttachmentInfo) return;

        if (!selectedAttachment) {
            elements.selectedAttachmentInfo.style.display = 'none';
            elements.selectedAttachmentInfo.innerHTML = '';
            return;
        }

        elements.selectedAttachmentInfo.style.display = 'flex';
        elements.selectedAttachmentInfo.innerHTML = `
            <div style="display:grid;gap:4px;min-width:0;flex:1;">
                <span><i class="fas fa-paperclip"></i> ${escapeHtml(selectedAttachment.name)} (${formatFileSize(selectedAttachment.size)})</span>
                ${uploadStatus ? `<div class="attachment-upload-status">${escapeHtml(uploadStatus)}</div>` : ''}
                ${(uploadPercent !== null && isSendingAttachment) ? `
                    <div class="attachment-upload-track">
                        <div class="attachment-upload-fill" style="width:${Math.max(0, Math.min(uploadPercent, 100))}%;"></div>
                    </div>
                ` : ''}
            </div>
            <button class="selected-attachment-remove" id="removeSelectedAttachmentBtn" title="Remover anexo" ${isSendingAttachment ? 'disabled' : ''}>
                <i class="fas fa-times"></i>
            </button>
        `;

        const removeBtn = document.getElementById('removeSelectedAttachmentBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', clearSelectedAttachment);
        }
    };

    const clearSelectedAttachment = () => {
        if (isSendingAttachment) return;
        selectedAttachment = null;
        if (elements.chatAttachmentInput) {
            elements.chatAttachmentInput.value = '';
        }
        renderSelectedAttachmentInfo();
        updateSendButtonState();
    };

    const inferMimeTypeFromName = (fileName) => {
        const name = String(fileName || '').toLowerCase();
        if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
        if (name.endsWith('.png')) return 'image/png';
        if (name.endsWith('.webp')) return 'image/webp';
        if (name.endsWith('.pdf')) return 'application/pdf';
        if (name.endsWith('.txt')) return 'text/plain';
        if (name.endsWith('.patch')) return 'text/x-patch';
        if (name.endsWith('.diff')) return 'text/x-diff';
        if (name.endsWith('.zip')) return 'application/zip';
        if (name.endsWith('.log')) return 'text/plain';
        if (name.endsWith('.json')) return 'application/json';
        if (name.endsWith('.csv')) return 'text/csv';
        if (name.endsWith('.xml')) return 'application/xml';
        if (name.endsWith('.sql')) return 'application/sql';
        if (name.endsWith('.ps1')) return 'application/x-powershell';
        if (name.endsWith('.sh')) return 'text/x-shellscript';
        if (name.endsWith('.md')) return 'text/markdown';
        if (name.endsWith('.doc')) return 'application/msword';
        if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (name.endsWith('.xls')) return 'application/vnd.ms-excel';
        if (name.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        return 'application/octet-stream';
    };

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = String(reader.result || '');
                const base64Data = result.includes(',') ? result.split(',')[1] : result;
                resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const uploadAttachmentWithProgress = (file, mimeType) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                const result = String(reader.result || '');
                const base64Data = result.includes(',') ? result.split(',')[1] : result;

                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/chat/upload', true);
                xhr.setRequestHeader('Content-Type', 'application/json');

                xhr.upload.onprogress = (event) => {
                    if (!event.lengthComputable) return;
                    const percent = Math.round((event.loaded / event.total) * 100);
                    renderSelectedAttachmentInfo(percent, `Enviando anexo... ${percent}%`);
                };

                xhr.onload = () => {
                    try {
                        const payload = JSON.parse(xhr.responseText || '{}');
                        if (xhr.status >= 200 && xhr.status < 300 && !payload.error) {
                            resolve(payload.data || {});
                            return;
                        }
                        reject(new Error(payload?.error?.message || `Falha no upload (${xhr.status})`));
                    } catch (_parseError) {
                        reject(new Error('Resposta invalida do upload'));
                    }
                };

                xhr.onerror = () => reject(new Error('Falha de rede no upload do anexo'));

                xhr.send(JSON.stringify({
                    fileName: file.name,
                    mimeType,
                    base64Data,
                }));
            };

            reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
            reader.readAsDataURL(file);
        });
    };

    const sendAttachment = async (file, messageText) => {
        let sendButtonOriginalHtml = '';
        try {
            isSendingAttachment = true;
            updateSendButtonState();
            renderSelectedAttachmentInfo(0, 'Preparando upload...');
            if (elements.sendButton) {
                sendButtonOriginalHtml = elements.sendButton.innerHTML;
                elements.sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }

            const resolvedMimeType = (file.type && file.type.trim())
                ? file.type
                : inferMimeTypeFromName(file.name);
            const attachment = await uploadAttachmentWithProgress(file, resolvedMimeType);
            renderSelectedAttachmentInfo(100, 'Upload concluido. Enviando mensagem...');
            const fallbackMessage = messageText || `[Anexo] ${file.name}`;

            const { error } = await window.supabaseClient
                .from('chat_messages')
                .insert([
                    {
                        sender_id: currentUser.id,
                        receiver_id: currentReceiver.id,
                        message: fallbackMessage,
                        attachment_name: attachment.attachment_name || file.name,
                        attachment_path: attachment.attachment_path || null,
                        attachment_type: attachment.attachment_type || resolvedMimeType || null,
                        attachment_size: attachment.attachment_size || file.size || null,
                    }
                ]);

            if (error) throw error;

            clearSelectedAttachment();

            if (elements.messageInput) {
                elements.messageInput.value = '';
            }

            await loadMessages(currentReceiver.id, { silent: true, forceRender: true, autoScroll: true });
        } catch (error) {
            console.error('Erro ao enviar anexo:', error);
            const isSchemaIssue = /attachment_(name|path|type|size)/i.test(String(error.message || ''));
            if (window.UtilsModule && window.UtilsModule.showNotification) {
                window.UtilsModule.showNotification(
                    isSchemaIssue
                        ? 'Erro ao enviar anexo: atualize o banco com as colunas de anexo em chat_messages.'
                        : `Erro ao enviar anexo: ${error.message}`,
                    'error'
                );
            }
            renderSelectedAttachmentInfo(null, 'Falha no envio do anexo.');
        } finally {
            isSendingAttachment = false;
            if (elements.sendButton) {
                elements.sendButton.innerHTML = sendButtonOriginalHtml || '<i class="fas fa-paper-plane"></i>';
            }
            updateSendButtonState();
            if (selectedAttachment) renderSelectedAttachmentInfo();
        }
    };

    const isChatOpen = () => {
        return !!(elements.chatContainer && elements.chatContainer.classList.contains('chat-open'));
    };

    const startConversationPolling = () => {
        stopConversationPolling();

        conversationRefreshInterval = setInterval(async () => {
            if (!isChatOpen() || !currentReceiver || !currentUser) return;
            await loadMessages(currentReceiver.id, { silent: true });
        }, 2500);
    };

    const stopConversationPolling = () => {
        if (conversationRefreshInterval) {
            clearInterval(conversationRefreshInterval);
            conversationRefreshInterval = null;
        }
    };

    const startContactsPolling = () => {
        stopContactsPolling();

        contactsRefreshInterval = setInterval(async () => {
            if (!isChatOpen()) return;
            await loadContacts();
        }, 12000);
    };

    const stopContactsPolling = () => {
        if (contactsRefreshInterval) {
            clearInterval(contactsRefreshInterval);
            contactsRefreshInterval = null;
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatFileSize = (bytes) => {
        if (!Number.isFinite(bytes) || bytes <= 0) return '-';
        const units = ['B', 'KB', 'MB', 'GB'];
        let value = bytes;
        let unitIndex = 0;
        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex += 1;
        }
        return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
    };

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const getSafeStatusClass = (status) => {
        const allowed = new Set(['active', 'inactive', 'pending']);
        return allowed.has(status) ? status : 'inactive';
    };

    return {
        initChatModule,
        toggleChat,
        openChatWithUser: (userId, userName, userEmail) => {
            const contact = {
                id: userId,
                full_name: userName,
                email: userEmail,
                status: 'active'
            };
            openChat(contact);
        }
    };
})();

// Inicializar o chat quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Aguardar o auth estar pronto
    const checkAuth = setInterval(() => {
        if (window.supabaseClient) {
            clearInterval(checkAuth);
            // Verificar se hÃ¡ um usuÃ¡rio autenticado
            window.supabaseClient.auth.getUser()
                .then(({ data: { user } }) => {
                    if (user) {
                        ChatModule.initChatModule();
                    }
                })
                .catch(error => {
                    console.error('Erro ao verificar autenticaÃ§Ã£o:', error);
                });
        }
    }, 100);
});


