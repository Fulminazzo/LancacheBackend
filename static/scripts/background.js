async function initWFC() {
    const folder = [];

    for (let i = 0; i < 13; i++)
        folder.push("../static/tiles/" + i + ".png");

    let cellSize = 50;
    cellSize = 65 - ((Math.round(window.innerWidth / 100 / 5)) * 5);

    const num = 50;
    const width = num;
    const height = num;
    const cellWidth = cellSize;
    const cellHeight = cellSize;

    const backgroundCanvas = document.getElementById("background");
    if (backgroundCanvas == null) return;

    const wfCanvas = new WFCanvas(folder, width, height, cellWidth, cellHeight, backgroundCanvas);
    wfCanvas.setAutomaticRedraw(true);
    wfCanvas.setFixedSize(false);
    wfCanvas.setDrawTime(0);

    await wfCanvas.initializeDrawing()
}
