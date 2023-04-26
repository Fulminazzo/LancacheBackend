/*
    Tile Manager Class.
 */
class TileManager {
    constructor(folder) {
        this.tiles = [];
        // Add normal tiles.
        for (let file of folder) this.tiles.push(new Tile(file));

        // Add rotated tiles.
        let len = this.tiles.length;
        for (let i = 0; i < len; i++)
            for (let r = 1; r < 4; r++)
                this.tiles.push(new Tile(this.tiles[i].image_path, r));

        setTimeout(() => {

        }, 100);
    }

    async initialize() {
        for (let tile of this.tiles)
            await tile.initialize();

        this.tiles = removeDuplicateTiles(this.tiles);
        this.#addValidOptions();
    }

    #addValidOptions() {
        for (let tile of this.tiles)
            for (let i = 0; i < this.tiles.length; i++) {
                let t = this.tiles[i];
                if (compareArrays(tile.up_edges, t.down_edges) && !tile.up_options.includes(i))
                    tile.up_options.push(i);
                if (compareArrays(tile.right_edges, t.left_edges) && !tile.right_options.includes(i))
                    tile.right_options.push(i);
                if (compareArrays(tile.down_edges, t.up_edges) && !tile.down_options.includes(i))
                    tile.down_options.push(i);
                if (compareArrays(tile.left_edges, t.right_edges) && !tile.left_options.includes(i))
                    tile.left_options.push(i);
            }
    }

    getTiles() {
        return this.tiles;
    }
}

/*
    Tile Object.
 */
class Tile {
    constructor(image_path, rotation = 0) {
        this.image_path = image_path;
        this.image = null;
        this.up_edges = null;
        this.up_options = [];
        this.right_edges = null;
        this.right_options = [];
        this.down_edges = null;
        this.down_options = [];
        this.left_edges = null;
        this.left_options = [];
        this.rotation = rotation;
    }

    async initialize() {
        this.image = await getImageFromUrl(this.image_path);
        this.image_data = extractImageData(this.image);
        this.rotate(this.rotation);
        this.calculateEdges();
    }

    getOptions(type) {
        switch (type.toUpperCase()) {
            case 'UP': {return this.up_options;}
            case 'RIGHT': {return this.right_options;}
            case 'DOWN': {return this.down_options;}
            case 'LEFT': {return this.left_options;}
        }
        return [];
    }

    calculateEdges() {
        this.up_edges = this.image_data[0].map(a => intArrayToString(a));
        this.right_edges = getLateralEdge(this.image_data, this.image_data.length - 1).map(a => intArrayToString(a));

        this.down_edges = this.image_data[this.image_data.length - 1].map(a => intArrayToString(a));
        this.left_edges = getLateralEdge(this.image_data, 0).map(a => intArrayToString(a));
    }

    rotate(angle) {
        if (angle % 90 !== 0) angle *= 90;
        this.rotation = angle;
        angle /= 90;
        for (let i = 0; i < angle; i++)
            this.image_data = rotateMatrix(this.image_data);
        this.calculateEdges();
    }

    getImage() {
        return this.image;
    }
}