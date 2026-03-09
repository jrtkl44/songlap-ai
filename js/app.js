const DOM = {
    feed: document.getElementById('chat-feed'),
    input: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    themeBtn: document.getElementById('theme-btn'),
    welcome: document.getElementById('welcome-screen'),
    container: document.getElementById('chat-container'),
    sidebar: document.getElementById('sidebar'),
    menuToggle: document.getElementById('menu-toggle'),
    overlay: document.getElementById('sidebar-overlay'),
    historyList: document.getElementById('chat-history-list'),
    newChatBtns: [document.getElementById('new-chat-sidebar-btn'), document.getElementById('new-chat-top-btn')],
    stopBtn: document.getElementById('stop-btn'),
    stopBtnContainer: document.getElementById('stop-btn-container'),
    clearHistoryBtn: document.getElementById('clear-history-btn')
};

let currentChatId = null;
let chatHistory = JSON.parse(localStorage.getItem('songlap_chats') || '[]');
let abortController = null;

// Configure Marked
if (typeof marked !== 'undefined') {
    marked.setOptions({
        breaks: true,
        gfm: true
    });
}

function init() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    renderHistory();

    DOM.input.addEventListener('input', adjustHeight);
    DOM.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    DOM.sendBtn.addEventListener('click', sendMessage);
    DOM.themeBtn.addEventListener('click', toggleTheme);
    
    DOM.menuToggle.addEventListener('click', () => {
        DOM.sidebar.classList.toggle('open');
    });

    DOM.overlay.addEventListener('click', () => {
        DOM.sidebar.classList.remove('open');
    });

    DOM.newChatBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', startNewChat);
    });

    if (DOM.stopBtn) DOM.stopBtn.addEventListener('click', stopGeneration);
    if (DOM.clearHistoryBtn) DOM.clearHistoryBtn.addEventListener('click', clearHistory);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

function adjustHeight() {
    DOM.input.style.height = 'auto';
    DOM.input.style.height = Math.min(DOM.input.scrollHeight, 200) + 'px';
    DOM.sendBtn.disabled = DOM.input.value.trim() === '';
}

function scrollToBottom() {
    DOM.container.scrollTo({
        top: DOM.container.scrollHeight,
        behavior: 'smooth'
    });
}

function startNewChat() {
    currentChatId = null;
    DOM.feed.innerHTML = '';
    DOM.welcome.style.display = 'flex';
    DOM.input.value = '';
    adjustHeight();
    DOM.sidebar.classList.remove('open');
    updateActiveHistoryItem();
}

window.setInput = (text) => {
    DOM.input.value = text;
    DOM.input.focus();
    adjustHeight();
    sendMessage();
};

