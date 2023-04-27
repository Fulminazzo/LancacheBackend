let pressingCtrl = false;
let clickedElement = undefined;

let previousInputs = [];
let terminalIndex = -1;

let stopCommand = false;
let uniqueId = null;

let initialHeight = 0;
const query = 'terminal/?'

async function fetchTerminalJSONData(data) {
    return await fetchGeneralJSONData(query + data);
}

async function printOutput(terminal, output) {
    if (output.length !== 0) {
        let string = ""
        if (typeof output === "string") string = output;
        else for (let s of output) string += s;
        await addContentToTerminal(terminal, string);
    }
}

async function writeOutput(terminal) {
    if (uniqueId !== null) {
        if (stopCommand) {
            await fetchTerminalJSONData(`uuid=${uniqueId}&stop`)
            stopCommand = false;
            return;
        }
        let output = await fetchTerminalJSONData(`uuid=${uniqueId}&output&clear`);
        if (output === null) return;
        await printOutput(terminal, output.data["response"]);
        if (output.data["finished"] === false) await writeOutput(terminal);
    }
}

async function requestAndSetUser(terminal) {
    if (uniqueId == null) return;
    const output = await fetchTerminalJSONData(`uuid=${uniqueId}&userdata`);
    if (output === null) return;
    const data = output.data;
    setTerminalUser(terminal, `${data.hostname}@${data.username} ${data.dir}$&nbsp`);
}

function setTerminalUser(terminal, content) {
    let terminalUser = terminal.querySelectorAll(".terminal-user");
    terminalUser = terminalUser[terminalUser.length - 1];
    if (terminalUser === undefined) return;
    terminalUser.innerHTML = content;
}

async function sendInput(terminal, input) {
    previousInputs.push(input);
    terminalIndex = previousInputs.length;

    const query = uniqueId != null ? `uuid=${uniqueId}&command=` : "pass=";
    const output = await fetchTerminalJSONData(`${query + btoa(input)}`);
    if (output === null) return;
    const data = output.data;
    const form = terminal.getElementsByTagName("form")[0];
    if (form === undefined) return;

    const textArea = form.getElementsByTagName("textarea")[0];
    let response = data[Object.keys(data)[0]];

    if (data["uuid"] !== undefined) {
        uniqueId = data["uuid"];
        textArea.classList.remove("password");
        await requestAndSetUser(terminal);
        response = "Successfully connected.";
    } else if (data["exit"] === true) {
        uniqueId = null;
        setTerminalUser(terminal, "");
        textArea.classList.add("password");
    } else if (uniqueId !== null) await userInput(terminal, form, input);

    if (response === "request-userdata") await requestAndSetUser(terminal);
    else await printOutput(terminal, response);

    if (data["finished"] === false) writeOutput(terminal);

    const box = textArea.getBoundingClientRect();
    resizeAndFocusTextArea(terminal, box.height, textArea);
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
    resizeTextArea(terminal, initialHeight, textArea);
    setTimeout(() => {
        textArea.focus();
        terminal.scrollTop = terminal.scrollHeight;
    }, 0.0001);
}

function resizeTextArea(terminal, initialHeight, textArea) {
    const form = terminal.getElementsByTagName("form")[0];
    let terminalUser = terminal.querySelectorAll(".terminal-user");
    terminalUser = terminalUser[terminalUser.length - 1];
    let fontSize = getComputedStyle(terminal).fontSize;
    fontSize = parseInt(fontSize.substring(0, fontSize.length - 2));

    setTimeout(() => {
        if (form !== undefined) {
            form.style.flexDirection = "";
            if (textArea.value !== '' && textArea.scrollHeight / initialHeight > 1)
                form.style.flexDirection = "column";
            const offset = terminalUser.getBoundingClientRect().height - fontSize;
            if (offset > 5) form.style.flexDirection = "column";
        }
        textArea.style.height = "auto";
        textArea.style.height = textArea.scrollHeight + "px";
    }, 0.0001);
}

