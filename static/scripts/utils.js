function drawLine(context, start_x, end_x, start_y, end_y) {
    context.strokeStyle = "#ffffff";
    context.beginPath();
    context.moveTo(start_x, start_y);
    context.lineTo(end_x, end_y);
    context.stroke();
}

function compareArrays(arr1, arr2) {
    for (let i = 0; i < arr1.length && i < arr2.length; i++)
        if (arr1[i] !== arr2[i]) return false;
    return true;
}

function pickGeneral(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function removeDuplicateTiles(tiles) {
    const tmp = [];
    tiles.forEach(t => {
        if (!tmp.find(t1 => compareImageData(t1.image_data, t.image_data)))
            tmp.push(t);
    })
    return tmp;
}

function rotateMatrix(matrix) {
    return matrix[0].map((val, index) => matrix.map(row => row[index]).reverse());
}