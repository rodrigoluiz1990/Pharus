// scripts/chat.js
const ChatModule = (() => {
    let currentReceiver = null;
    let chatSocket = null;
    let currentUser = null;
    let unreadMessages = new Map();

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
        currentChatAvatar: null
    };

    const initChatModule = async () => {
        try {
            await createChatInterface();
            await loadCurrentUser();
            setupEventListeners();
            setupRealtimeSubscription();
            loadContacts();
            updateUnreadBadge();
            
            console.log('Módulo de chat inicializado com sucesso');
        } catch (error) {
            console.error('Erro ao inicializar módulo de chat:', error);
        }
    };

    const createChatInterface = async () => {
        // Carregar o template do chat
        try {
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
            
            // Aplicar estilos se não estiverem carregados
            if (!document.querySelector('link[href="styles/chat.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'styles/chat.css';
                document.head.appendChild(link);
            }
        } catch (error) {
            console.error('Erro ao carregar interface do chat:', error);
            // Criar interface básica se o arquivo não existir
            createFallbackInterface();
        }
    };

    const createFallbackInterface = () => {
        // Implementação de fallback caso o chat.html não exista
        const chatHTML = `
            <div id="chatContainer" class="chat-hidden">
                <div class="chat-header">
                    <h3>Chat</h3>
                    <button id="closeChat" class="close-chat"><i class="fas fa-times"></i></button>
                </div>
                <div class="chat-contacts">
                    <div id="contactsList"></div>
                </div>
                <div class="chat-messages-container">
                    <div id="chatHeader" class="chat-conversation-header">
                        <button id="backToContacts" class="back-button"><i class="fas fa-arrow-left"></i></button>
                        <div id="currentChatInfo"></div>
                    </div>
                    <div id="chatMessages" class="chat-messages"></div>
                    <div class="chat-input-container">
                        <input type="text" id="messageInput" placeholder="Digite uma mensagem...">
                        <button id="sendMessage" class="send-button"><i class="fas fa-paper-plane"></i></button>
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
    };

    const loadCurrentUser = async () => {
        try {
            // Verificar se o Supabase Client está disponível
            if (!window.supabaseClient) {
                console.warn('Supabase Client não disponível');
                throw new Error('Supabase Client não está disponível');
            }
            
            // Verificar se o método auth.getUser existe
            if (!window.supabaseClient.auth || typeof window.supabaseClient.auth.getUser !== 'function') {
                console.warn('Método auth.getUser não disponível');
                throw new Error('Autenticação não disponível');
            }
            
            const { data, error } = await window.supabaseClient.auth.getUser();
            
            if (error) {
                console.error('Erro ao obter usuário:', error);
                throw error;
            }
            
            if (!data || !data.user) {
                console.warn('Nenhum usuário autenticado encontrado');
                throw new Error('Usuário não autenticado');
            }
            
            currentUser = data.user;
            console.log('Usuário carregado:', currentUser.id);
            
        } catch (error) {
            console.error('Erro ao carregar usuário atual:', error);
            // Tentar obter o usuário da sessão como fallback
            await tryGetUserFromSession();
        }
    };

    const tryGetUserFromSession = async () => {
        try {
            if (window.supabaseClient && window.supabaseClient.auth.getSession) {
                const { data: sessionData } = await window.supabaseClient.auth.getSession();
                if (sessionData && sessionData.session && sessionData.session.user) {
                    currentUser = sessionData.session.user;
                    console.log('Usuário obtido da sessão:', currentUser.id);
                }
            }
        } catch (sessionError) {
            console.error('Erro ao obter usuário da sessão:', sessionError);
        }
    };

    const setupEventListeners = () => {
        if (elements.chatToggle) {
            elements.chatToggle.addEventListener('click', toggleChat);
        }
        
        if (elements.closeChat) {
            elements.closeChat.addEventListener('click', closeChat);
        }
        
        if (elements.sendButton) {
            elements.sendButton.addEventListener('click', sendMessage);
        }
        
        if (elements.messageInput) {
            elements.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendMessage();
            });
            
            elements.messageInput.addEventListener('input', () => {
                if (elements.sendButton) {
                    elements.sendButton.disabled = !elements.messageInput.value.trim();
                }
            });
        }
        
        if (elements.backToContacts) {
            elements.backToContacts.addEventListener('click', showContacts);
        }
        
        if (elements.chatSearch) {
            elements.chatSearch.addEventListener('input', filterContacts);
        }
    };

    const toggleChat = () => {
        if (!elements.chatContainer) return;
        
        // Se o usuário não estiver carregado, tentar carregar novamente
        if (!currentUser) {
            loadCurrentUser().then(() => {
                if (currentUser) {
                    elements.chatContainer.classList.toggle('chat-open');
                    if (elements.chatContainer.classList.contains('chat-open')) {
                        loadContacts();
                    }
                } else {
                    console.error('Não foi possível carregar o usuário para o chat');
                    UtilsModule.showNotification('Erro ao abrir o chat. Faça login novamente.', 'error');
                }
            });
            return;
        }
        
        elements.chatContainer.classList.toggle('chat-open');
        if (elements.chatContainer.classList.contains('chat-open')) {
            loadContacts();
        }
    };

    const closeChat = () => {
        if (elements.chatContainer) {
            elements.chatContainer.classList.remove('chat-open');
        }
    };

    const showContacts = () => {
        if (document.querySelector('.chat-contacts')) {
            document.querySelector('.chat-contacts').style.display = 'flex';
        }
        if (document.querySelector('.chat-messages-container')) {
            document.querySelector('.chat-messages-container').style.display = 'none';
        }
        currentReceiver = null;
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

    const loadContacts = async () => {
        try {
            if (!elements.contactsList || !currentUser) return;
            
            elements.contactsList.innerHTML = '<div class="loading-contacts">Carregando contatos...</div>';
            
            const { data: contacts, error } = await window.supabaseClient
                .from('user_profiles')
                .select('id, full_name, email, status, last_sign_in_at')
                .neq('id', currentUser.id)
                .order('full_name');
            
            if (error) throw error;
            
            elements.contactsList.innerHTML = '';
            
            if (!contacts || contacts.length === 0) {
                elements.contactsList.innerHTML = '<div class="no-contacts">Nenhum contato disponível</div>';
                return;
            }
            
            // Atualizar contador online
            const onlineCount = contacts.filter(c => c.status === 'active').length;
            if (elements.onlineCount) {
                elements.onlineCount.textContent = `${onlineCount} online`;
            }
            
            contacts.forEach(contact => {
                const contactElement = document.createElement('div');
                contactElement.className = `contact-item ${contact.status}`;
                contactElement.dataset.userId = contact.id;
                
                const avatarText = contact.full_name 
                    ? contact.full_name.charAt(0).toUpperCase() 
                    : contact.email.charAt(0).toUpperCase();
                
                const unreadCount = unreadMessages.get(contact.id) || 0;
                
                contactElement.innerHTML = `
                    <div class="contact-avatar">${avatarText}</div>
                    <div class="contact-info">
                        <div class="contact-name">${escapeHtml(contact.full_name || contact.email)}</div>
                        <div class="contact-status">${contact.status === 'active' ? 'Online' : 'Offline'}</div>
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
            console.error('Usuário não autenticado, não é possível abrir chat');
            return;
        }
        
        currentReceiver = contact;
        
        // Atualizar header do chat
        if (elements.currentChatName && elements.currentChatStatus && elements.currentChatAvatar) {
            elements.currentChatName.textContent = contact.full_name || contact.email;
            elements.currentChatStatus.textContent = contact.status === 'active' ? 'Online' : 'Offline';
            elements.currentChatAvatar.textContent = contact.full_name 
                ? contact.full_name.charAt(0).toUpperCase() 
                : contact.email.charAt(0).toUpperCase();
        }
        
        // Mostrar área de mensagens
        if (document.querySelector('.chat-contacts')) {
            document.querySelector('.chat-contacts').style.display = 'none';
        }
        if (document.querySelector('.chat-messages-container')) {
            document.querySelector('.chat-messages-container').style.display = 'flex';
        }
        
        // Carregar mensagens
        await loadMessages(contact.id);
        
        // Limpar contador de não lidas
        unreadMessages.set(contact.id, 0);
        updateUnreadBadge();
        
        // Focar no input de mensagem
        if (elements.messageInput) {
            elements.messageInput.focus();
        }
    };

    const loadMessages = async (contactId) => {
        try {
            if (!elements.chatMessages || !currentUser) return;
            
            elements.chatMessages.innerHTML = '<div class="loading-messages">Carregando mensagens...</div>';
            
            const { data: messages, error } = await window.supabaseClient
                .from('chat_messages')
                .select('*')
                .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${currentUser.id})`)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            
            renderMessages(messages);
            
            // Marcar mensagens como lidas
            await markMessagesAsRead(contactId);
            
            // Scroll para o final
            scrollToBottom();
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
            if (elements.chatMessages) {
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
            
            messageElement.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
            messageElement.innerHTML = `
                <div class="message-content">${escapeHtml(message.message)}</div>
                <div class="message-time">${formatTime(message.created_at)}</div>
            `;
            
            elements.chatMessages.appendChild(messageElement);
        });
    };

    const sendMessage = async () => {
        if (!elements.messageInput || !currentReceiver || !currentUser) return;
        
        const messageText = elements.messageInput.value.trim();
        if (!messageText) return;
        
        try {
            // Desabilitar botão durante o envio
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
            
            // Recarregar mensagens para mostrar a nova
            await loadMessages(currentReceiver.id);
            
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            if (window.UtilsModule && window.UtilsModule.showNotification) {
                window.UtilsModule.showNotification('Erro ao enviar mensagem', 'error');
            } else {
                alert('Erro ao enviar mensagem: ' + error.message);
            }
        } finally {
            if (elements.sendButton) {
                elements.sendButton.disabled = !elements.messageInput.value.trim();
            }
        }
    };

    const setupRealtimeSubscription = () => {
        if (!currentUser) {
            console.warn('Não é possível configurar subscription: usuário não autenticado');
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
        } else {
            // Mostrar notificação
            const senderName = await getSenderName(message.sender_id);
            if (window.UtilsModule && window.UtilsModule.showNotification) {
                window.UtilsModule.showNotification(`Nova mensagem de ${senderName}: ${message.message.substring(0, 50)}${message.message.length > 50 ? '...' : ''}`, 'info');
            }
            
            // Atualizar contador de não lidas
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
            return 'Alguém';
        }
    };

    const updateUnreadCount = (senderId) => {
        const currentCount = unreadMessages.get(senderId) || 0;
        unreadMessages.set(senderId, currentCount + 1);
        updateUnreadBadge();
        
        // Atualizar na lista de contatos se visível
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
            }
        }
    };

    const updateUnreadBadge = () => {
        if (!elements.unreadBadge) return;
        
        const totalUnread = Array.from(unreadMessages.values()).reduce((sum, count) => sum + count, 0);
        
        if (totalUnread > 0) {
            elements.unreadBadge.textContent = totalUnread > 99 ? '99+' : totalUnread;
            elements.unreadBadge.style.display = 'flex';
            
            // Adicionar animação de pulsação
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

    const markMessagesAsRead = async (contactId) => {
        try {
            const { error } = await window.supabaseClient
                .from('chat_messages')
                .update({ is_read: true })
                .eq('sender_id', contactId)
                .eq('receiver_id', currentUser.id)
                .eq('is_read', false);
            
            if (error) throw error;
            
            // Atualizar contador de não lidas
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

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
            // Verificar se há um usuário autenticado
            window.supabaseClient.auth.getUser()
                .then(({ data: { user } }) => {
                    if (user) {
                        ChatModule.initChatModule();
                    }
                })
                .catch(error => {
                    console.error('Erro ao verificar autenticação:', error);
                });
        }
    }, 100);
});