function appendMsg(role, text) {
    if (DOM.welcome.style.display !== 'none') {
        DOM.welcome.style.display = 'none';
    }

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    
    if (role === 'ai') {
        const avatar = document.createElement('div');
        avatar.className = 'avatar-ai';
        avatar.innerHTML = `<img src="img/logo.png" alt="AI">`;
        msgDiv.appendChild(avatar);
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'msg-content';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    
    if (role === 'ai') {
        bubble.innerHTML = typeof marked !== 'undefined' ? marked.parse(text) : text;
    } else {
        bubble.textContent = text;
    }

    contentDiv.appendChild(bubble);

    if (role === 'ai') {
        const actions = document.createElement('div');
        actions.className = 'msg-actions';
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'action-btn';
        copyBtn.title = 'Copy';
        copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        copyBtn.onclick = () => {
            const rawText = bubble.innerText;
            navigator.clipboard.writeText(rawText).then(() => {
                copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                    copyBtn.classList.remove('copied');
                }, 2000);
            });
        };

        const shareBtn = document.createElement('button');
        shareBtn.className = 'action-btn';
        shareBtn.title = 'Share';
        shareBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>`;
        shareBtn.onclick = () => {
            if (navigator.share) {
                navigator.share({
                    title: 'Songlap AI Response',
                    text: bubble.innerText,
                    url: window.location.href
                });
            } else {
                alert('Sharing is not supported on this browser.');
            }
        };

        actions.appendChild(copyBtn);
        actions.appendChild(shareBtn);
        contentDiv.appendChild(actions);
    }

    msgDiv.appendChild(contentDiv);
    DOM.feed.appendChild(msgDiv);
    scrollToBottom();
    return bubble;
}

function showTyping() {
    const div = document.createElement('div');
    div.className = 'message ai typing-message';
    div.id = 'typing-indicator';
    div.innerHTML = `
        <div class="avatar-ai"><img src="img/logo.png" alt="AI"></div>
        <div class="msg-content">
            <div class="msg-bubble">
                <div class="typing-indicator-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </div>
    `;
    DOM.feed.appendChild(div);
    scrollToBottom();
}

function removeTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

async function sendMessage() {
    const text = DOM.input.value.trim();
    if (!text || abortController) return;

    if (!currentChatId) {
        currentChatId = Date.now().toString();
        chatHistory.unshift({
            id: currentChatId,
            title: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
            messages: []
        });
        saveHistory();
        renderHistory();
    }

    DOM.input.value = '';
    adjustHeight();
    
    appendMsg('user', text);
    const chat = chatHistory.find(c => c.id === currentChatId);
    chat.messages.push({ role: 'user', content: text });
    
    showTyping();
    if (DOM.stopBtnContainer) DOM.stopBtnContainer.style.display = 'flex';

    abortController = new AbortController();

    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: chat.messages }),
            signal: abortController.signal
        });

        if (!res.ok) throw new Error("API Error");

        removeTyping();
        const bubble = appendMsg('ai', '');
        let fullText = "";
        
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const json = JSON.parse(line.substring(6));
                        const content = json.choices[0]?.delta?.content || "";
                        fullText += content;
                        if (typeof marked !== 'undefined') {
                            bubble.innerHTML = marked.parse(fullText);
                        } else {
                            bubble.textContent = fullText;
                        }
                        scrollToBottom();
                    } catch (e) {}
                }
            }
        }
        
        chat.messages.push({ role: 'assistant', content: fullText });
        saveHistory();

    } catch (err) {
        removeTyping();
        if (err.name === 'AbortError') {
            appendMsg('ai', 'Generation stopped.');
        } else {
            appendMsg('ai', 'দুঃখিত, সংযোগে সমস্যা হচ্ছে।');
        }
    } finally {
        abortController = null;
        if (DOM.stopBtnContainer) DOM.stopBtnContainer.style.display = 'none';
    }
}

function stopGeneration() {
    if (abortController) {
        abortController.abort();
    }
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all chat history?')) {
        chatHistory = [];
        localStorage.removeItem('songlap_chats');
        renderHistory();
        startNewChat();
    }
}

function saveHistory() {
    localStorage.setItem('songlap_chats', JSON.stringify(chatHistory.slice(0, 20)));
}

function renderHistory() {
    DOM.historyList.innerHTML = '';
    chatHistory.forEach(chat => {
        const item = document.createElement('div');
        item.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
        item.dataset.id = chat.id;
        item.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z"></path></svg>
            <span class="history-title">${chat.title}</span>
            <button class="delete-chat-btn" title="Delete Chat">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        `;
        item.onclick = () => loadChat(chat.id);
        
        const deleteBtn = item.querySelector('.delete-chat-btn');
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        };

        DOM.historyList.appendChild(item);
    });
}

function deleteChat(id) {
    if (confirm('Delete this chat?')) {
        chatHistory = chatHistory.filter(c => c.id !== id);
        saveHistory();
        renderHistory();
        if (currentChatId === id) {
            startNewChat();
        }
    }
}

function loadChat(id) {
    const chat = chatHistory.find(c => c.id === id);
    if (!chat) return;

    currentChatId = id;
    DOM.feed.innerHTML = '';
    DOM.welcome.style.display = 'none';
    
    chat.messages.forEach(msg => {
        appendMsg(msg.role === 'assistant' ? 'ai' : 'user', msg.content);
    });
    
    updateActiveHistoryItem();
    DOM.sidebar.classList.remove('open');
}

function updateActiveHistoryItem() {
    document.querySelectorAll('.history-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === currentChatId);
    });
}

init();