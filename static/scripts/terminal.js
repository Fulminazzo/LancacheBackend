let pressingCtrl = false;
let previousInputs = [];
let terminalIndex = -1;
let clickedElement = undefined;

function isFromAndroid() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/.test(navigator.userAgent);
}

async function sendInput(terminal, input) {
    previousInputs.push(input);
    terminalIndex = previousInputs.length;
    const result = await fetch(`www.google.com/${encodeURI(input)}`)
        .then(response =>
            response.json()
                .then(json => json.data)
                .catch(() => null))
        .catch(() => null);
    const form = terminal.getElementsByTagName("form")[0];
    if (form !== undefined) {
        const textArea = form.getElementsByTagName("textarea")[0];
        await userInput(terminal, form, input);
        if (result != null) await addContentToTerminal(terminal, `${result}`);

        const box = textArea.getBoundingClientRect();
        resizeAndFocusTextArea(terminal, box.height, textArea);
    }
}

async function userInput(terminal, form, input) {
    const user = form.getElementsByTagName("p")[0];
    const p = document.createElement("p");
    p.innerHTML = input.replace("  ", " ");
    if (user !== undefined) p.innerHTML = `<span class="terminal-user">${user.innerText}</span>` + p.innerHTML;
    await addContentToTerminal(terminal, p);
}

function initialStripString(string) {
    let i;
    for (i = 0; i < string.length; i++)
        if (string.charCodeAt(i) > 32) break;
    return string.substring(i, string.length);
}

function resizeAndFocusTextArea(terminal, initialHeight, textArea) {
    setTimeout(() => {
        const form = terminal.getElementsByTagName("form")[0];
        if (form !== undefined) {
            form.style.flexDirection = "";
            if (textArea.value !== '' && textArea.scrollHeight / initialHeight > 1)
                form.style.flexDirection = "column";
        }
        textArea.style.height = "auto";
        textArea.style.height = textArea.scrollHeight + "px";
        textArea.focus();
        terminal.scrollTop = terminal.scrollHeight;
    }, 0.0001);
}

function setContentToTerminal(terminal, content) {
    if (terminal === undefined) return;
    let form = terminal.getElementsByTagName("form")[0];
    let input = undefined;
    if (form !== undefined) input = form.cloneNode(true);
    terminal.innerHTML = "";
    addContentToTerminal(terminal, content);
    if (input !== undefined) terminal.appendChild(input);
}

function addContentToTerminal(terminal, content) {
    if (terminal === undefined) return;
    let form = terminal.getElementsByTagName("form")[0];
    if (form !== undefined) terminal.removeChild(form);
    if (typeof content == "string") {
        const p = document.createElement("p");
        p.innerText = content;
        terminal.appendChild(p);
    } else terminal.appendChild(content);
    if (form !== undefined) terminal.appendChild(form);
    terminal.scrollTop = terminal.scrollHeight;
}

async function handleKeyTextArea(event, terminal, initialHeight) {
    const form = terminal.getElementsByTagName("form")[0];
    if (form === undefined) return;
    const textArea = form.getElementsByTagName("textarea")[0];
    const char = event.key;
    const content = initialStripString(textArea.value);
    if (char === "Enter") {
        if (content.length > 0) await sendInput(terminal, content);
        else await userInput(terminal, form, "&nbsp;");
        textArea.value = null;
        event.preventDefault();
    }
    else if (char === "ArrowUp") {
        terminalIndex = Math.max(0, --terminalIndex);
        textArea.value = previousInputs[terminalIndex];
    }
    else if (char === "ArrowDown")
        if (++terminalIndex >= previousInputs.length) {
            terminalIndex = previousInputs.length;
            textArea.value = null;
        } else textArea.value = previousInputs[terminalIndex];
    else if (char === "c" && pressingCtrl) {
        await userInput(terminal, form, content + "^C&nbsp;");
        terminalIndex = previousInputs.length;
        textArea.value = null;
    }
    if (textArea.value === "undefined") textArea.value = null;
    resizeAndFocusTextArea(terminal, initialHeight, textArea);
}

async function initTerminals() {
    const terminals = document.getElementsByClassName('terminal');
    for (let terminal of terminals) {
        terminal.addEventListener('mousewheel', event => {
            if (!pressingCtrl && !isFromAndroid()) return;
            event.preventDefault();
            let tmp = terminal.style.fontSize;
            if (tmp === '') tmp = getComputedStyle(terminal).fontSize;
            let fontSize = parseFloat(tmp.replace("px", "")) + event.deltaY / -500;
            fontSize = Math.max(Math.min(fontSize, 50), 1);
            terminal.style.fontSize = fontSize + "px";
        });
        terminal.scrollTop = terminal.scrollHeight;

        const textArea = terminal.getElementsByTagName("textarea")[0];
        if (textArea === undefined) continue;
        const initialHeight = Math.round(textArea.getBoundingClientRect().height);
        textArea.addEventListener('keydown', event => {
            clickedElement = textArea;
            handleKeyTextArea(event, terminal, initialHeight);
        });
        document.addEventListener('keypress', event => {
            if (event.keyCode < 33) return;
            if (clickedElement !== terminal && clickedElement.parentElement !== terminal) return;
            textArea.value += event.key;
            handleKeyTextArea(event, terminal, initialHeight);
        });
        document.addEventListener('click', event => clickedElement = event.target);
    }
}

window.addEventListener('keydown', event => {
    if (event.key === 'Control') pressingCtrl = true;
});

window.addEventListener('keyup', event => {
    if (event.key === 'Control') pressingCtrl = false;
});