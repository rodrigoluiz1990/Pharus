const ChatPageModule = (() => {
    const state = {
        currentUser: null,
        contacts: [],
        filteredContacts: [],
        selectedContact: null,
        selectedAttachment: null,
        isSendingAttachment: false,
        contactsSnapshot: '',
        messagesSnapshotByContact: new Map(),
        contactsRefreshInterval: null,
        messagesRefreshInterval: null,
    };

    const elements = {
        contactsList: document.getElementById('chatContactsList'),
        contactsStatus: document.getElementById('chatContactsStatus'),
        contactSearch: document.getElementById('chatContactSearch'),
        emptyState: document.getElementById('chatConversationEmpty'),
        panel: document.getElementById('chatConversationPanel'),
        conversationAvatar: document.getElementById('chatConversationAvatar'),
        conversationName: document.getElementById('chatConversationName'),
        conversationStatus: document.getElementById('chatConversationStatus'),
        messages: document.getElementById('chatConversationMessages'),
        messageInput: document.getElementById('chatConversationInput'),
        sendButton: document.getElementById('chatConversationSendBtn'),
        attachBtn: document.getElementById('chatConversationAttachBtn'),
        attachmentInput: document.getElementById('chatConversationAttachmentInput'),
        selectedAttachmentInfo: document.getElementById('chatPageSelectedAttachment'),
        emojiBtn: document.getElementById('chatConversationEmojiBtn'),
        emojiPicker: document.getElementById('chatConversationEmojiPicker'),
    };
    const EMOJI_OPTIONS = ['😀', '😁', '😂', '😊', '😉', '😍', '😎', '🤔', '👍', '👏', '🙏', '🎯', '🔥', '✅', '⚠️', '❗', '💡', '📌', '🚀', '💬'];

    const init = async () => {
        await loadCurrentUser();
        setupEvents();
        await loadContacts({ forceRender: true });
        maybeAutoSelectContactFromUrl();
        startPolling();
    };

    const loadCurrentUser = async () => {
        const { data: userData } = await window.supabaseClient.auth.getUser();
        if (userData && userData.user) {
            state.currentUser = userData.user;
            return;
        }

        const { data: sessionData } = await window.supabaseClient.auth.getSession();
        state.currentUser = sessionData?.session?.user || null;
    };

    const setupEvents = () => {
        if (elements.contactSearch) {
            elements.contactSearch.addEventListener('input', () => {
                applySearchFilter();
                renderContacts();
            });
        }

        if (elements.sendButton) {
            elements.sendButton.addEventListener('click', sendMessage);
        }

        if (elements.messageInput) {
            elements.messageInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    sendMessage();
                }
            });
            elements.messageInput.addEventListener('input', updateSendButtonState);
        }

        if (elements.attachBtn) {
            elements.attachBtn.addEventListener('click', () => {
                if (elements.attachmentInput) elements.attachmentInput.click();
            });
        }

        if (elements.attachmentInput) {
            elements.attachmentInput.addEventListener('change', handleAttachmentSelected);
        }

        if (elements.emojiBtn) {
            elements.emojiBtn.addEventListener('click', toggleEmojiPicker);
        }

        document.addEventListener('click', handleOutsideEmojiPickerClick);
        buildEmojiPicker();
        updateSendButtonState();
    };

    const maybeAutoSelectContactFromUrl = () => {
        const searchParams = new URLSearchParams(window.location.search || '');
        const contactId = String(searchParams.get('userId') || '');
        if (!contactId) return;

        const contact = state.contacts.find((item) => item.id === contactId);
        if (contact) {
            selectContact(contact.id);
        }
    };

    const loadContacts = async (options = {}) => {
        const { forceRender = false } = options;
        if (!state.currentUser || !elements.contactsList) return;

        try {
            if (elements.contactsStatus) {
                elements.contactsStatus.textContent = 'Atualizando contatos...';
            }

            const [contactsResult, unreadResult, messagesResult] = await Promise.all([
                window.supabaseClient
                    .from('user_profiles')
                    .select('id, full_name, email, status')
                    .neq('id', state.currentUser.id)
                    .order('full_name', { ascending: true }),
                window.supabaseClient
                    .from('chat_messages')
                    .select('id, sender_id, receiver_id, is_read')
                    .eq('receiver_id', state.currentUser.id)
                    .eq('is_read', false),
                window.supabaseClient
                    .from('chat_messages')
                    .select('id, sender_id, receiver_id, message, created_at')
                    .or(`sender_id.eq.${state.currentUser.id},receiver_id.eq.${state.currentUser.id}`)
                    .order('created_at', { ascending: false }),
            ]);

            if (contactsResult.error) throw contactsResult.error;
            if (unreadResult.error) throw unreadResult.error;
            if (messagesResult.error) throw messagesResult.error;

            const unreadBySender = buildUnreadMap(unreadResult.data || []);
            const lastByContact = buildLastMessageMap(messagesResult.data || []);

            state.contacts = (contactsResult.data || []).map((contact) => {
                const label = contact.full_name || contact.email || 'Sem nome';
                const last = lastByContact.get(contact.id) || null;
                return {
                    id: contact.id,
                    label,
                    email: contact.email || '',
                    status: contact.status === 'active' ? 'Online' : 'Offline',
                    unread: unreadBySender.get(contact.id) || 0,
                    lastMessage: last ? String(last.message || '').trim() : '',
                    lastAt: last ? last.created_at : null,
                };
            });

            state.contacts.sort((a, b) => {
                const aTime = a.lastAt ? new Date(a.lastAt).getTime() : 0;
                const bTime = b.lastAt ? new Date(b.lastAt).getTime() : 0;
                if (aTime !== bTime) return bTime - aTime;
                return a.label.localeCompare(b.label, 'pt-BR');
            });

            emitUnreadUpdate();

            applySearchFilter();
            const snapshot = buildContactsSnapshot(state.filteredContacts);
            if (forceRender || snapshot !== state.contactsSnapshot) {
                renderContacts();
                state.contactsSnapshot = snapshot;
            }

            if (elements.contactsStatus) {
                elements.contactsStatus.textContent = `${state.filteredContacts.length} contato(s)`;
            }

            if (state.selectedContact) {
                const refreshedSelection = state.contacts.find((item) => item.id === state.selectedContact.id);
                if (!refreshedSelection) {
                    clearSelectedContact();
                } else {
                    state.selectedContact = refreshedSelection;
                    renderConversationHeader();
                    highlightActiveContact();
                }
            }
        } catch (error) {
            console.error('Erro ao carregar contatos do chat:', error);
            if (elements.contactsStatus) {
                elements.contactsStatus.textContent = `Falha ao carregar contatos: ${error.message}`;
            }
        }
    };

    const buildUnreadMap = (messages) => {
        const map = new Map();
        messages.forEach((message) => {
            const senderId = String(message.sender_id || '');
            if (!senderId) return;
            map.set(senderId, (map.get(senderId) || 0) + 1);
        });
        return map;
    };

    const emitUnreadUpdate = () => {
        const totalUnread = state.contacts.reduce((sum, contact) => sum + Number(contact.unread || 0), 0);
        window.dispatchEvent(new CustomEvent('pharus:chat-unread-updated', {
            detail: { totalUnread }
        }));
    };

    const buildLastMessageMap = (messages) => {
        const map = new Map();
        messages.forEach((message) => {
            const senderId = String(message.sender_id || '');
            const receiverId = String(message.receiver_id || '');
            const contactId = senderId === String(state.currentUser.id) ? receiverId : senderId;
            if (!contactId || map.has(contactId)) return;
            map.set(contactId, message);
        });
        return map;
    };

    const buildContactsSnapshot = (contacts) => {
        return contacts
            .map((contact) => `${contact.id}|${contact.unread}|${contact.lastAt || ''}|${contact.lastMessage}`)
            .join(';');
    };

    const applySearchFilter = () => {
        const term = String(elements.contactSearch?.value || '').trim().toLowerCase();
        if (!term) {
            state.filteredContacts = [...state.contacts];
            return;
        }

        state.filteredContacts = state.contacts.filter((contact) => {
            return contact.label.toLowerCase().includes(term) || contact.email.toLowerCase().includes(term);
        });
    };

    const renderContacts = () => {
        if (!elements.contactsList) return;
        elements.contactsList.innerHTML = '';

        if (state.filteredContacts.length === 0) {
            elements.contactsList.innerHTML = '<div class="chat-page-status">Nenhum contato encontrado.</div>';
            return;
        }

        state.filteredContacts.forEach((contact) => {
            const item = document.createElement('div');
            item.className = 'chat-page-contact-item';
            item.dataset.contactId = contact.id;

            const initials = getInitials(contact.label || contact.email || '?');
            const preview = contact.lastMessage || 'Sem mensagens';
            const time = contact.lastAt ? formatTime(contact.lastAt) : '';

            item.innerHTML = `
                <div class="chat-page-avatar">${escapeHtml(initials)}</div>
                <div class="chat-page-contact-main">
                    <div class="chat-page-contact-head">
                        <span class="chat-page-contact-name">${escapeHtml(contact.label)}</span>
                        <span class="chat-page-contact-time">${escapeHtml(time)}</span>
                    </div>
                    <div class="chat-page-contact-preview">${escapeHtml(preview)}</div>
                </div>
                ${contact.unread > 0 ? `<span class="chat-page-unread">${contact.unread > 99 ? '99+' : contact.unread}</span>` : ''}
            `;

            item.addEventListener('click', () => selectContact(contact.id));
            elements.contactsList.appendChild(item);
        });

        highlightActiveContact();
    };

    const selectContact = async (contactId) => {
        const contact = state.contacts.find((item) => item.id === contactId);
        if (!contact) return;

        state.selectedContact = contact;
        renderConversationHeader();
        if (elements.emptyState) elements.emptyState.classList.add('hidden');
        if (elements.panel) elements.panel.classList.remove('hidden');
        highlightActiveContact();

        await loadMessages({ forceRender: true, autoScroll: true });
        await markMessagesAsRead(contactId);
        hideEmojiPicker();
    };

    const clearSelectedContact = () => {
        state.selectedContact = null;
        if (elements.panel) elements.panel.classList.add('hidden');
        if (elements.emptyState) elements.emptyState.classList.remove('hidden');
        clearSelectedAttachment();
        hideEmojiPicker();
    };

    const renderConversationHeader = () => {
        if (!state.selectedContact) return;
        if (elements.conversationName) elements.conversationName.textContent = state.selectedContact.label;
        if (elements.conversationStatus) elements.conversationStatus.textContent = state.selectedContact.status;
        if (elements.conversationAvatar) elements.conversationAvatar.textContent = getInitials(state.selectedContact.label);
    };

    const highlightActiveContact = () => {
        const items = elements.contactsList?.querySelectorAll('.chat-page-contact-item') || [];
        items.forEach((item) => {
            item.classList.toggle('active', state.selectedContact && item.dataset.contactId === state.selectedContact.id);
        });
    };

    const loadMessages = async (options = {}) => {
        const { forceRender = false, autoScroll = false } = options;
        if (!state.selectedContact || !state.currentUser || !elements.messages) return;

        try {
            const { data: messages, error } = await window.supabaseClient
                .from('chat_messages')
                .select('*')
                .or(`and(sender_id.eq.${state.currentUser.id},receiver_id.eq.${state.selectedContact.id}),and(sender_id.eq.${state.selectedContact.id},receiver_id.eq.${state.currentUser.id})`)
                .order('created_at', { ascending: true });

            if (error) throw error;

            const safeMessages = messages || [];
            const last = safeMessages.length ? safeMessages[safeMessages.length - 1] : null;
            const snapshot = `${safeMessages.length}:${last ? last.id : 'none'}:${last ? last.edited_at || last.created_at : 'none'}`;
            const previous = state.messagesSnapshotByContact.get(state.selectedContact.id);

            if (forceRender || snapshot !== previous) {
                renderMessages(safeMessages);
                state.messagesSnapshotByContact.set(state.selectedContact.id, snapshot);
                if (autoScroll) {
                    scrollMessagesToBottom();
                }
            }
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
            elements.messages.innerHTML = `<div class="chat-page-status">Falha ao carregar mensagens: ${escapeHtml(error.message)}</div>`;
        }
    };

    const renderMessages = (messages) => {
        if (!elements.messages) return;
        elements.messages.innerHTML = '';

        if (!messages.length) {
            elements.messages.innerHTML = '<div class="chat-page-status">Nenhuma mensagem ainda.</div>';
            return;
        }

        messages.forEach((message) => {
            const own = String(message.sender_id) === String(state.currentUser.id);
            const content = escapeHtml(message.message || '');
            const editedLabel = message.edited_at ? ' (editada)' : '';
            const attachmentBlock = message.attachment_path
                ? `<a class="chat-page-attachment" href="${window.location.origin}/api/chat/attachment/${encodeURIComponent(message.id)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-paperclip"></i> ${escapeHtml(message.attachment_name || 'Anexo')}</a>`
                : '';

            const bubble = document.createElement('div');
            bubble.className = `chat-page-msg ${own ? 'sent' : 'received'}`;
            bubble.innerHTML = `
                <div>${content}</div>
                ${attachmentBlock}
                <div class="chat-page-msg-time">${formatTime(message.created_at)}${editedLabel}</div>
            `;

            elements.messages.appendChild(bubble);
        });
    };

    const sendMessage = async () => {
        if (!state.currentUser || !state.selectedContact || !elements.messageInput) return;
        const text = elements.messageInput.value.trim();
        const hasAttachment = Boolean(state.selectedAttachment);
        if (!text && !hasAttachment) return;
        hideEmojiPicker();

        try {
            state.isSendingAttachment = true;
            updateSendButtonState();
            if (hasAttachment) {
                await sendAttachment(state.selectedAttachment, text);
            } else {
                const { error } = await window.supabaseClient
                    .from('chat_messages')
                    .insert([
                        {
                            sender_id: state.currentUser.id,
                            receiver_id: state.selectedContact.id,
                            message: text,
                        },
                    ]);
                if (error) throw error;
            }

            elements.messageInput.value = '';
            clearSelectedAttachment();
            await loadMessages({ forceRender: true, autoScroll: true });
            await loadContacts({ forceRender: true });
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
        } finally {
            state.isSendingAttachment = false;
            updateSendButtonState();
        }
    };

    const updateSendButtonState = () => {
        if (!elements.sendButton || !elements.messageInput) return;
        const hasText = Boolean(elements.messageInput.value.trim());
        const hasAttachment = Boolean(state.selectedAttachment);
        elements.sendButton.disabled = state.isSendingAttachment || (!hasText && !hasAttachment) || !state.selectedContact;
    };

    const handleAttachmentSelected = (event) => {
        const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
        if (!file) return;

        const extension = getFileExtension(file.name);
        if (!isAllowedAttachmentExtension(extension)) {
            window.alert(`Tipo de arquivo não permitido (${extension || 'sem extensão'}).`);
            event.target.value = '';
            return;
        }

        const maxBytes = 10 * 1024 * 1024;
        if (file.size > maxBytes) {
            window.alert('Arquivo excede o limite de 10 MB.');
            event.target.value = '';
            return;
        }

        state.selectedAttachment = file;
        renderSelectedAttachmentInfo();
        updateSendButtonState();
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

    const formatFileSize = (bytes) => {
        const size = Number(bytes || 0);
        if (!Number.isFinite(size) || size <= 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        let value = size;
        let unitIndex = 0;
        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex += 1;
        }
        return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
    };

    const renderSelectedAttachmentInfo = (uploadPercent = null, uploadStatus = '') => {
        if (!elements.selectedAttachmentInfo) return;

        if (!state.selectedAttachment) {
            elements.selectedAttachmentInfo.classList.add('hidden');
            elements.selectedAttachmentInfo.innerHTML = '';
            return;
        }

        elements.selectedAttachmentInfo.classList.remove('hidden');
        elements.selectedAttachmentInfo.innerHTML = `
            <div class="chat-page-selected-attachment-main">
                <span><i class="fas fa-paperclip"></i> ${escapeHtml(state.selectedAttachment.name)} (${formatFileSize(state.selectedAttachment.size)})</span>
                ${uploadStatus ? `<span>${escapeHtml(uploadStatus)}</span>` : ''}
                ${(uploadPercent !== null && state.isSendingAttachment) ? `
                    <div class="chat-page-upload-track">
                        <div class="chat-page-upload-fill" style="width:${Math.max(0, Math.min(uploadPercent, 100))}%;"></div>
                    </div>
                ` : ''}
            </div>
            <button class="chat-page-selected-attachment-remove" id="chatPageRemoveAttachmentBtn" type="button" title="Remover anexo" ${state.isSendingAttachment ? 'disabled' : ''}>
                <i class="fas fa-times"></i>
            </button>
        `;

        const removeButton = document.getElementById('chatPageRemoveAttachmentBtn');
        if (removeButton) {
            removeButton.addEventListener('click', clearSelectedAttachment);
        }
    };

    const clearSelectedAttachment = () => {
        if (state.isSendingAttachment) return;
        state.selectedAttachment = null;
        if (elements.attachmentInput) {
            elements.attachmentInput.value = '';
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

    const uploadAttachmentWithProgress = (file, mimeType) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                const result = String(reader.result || '');
                const base64Data = result.includes(',') ? result.split(',')[1] : result;

                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/chat/upload', true);
                xhr.setRequestHeader('Content-Type', 'application/json');

                xhr.upload.onprogress = (evt) => {
                    if (!evt.lengthComputable) return;
                    const percent = Math.round((evt.loaded / evt.total) * 100);
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
        const mimeType = file.type || inferMimeTypeFromName(file.name);
        renderSelectedAttachmentInfo(0, 'Iniciando upload...');
        const uploadData = await uploadAttachmentWithProgress(file, mimeType);
        renderSelectedAttachmentInfo(100, 'Upload concluido');

        const payload = {
            sender_id: state.currentUser.id,
            receiver_id: state.selectedContact.id,
            message: String(messageText || '').trim() || `[Anexo] ${file.name}`,
            attachment_path: uploadData.path || uploadData.attachment_path || null,
            attachment_name: uploadData.fileName || uploadData.name || file.name,
            attachment_type: uploadData.mimeType || uploadData.type || mimeType,
            attachment_size: Number(uploadData.size || file.size || 0),
        };

        const { error } = await window.supabaseClient.from('chat_messages').insert([payload]);
        if (error) throw error;
    };

    const buildEmojiPicker = () => {
        if (!elements.emojiPicker) return;
        elements.emojiPicker.innerHTML = '';

        EMOJI_OPTIONS.forEach((emoji) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'chat-page-emoji-option';
            button.textContent = emoji;
            button.title = `Inserir ${emoji}`;
            button.addEventListener('click', () => {
                appendEmoji(emoji);
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

    const handleOutsideEmojiPickerClick = (event) => {
        if (!elements.emojiPicker || !elements.emojiBtn) return;
        const target = event.target;
        if (!target) return;
        if (elements.emojiPicker.contains(target) || elements.emojiBtn.contains(target)) return;
        hideEmojiPicker();
    };

    const appendEmoji = (emoji) => {
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

    const markMessagesAsRead = async (contactId) => {
        try {
            const { error } = await window.supabaseClient
                .from('chat_messages')
                .update({ is_read: true })
                .eq('sender_id', contactId)
                .eq('receiver_id', state.currentUser.id)
                .eq('is_read', false);
            if (error) throw error;
            await loadContacts({ forceRender: true });
        } catch (error) {
            console.error('Erro ao marcar mensagens como lidas:', error);
        }
    };

    const scrollMessagesToBottom = () => {
        if (!elements.messages) return;
        elements.messages.scrollTop = elements.messages.scrollHeight;
    };

    const startPolling = () => {
        stopPolling();
        state.contactsRefreshInterval = setInterval(async () => {
            await loadContacts();
        }, 12000);

        state.messagesRefreshInterval = setInterval(async () => {
            await loadMessages();
        }, 2500);
    };

    const stopPolling = () => {
        if (state.contactsRefreshInterval) {
            clearInterval(state.contactsRefreshInterval);
            state.contactsRefreshInterval = null;
        }
        if (state.messagesRefreshInterval) {
            clearInterval(state.messagesRefreshInterval);
            state.messagesRefreshInterval = null;
        }
    };

    const getInitials = (name) => {
        return String(name || '?')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join('') || '?';
    };

    const formatTime = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = String(text ?? '');
        return div.innerHTML;
    };

    return { init };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ChatPageModule.init());
} else {
    ChatPageModule.init();
}
