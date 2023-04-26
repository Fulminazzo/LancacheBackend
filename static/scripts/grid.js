function chooseTile(options) {
    return pickGeneral(options);
}

/*
    Grid class.
 */
class Grid {
    constructor(width, height, cellWidth, cellHeight) {
        this.width = width;
        this.height = height;
        this.cellWidth = cellWidth;
        this.cellHeight = cellHeight;
        this.cells = [];

        this.#initializeCells();
    }

    resizeGrid(width, height) {
        this.width = width;
        this.height = height;
        let cells = [];
        for (let y = 0; y < this.height / this.cellHeight; y++) {
            let tmpCells = [];
            for (let x = 0; x < this.width / this.cellWidth; x++) {
                let cell = this.cells[y];
                if (cell !== undefined) cell = cell[x];
                if (cell === undefined) cell = this.#createNewCell(x, y);
                tmpCells.push(cell);
            }
            cells.push(tmpCells);
        }
        this.cells = cells;
        this.cells.flatMap(a => a).forEach(c => c.calculateOptions(this));
    }

    collapseRandomCell(tileManager) {
        let cell = this.#pickRandomCell();
        let tile = chooseTile(tileManager.tiles);
        cell.forceCollapseCell(tile, this);
        return cell;
    }

    #pickRandomCell() {
        let y = Math.round(this.cells.length / 2);
        let x = Math.round(this.cells[y].length / 2);
        return this.cells[y][x];
    }

    #initializeCells() {
        for (let y = 0; y < this.height / this.cellHeight; y++) {
            let tmpCells = [];
            for (let x = 0; x < this.width / this.cellWidth; x++)
                tmpCells.push(this.#createNewCell(x, y));
            this.cells.push(tmpCells);
        }
        this.cells.flatMap(a => a).forEach(c => c.calculateOptions(this));
    }

    #createNewCell(x, y) {
        return new Cell(x * this.cellWidth, y * this.cellWidth, this.cellWidth, this.cellHeight);
    }

    getNeighbours(cell) {
        let xIndex = cell.x / this.cellWidth;
        let yIndex = cell.y / this.cellHeight;
        let neighbours = [];
        // UP
        if (yIndex - 1 >= 0)
            neighbours.push(this.cells[yIndex - 1][xIndex]);
        else neighbours.push(null);
        // RIGHT
        if (xIndex + 1 < this.width / this.cellWidth)
            neighbours.push(this.cells[yIndex][xIndex + 1]);
        else neighbours.push(null);
        // DOWN
        if (yIndex + 1 < this.height / this.cellHeight)
            neighbours.push(this.cells[yIndex + 1][xIndex]);
        else neighbours.push(null);
        // LEFT
        if (xIndex - 1 >= 0)
            neighbours.push(this.cells[yIndex][xIndex - 1]);
        else neighbours.push(null);

        return neighbours;
    }

    getCells() {
        return this.cells;
    }
}

/*
    Cell Object.
 */
class Cell {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.tile = null;
        this.collapsed = false;
        this.options = 4;
        this.tries = 0;
    }

    draw(canvas) {
        if (!this.isCollapsed()) return false;
        if (this.tile === undefined || this.tile == null) return undefined;
        drawRotated(canvas, canvas.getContext('2d'), this.tile, this.x, this.y, this.width, this.height);
        return true;
    }

    undraw(wfCanvas) {
        let context = wfCanvas.canvas.getContext('2d');
        context.clearRect(this.x, this.y, this.x + this.width, this.y + this.height);

        if (!wfCanvas.showLines) return;
        wfCanvas.grid.getCells()
            .flatMap(e => e)
            .filter(c => !c.isCollapsed())
            .forEach(c => {
                drawLine(context, c.x, c.x, c.y, c.y + c.height);
                drawLine(context, c.x + c.width, c.x + c.width, c.y, c.y + c.height);
                drawLine(context, c.x, c.x + c.width, c.y, c.y);
                drawLine(context, c.x, c.x + c.width, c.y + c.height, c.y + c.height);
            });
    }

    collapse(wfCanvas) {
        let availableTiles = this.calculatePossibleTiles(wfCanvas.grid);
        if (availableTiles === undefined) return false;

        let tile = chooseTile(availableTiles.flatMap(t => t).map(o => wfCanvas.tileManager.getTiles()[o]));
        this.forceCollapseCell(tile, wfCanvas.grid);
        return true;
    }

    forceCollapseCell(tile, grid) {
        this.tile = tile;
        this.collapsed = true;
        this.options = 0;
        this.updateNeighbours(grid);
    }

    uncollapse(wfCanvas) {
        if (this.tries > 5) {
            this.tries = 0;
            wfCanvas.grid.getNeighbours(this)
                .filter(c => c != null && c.isCollapsed())
                .filter(c => {
                    let avT = c.calculatePossibleTiles(wfCanvas.grid);
                    return avT === undefined || avT.length <= 2;
                })
                .forEach(c => c.uncollapse(wfCanvas));
        } else {
            let availableTiles = this.calculatePossibleTiles(wfCanvas.grid);
            this.tries++;
            if (availableTiles === undefined || availableTiles.length <= 1)
                wfCanvas.grid.getNeighbours(this)
                    .filter(c => c != null && c.isCollapsed())
                    .filter(c => {
                        let avT = c.calculatePossibleTiles(wfCanvas.grid);
                        return avT === undefined || avT.length < 1;
                    })
                    .forEach(c => c.uncollapse(wfCanvas));
        }
        this.forceUncollapse(wfCanvas);
    }

    forceUncollapse(wfCanvas) {
        this.tile = null;
        this.collapsed = false;
        this.calculateOptions(wfCanvas.grid);
        this.undraw(wfCanvas);
    }

    calculatePossibleTiles(grid) {
        let neighbours = grid.getNeighbours(this);

        let types = ['DOWN', 'LEFT', 'UP', 'RIGHT'];
        for (let i = 0; i < types.length; i++)
            if (neighbours[i] != null && neighbours[i].isCollapsed() && neighbours[i].tile !== undefined)
                neighbours[i] = neighbours[i].tile.getOptions(types[i]);
            else neighbours[i] = null;

        neighbours = neighbours.filter(n => n != null);

        let tmp = neighbours[0];
        for (let i = 1; i < neighbours.length; i++)
            tmp = tmp.filter(t => neighbours[i].includes(t));

        return tmp;
    }

    updateNeighbours(grid) {
        grid.getNeighbours(this)
            .filter(c => c != null)
            .filter(c => !c.isCollapsed())
            .forEach(c => c.decOptions());
    }

    calculateOptions(grid) {
        this.options = grid.getNeighbours(this)
            .filter(c => c == null || !c.isCollapsed())
            .length;
    }

    decOptions() {
        this.options--;
    }

    isCollapsed() {
        return this.collapsed;
    }
}
