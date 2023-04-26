/*
    WFCanvas Class.
 */
class WFCanvas {
    constructor(folder, width, height, cellWidth, cellHeight, canvas, fixedSize = true) {
        this.folder = folder;
        this.width = width;
        this.height = height;
        this.cellWidth = cellWidth;
        this.cellHeight = cellHeight;

        this.canvas = canvas;
        this.canvas.width = width;
        this.canvas.height = height;

        this.fixedSize = fixedSize;
        this.showLines = true;
        this.autoFix = true;

        this.drawTime = 125 / 2;
    }

    async initializeDrawing() {
        this.tileManager = new TileManager(this.folder);
        await this.tileManager.initialize();

        this.grid = new Grid(this.width, this.height, this.cellWidth, this.cellHeight);

        this.drawLines();

        window.addEventListener('resize', () => this.resizeCanvas());

        this.resizeCanvas();

        this.grid.collapseRandomCell(this.tileManager).draw(this.canvas);

        this.drawCanvas();
    }

    resizeCanvas() {
        if (this.fixedSize || this.grid === undefined) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.drawLines();
        this.grid.resizeGrid(this.canvas.width, this.canvas.height);
        this.drawCanvas();
    }

    drawCanvas() {
        let sorted = this.grid.getCells()
            .flatMap(a => a)
            .filter(c => !c.isCollapsed())
            .sort((c1, c2) => c1.options - c2.options)
        let cell = this.#pickCell(sorted.filter(c => c.options === sorted[0].options));

        if (cell !== undefined && !cell.collapse(this) && this.autoFix) this.fixCell(cell);

        for (let c of this.grid.getCells().flatMap(a => a).filter(c => c.isCollapsed()))
            if (c.draw(this.canvas) === undefined && this.autoFix) this.fixCell(c);

        if (this.grid.getCells().flatMap(a => a).filter(c => !c.isCollapsed()).length !== 0)
            setTimeout(() => this.drawCanvas(), this.drawTime);
    }

    fixCell(cell) {
        cell.collapsed = false;
        this.grid.getNeighbours(cell)
            .filter(c => c != null)
            .forEach(c => c.uncollapse(this));
        cell.uncollapse(this);
    }

    drawLines() {
        if (!this.showLines) return;
        let context = this.canvas.getContext('2d');

        for (let x = this.cellWidth; x < this.canvas.width; x += this.cellWidth)
            drawLine(context, x, x, 0, this.canvas.height);

        for (let y = this.cellHeight; y < this.canvas.height; y += this.cellHeight)
            drawLine(context, 0, this.canvas.width, y, y);
    }

    setDrawTime(drawTime) {
        this.drawTime = drawTime;
    }

    setFixedSize(fixedSize) {
        this.fixedSize = fixedSize;
        this.resizeCanvas();
    }

    setAutomaticRedraw(automaticRedraw) {
        this.autoFix = automaticRedraw;
    }

    setDrawLines(showLines) {
        this.showLines = showLines;
    }

    #pickCell(sorted) {
        return pickGeneral(sorted);
    }
}