function setContentToTerminal(terminal, content) {
    if (terminal === undefined) return;
    const form = terminal.getElementsByTagName("form")[0];
    let input;
    if (form !== undefined) input = form.cloneNode(true);
    terminal.innerHTML = "";
    addContentToTerminal(terminal, content);
    if (input !== undefined) terminal.appendChild(input);
}

function addContentToTerminal(terminal, content) {
    if (terminal === undefined) return;
    const form = terminal.getElementsByTagName("form")[0];
    if (form !== undefined) terminal.removeChild(form);
    if (typeof content == "string") {
        if (content.startsWith("[2J[H")) {
            terminal.innerHTML = "";
            content = content.substring("[2J[H".length, content.length);
        }
        const p = document.createElement("p");
        p.innerText = content;
        terminal.appendChild(p);
    } else terminal.appendChild(content);
    if (form !== undefined) terminal.appendChild(form);
    terminal.scrollTop = terminal.scrollHeight;
}

async function handleKeyTextArea(event, terminal) {
    const form = terminal.getElementsByTagName("form")[0];
    if (form === undefined) return;

    const textArea = form.getElementsByTagName("textarea")[0];
    const char = event.key;
    const content = initialStripString(textArea.value);

    if (char === "Enter") {
        if (content.length > 0) await sendInput(terminal, content);
        else await userInput(terminal, form, "&nbsp;");
        textArea.value = null;
    } else if (char === "ArrowUp") {
        terminalIndex = Math.max(0, --terminalIndex);
        textArea.value = previousInputs[terminalIndex];
    } else if (char === "ArrowDown")
        if (++terminalIndex >= previousInputs.length) {
            terminalIndex = previousInputs.length;
            textArea.value = null;
        } else textArea.value = previousInputs[terminalIndex];
    else if (char === "c" && pressingCtrl) {
        await userInput(terminal, form, content + "^C&nbsp;");
        stopCommand = true;
        terminalIndex = previousInputs.length;
        textArea.value = null;
    }

    if (textArea.value === "undefined") textArea.value = null;
    resizeAndFocusTextArea(terminal, initialHeight, textArea);
}

async function initTerminals() {
    const terminals = document.getElementsByClassName('terminal');
    for (let terminal of terminals) {
        terminal.scrollTop = terminal.scrollHeight;

        terminal.addEventListener('mousewheel', event => {
            if (!pressingCtrl && !isFromAndroid()) return;
            event.preventDefault();
            let tmp = terminal.style.fontSize;
            if (tmp === '') tmp = getComputedStyle(terminal).fontSize;
            let fontSize = parseFloat(tmp.replace("px", "")) + event.deltaY / -500;
            fontSize = Math.max(Math.min(fontSize, 50), 1);
            terminal.style.fontSize = fontSize + "px";
        });

        const textArea = terminal.getElementsByTagName("textarea")[0];
        if (textArea === undefined) continue;
        initialHeight = Math.round(textArea.getBoundingClientRect().height);

        textArea.addEventListener('keydown', event => {
            clickedElement = textArea;
            handleKeyTextArea(event, terminal);
        });
    }
}

window.addEventListener('resize', () => {
    const terminals = document.getElementsByClassName('terminal');
    for (let terminal of terminals) {
        const textArea = terminal.getElementsByTagName("textarea")[0];
        if (textArea === undefined) continue;
        resizeTextArea(terminal, initialHeight, textArea);
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Control') pressingCtrl = true;
    if (event.keyCode < 33) return;
    const terminals = document.getElementsByClassName('terminal');
    for (let terminal of terminals) {
        if (clickedElement !== terminal && clickedElement !== undefined && clickedElement.parentElement !== terminal) continue;
        const textArea = terminal.getElementsByTagName("textarea")[0];
        if (textArea === undefined) continue;
        textArea.value += event.key;
        handleKeyTextArea(event, terminal);
        return;
    }
});

document.addEventListener('keyup', event => {
    if (event.key === 'Control') pressingCtrl = false;
});

document.addEventListener('click', event => {
    clickedElement = event.target;
    const textArea = clickedElement.getElementsByTagName("textarea")[0];
    if (textArea === undefined || window.getSelection().toString() !== "") return;
    resizeAndFocusTextArea(clickedElement, initialHeight, textArea)
});