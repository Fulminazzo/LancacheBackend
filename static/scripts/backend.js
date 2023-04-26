let prevDatas = {}

async function fetchGeneralJSONData(data) {
    try {
        const response = await fetch(`//10.0.0.50:98/api/${data}`);
        if (response.headers.get("content-type") !== "application/json") return;
        const jsonData = await response.json();
        if (jsonData == null) return jsonData;
        return jsonData;
    } catch (error) {
        return "error";
    }
}

async function updateGeneralTerminal(terminalId) {
    const terminal = document.getElementById(terminalId);
    if (terminal == null) return "error";
    const data = await fetchGeneralJSONData(terminalId);
    if (data == null) return "error";
    else if (data === "error") return "error";
    if (prevDatas[terminalId] !== undefined && JSON.stringify(prevDatas[terminalId].data) === JSON.stringify(data.data)) return "same";
    else prevDatas[terminalId] = data;
    let innerHTML = "";
    for (let d of data.data) {
        d = d = d.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
        innerHTML += `${d}`;
    }
    setContentToTerminal(terminal, innerHTML);
    return "success";
}

function formatBytes(num) {
    const units = ['B', 'KB', 'MB', 'G'];
    let count = 0;
    while (num > 1024) {
        num /= 1024;
        count++;
    }
    return Math.round(num) + units[count];
}

function updateStorage(stat, data) {
    const paragraphs = stat.getElementsByTagName('p');
    let percentage = data['used'] / data['total'];
    if (percentage < 0 || percentage > 100 || isNaN(percentage)) return;
    paragraphs[0].innerText = Math.round(percentage * 100) + "%";
    paragraphs[1].innerText = `${Math.round(data['used'] / 1024)}GB / ${Math.round(data['total'] / 1024)}GB (${Math.round(data['available'] / 1024)}GB)`;
    const circle = stat.getElementsByTagName('circle')[0];
    circle.style.strokeDasharray = `${Math.max(1, Math.round(275 * percentage))}% 1000`;
}

function updateNetwork(stat, data) {
    const paragraphs = stat.getElementsByTagName('p');
    data = parseInt(data);
    const total = 2 ** 30 / 8;
    let percentage = data / total;
    if (percentage < 0 || percentage > 100 || isNaN(percentage)) return;
    paragraphs[0].innerText = Math.round(percentage * 100) + "%";
    paragraphs[1].innerText = formatBytes(data) + "/s";
    const circle = stat.getElementsByTagName('circle')[0];
    circle.style.strokeDasharray = `${Math.max(1, Math.round(275 * percentage))}% 1000`;
}

async function updateGeneralStat(statId, func) {
    const stat = document.getElementById(statId);
    if (stat == null) return "error";
    const data = await fetchGeneralJSONData(statId + "-stat");
    if (data === undefined) return "error";
    else if (data === "error") return "error";
    if (prevDatas[statId] !== undefined && JSON.stringify(prevDatas[statId].data) === JSON.stringify(data.data)) return "same";
    else prevDatas[statId] = data;
    func(stat, data.data)
    return "success";
}

async function updateThread(func, args, time) {
    if (typeof args == "string") args = [args];
    let success = await func(...args);
    if (success === "error") time *= 2;
    else if (success === "same") time += 500;
    else time = 1000;
    if (time < 1000) time = 1000;
    else if (time > 600000) time = 600000;
    setTimeout(() => updateThread(func, args, time), time);
}

async function startUpdatingThreads() {
    await updateThread(updateGeneralStat, ["storage", updateStorage], 1);
    await updateThread(updateGeneralStat, ["download", updateNetwork], 1);
    await updateThread(updateGeneralStat, ["upload", updateNetwork], 1);
    await updateThread(updateGeneralTerminal, "docker-stats", 1);
    await updateThread(updateGeneralTerminal, "docker-compose-logs", 1);
}
