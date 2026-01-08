const CONFIG = {
    apiKey: "", 
    model: "llama-3.3-70b-versatile"
};

const DOM = {
    feed: document.getElementById('chat-feed'),
    input: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    themeBtn: document.getElementById('theme-btn'),
    newChatBtn: document.getElementById('new-chat-btn'),
    welcome: document.getElementById('welcome-screen'),
    container: document.getElementById('chat-container')
};

let history = [
  {
    role: "system",
    content: `
You are Songlap AI.

Primary language: Bangla.

Speaking style:
- Use natural, fluent, human Bangla.
- Avoid robotic, bookish or translation-style Bangla.
- Speak like a smart, friendly Bangladeshi person.

Greeting rules:
- Do not say "নমস্কার".
- Allowed greetings: "হ্যালো", "হাই", "আসসালামু আলাইকুম".

Branding:
Songlap AI is a software product.
It is crafted, developed and maintained by JR Torikul Islam.
Always keep the name exactly as: JR Torikul Islam.
Never translate or partially convert the name into Bangla.

Contact handling:
If the user asks how to contact the developer, give this official link:
https://jrtkl.netlify.app/

Behavior:
- Keep answers short and clear.
- No religious or spiritual terms.
- No corporate tone.
- Be practical and friendly.
`
  }
];



function init() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    if (!localStorage.getItem('groq_api_key')) {
        localStorage.setItem('groq_api_key', CONFIG.apiKey);
    }

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            setTimeout(() => DOM.container.scrollTop = DOM.container.scrollHeight, 100);
        });
    }
}

window.setInput = (text) => {
    DOM.input.value = text;
    DOM.input.focus();
    adjustHeight();
    DOM.sendBtn.disabled = false;
    sendMessage();
};

function adjustHeight() {
    DOM.input.style.height = 'auto';
    DOM.input.style.height = Math.min(DOM.input.scrollHeight, 140) + 'px';
    DOM.sendBtn.disabled = DOM.input.value.trim() === '';
}

function scrollToBottom() {
    DOM.container.scrollTop = DOM.container.scrollHeight;
}

function startNewChat() {
    history = [
    {
        role: "system",
        content: `
    You are Songlap AI.

    Primary language: Bangla.

    Speaking style:
    - Use natural, fluent, human Bangla.
    - Avoid robotic, bookish or translation-style Bangla.
    - Speak like a smart, friendly Bangladeshi person.

    Greeting rules:
    

    - Allowed greetings: "হ্যালো", "হাই", "আসসালামু আলাইকুম".

    Branding:
    Songlap AI is a software product.
    It is crafted, developed and maintained by JR Torikul Islam.
    Always keep the name exactly as: JR Torikul Islam.
    Never translate or partially convert the name into Bangla.

    Contact handling:
    If the user asks how to contact the developer, give this official link:
    https://jrtkl.netlify.app/

    Behavior:
    - Keep answers short and clear.
    - No religious or spiritual terms.
    - No corporate tone.
    - Be practical and friendly.
    `
    }
    ];

    DOM.feed.innerHTML = '';
    DOM.welcome.style.display = 'flex';
    DOM.feed.style.display = 'none';
    DOM.input.value = '';
    adjustHeight();
    DOM.sendBtn.disabled = true;
}

function appendMsg(role, text) {
    if (DOM.welcome.style.display !== 'none') {
        DOM.welcome.style.display = 'none';
        DOM.feed.style.display = 'flex';
    }

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    
    if (role === 'ai') {
        bubble.innerHTML = typeof marked !== 'undefined' ? marked.parse(text) : text;
    } else {
        bubble.textContent = text;
    }

    msgDiv.appendChild(bubble);
    DOM.feed.appendChild(msgDiv);
    scrollToBottom();
    return bubble;
}

function showTyping() {
    const div = document.createElement('div');
    div.className = 'typing';
    div.id = 'typing-indicator';
    div.innerHTML = `<span></span><span></span><span></span>`;
    DOM.feed.appendChild(div);
    scrollToBottom();
}

function removeTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

async function sendMessage() {
    const text = DOM.input.value.trim();
    if (!text) return;

    const apiKey = localStorage.getItem('groq_api_key') || CONFIG.apiKey;

    DOM.input.value = '';
    DOM.input.style.height = 'auto';
    DOM.sendBtn.disabled = true;

    appendMsg('user', text);
    history.push({ role: "user", content: text });
    showTyping();

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: CONFIG.model,
                messages: history,
                stream: true
            })
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
                        bubble.innerHTML = marked.parse(fullText);
                        scrollToBottom();
                    } catch (e) {}
                }
            }
        }
        history.push({ role: "assistant", content: fullText });

    } catch (err) {
        removeTyping();
        appendMsg('ai', 'দুঃখিত, সংযোগে সমস্যা হচ্ছে।');
        console.error(err);
    }
}

DOM.input.addEventListener('input', adjustHeight);
DOM.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
DOM.sendBtn.addEventListener('click', sendMessage);

DOM.themeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
});

DOM.newChatBtn.addEventListener('click', startNewChat);

init();