const chatbot = new ChatBot();
const messages = document.getElementById('messages');
const form = document.getElementById('messageForm');
const input = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const inputTyping = document.getElementById('inputTyping');
const commandHistory = [];
let historyIndex = 0;
let waiting = false;
let nextMessageId = 1;
let turns = [];

function updateButton() {
    sendButton.disabled = !input.value.trim() || waiting;
    inputTyping.hidden = !input.value.trim();
}

function makeMessage(text, author, turnId, isTyping = false) {
    const message = document.createElement('div');
    message.className = `message message--${author}`;
    message.dataset.turn = String(turnId);

    const avatar = document.createElement('img');
    avatar.className = 'message__avatar';
    avatar.src = author === 'user' ? 'assets/user_avatar.png' : 'assets/bot_avatar.png';
    avatar.alt = '';
    avatar.width = 48;
    avatar.height = 48;

    const bubble = document.createElement('div');
    bubble.className = `message__bubble${isTyping ? ' message__bubble--typing' : ''}`;
    if (isTyping) {
        bubble.setAttribute('aria-label', 'Бот печатает');
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            dot.className = 'typing-dot';
            dot.setAttribute('aria-hidden', 'true');
            bubble.append(dot);
        }
    } else {
        bubble.textContent = text;
    }

    message.append(avatar, bubble);
    return message;
}

function addMessage(text, author, turnId) {
    const element = makeMessage(text, author, turnId);
    messages.prepend(element);
    messages.scrollTop = 0;
    return element;
}

function sendMessage(text) {
    if (waiting) {
        return;
    }
    if (text.trim().toLowerCase() === '/undo') {
        if (chatbot.undo()) {
            const removed = turns.pop();
            messages.querySelectorAll(`[data-turn="${removed}"]`).forEach(element => element.remove());
        }
        input.value = '';
        historyIndex = commandHistory.length;
        updateButton();
        return;
    }

    const turnId = nextMessageId++;
    const answer = chatbot.respond(text);
    turns.push(turnId);
    commandHistory.push(text);
    historyIndex = commandHistory.length;
    addMessage(text, 'user', turnId);
    const typing = makeMessage('', 'bot', turnId, true);
    messages.prepend(typing);
    messages.scrollTop = 0;
    waiting = true;
    input.value = '';
    updateButton();

    window.setTimeout(() => {
        typing.replaceWith(makeMessage(answer, 'bot', turnId));
        waiting = false;
        updateButton();
        messages.scrollTop = 0;
        input.focus();
    }, 450);
}

form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (text && !waiting) {
        sendMessage(text);
    }
});

input.addEventListener('input', updateButton);

input.addEventListener('keydown', event => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
        return;
    }
    if (commandHistory.length === 0) {
        return;
    }
    event.preventDefault();
    if (event.key === 'ArrowUp') {
        historyIndex = Math.max(0, historyIndex - 1);
    } else {
        historyIndex = Math.min(commandHistory.length, historyIndex + 1);
    }
    input.value = historyIndex === commandHistory.length ? '' : commandHistory[historyIndex];
    updateButton();
});

addMessage('Введите команду /start, для начала общения', 'bot', 0);
updateButton();
