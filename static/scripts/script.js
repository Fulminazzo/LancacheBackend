let open = true;
let maximized = false;

function toggleSessionTerminal() {
    const sessionTerminal = document.getElementById('session-terminal');
    const dockerComposeLogs = document.getElementById('docker-compose-logs');
    const container = document.getElementById('container');
    if (sessionTerminal === undefined || dockerComposeLogs === undefined) return;
    for (let c of container.children) if (c !== sessionTerminal) c.style.display = "";
    if (open) {
        open = false;
        sessionTerminal.style.gridRow = "6 / 7";
        sessionTerminal.style.gridColumn = "";
        dockerComposeLogs.style.gridRow = "1 / 6";
        sessionTerminal.lastElementChild.style.display = "none";
    } else {
        open = true;
        sessionTerminal.style.gridRow = "";
        sessionTerminal.style.gridColumn = "";
        dockerComposeLogs.style.gridRow = "";
        sessionTerminal.lastElementChild.style.display = "";
    }
}

function toggleMaximizedSessionTerminal() {
    const sessionTerminal = document.getElementById('session-terminal');
    const container = document.getElementById('container');
    if (sessionTerminal === undefined || container === undefined) return;
    if (maximized) {
        maximized = false;
        for (let c of container.children)
            if (c !== sessionTerminal) c.style.display = "";
            else {
                c.style.gridRow = "";
                c.style.gridColumn = "";
                c.lastElementChild.style.display = "none";
            }
        if (open) open = false;
        toggleSessionTerminal();
    } else {
        maximized = true;
        for (let c of container.children)
            if (c !== sessionTerminal) c.style.display = "none";
            else {
                c.style.gridRow = "1 / 7";
                c.style.gridColumn = "1 / 3";
                c.lastElementChild.style.display = "";
            }
    }
}

async function createProgressBars() {
    const stats = document.getElementsByClassName("machine-stat")
    if (stats === undefined) return;
    for (let stat of stats)
        if (stat.id !== "") {
            let id = stat.id;
            const circle = stat.getElementsByTagName("circle");
            if (circle === undefined) continue;
            circle[0].style.stroke = `url(#${id}-gradient)`
        }
}

async function startScript() {
    if (isFromAndroid()) await initWFC();
    await startUpdatingThreads();
    await initTerminals();
    toggleSessionTerminal();
    await createProgressBars();
}

window.addEventListener('load', () => startScript());