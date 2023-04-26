let resizedWidth = 50;
let resizedHeight = 50;

function drawRotated(canvas, context, tile, x, y, width = 50, height = 50) {
    let image = tile.image;
    let originX = x + width / 2;
    let originY = y + height / 2;

    context.save();
    context.translate(originX, originY);
    context.rotate(tile.rotation * Math.PI / 180);
    context.translate(-originX, -originY);
    context.drawImage(image, x, y, width, height);
    context.restore();
}

function compareImageData(data1, data2) {
    for (let y = 0; y < data1.length && y < data2.length; y++)
        for (let x = 0; x < data1[y].length && x < data2[y].length; x++)
            for (let i = 0; i < data1[y][x].length && i < data2[y][x].length; i++)
                if (data1[y][x][i] !== data2[y][x][i]) return false;
    return true;
}

function compactRawData(rawData, width, height) {
    let imgData = [];
    for (let y = 0; y < height * 4; y += 4) {
        let tmpData = [];
        for (let x = 0; x < width * 4; x += 4)
            tmpData.push([
                rawData[y * height + x],
                rawData[y * height + x + 1],
                rawData[y * height + x + 2]
            ]);
        imgData.push(tmpData);
    }
    return imgData;
}

function extractImageData(img, fun) {
    let context = getTmpCanvas().getContext('2d');
    context.drawImage(img, 0, 0, resizedWidth, resizedHeight);
    let rawData = context.getImageData(0, 0, resizedWidth, resizedHeight);
    let rawPixels = Array.from(rawData.data);
    return compactRawData(rawPixels, resizedWidth, resizedHeight);
}

function getImageFromUrl(src) {
    return new Promise(function(res, rej) {
        let image = new Image();
        function loadCallback() {
            image.removeEventListener("load", loadCallback);
            image.removeEventListener("error", errorCallback);
            res(image);
        }
        function errorCallback() {
            image.removeEventListener("load", loadCallback);
            image.removeEventListener("error", errorCallback);
            rej(image);
        }
        image.addEventListener("load", loadCallback);
        image.addEventListener("error", errorCallback);
        image.src = src;
    });
}

function getTmpCanvas() {
    let canvas = document.getElementById("tmp_canvas");
    if (canvas === null) {
        canvas = document.createElement('canvas');
        canvas.id = "tmp_canvas"
    }
    return canvas;
}

function getLateralEdge(imgData, index) {
    return imgData.map(i => i[index]);
}

function intArrayToString(array) {
    if (array.length > 1 && Array.isArray(array[0]))
        return array.map(a => intArrayToString(a)).join("");
    else return array.map(n => n.toString(16)).join("");
}