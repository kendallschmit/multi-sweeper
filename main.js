const http = require('http');
const fs = require('fs');
const url = require('url');

const w = 30;
const h = 16;

// general server stuff
const serveFile = (req, res) => {
    const url = "./" + req.url;
    let ext = url.split('.').pop();
    if (ext == 'png') {
        fs.readFile(url, (err, contents) => {
            if (!err) {
                res.writeHead(200, { 'Content-Type': 'image/png' });
                res.end(contents, 'binary');
            }
            else {
                res.end();
            }
        });
    }
    else {
        fs.readFile(url, "utf8", (err, contents) => {
            if (!err) {
                res.writeHead(200, {});
                res.write(contents);
                res.end();
            }
            else {
                res.end();
            }
        });
    }
};

// game helpers
const makeTile = (row, column) => {
    return {
        'row': row,
        'column': column,
        'value': ' ',
        'revealed': false,
        'flag': 'no',//, 'yes', 'maybe'
        'color': 'ff1111'
    };
}

const getNeighbors = (tile) => {
    row = tile.row;
    column = tile.column;
    neighbors = []
    for (let r = Math.max(row - 1, 0); r <= Math.min(row + 1, h - 1); r++) {
        for (let c = Math.max(column - 1, 0);
                c <= Math.min(column + 1, w - 1);
                c++) {
            neighbors.push(board[r][c]);
        }
    }
    return neighbors;
}

const generateBoard = () => {
    board = []
    // board
    for (let r = 0; r < h; r++) {
        let row = [];
        for (let c = 0; c < w; c++) {
            row.push(makeTile(r, c));
        }
        board.push(row);
    }
    // mines
    let positions = []
    for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
            positions.push({ 'row': r, 'column': c });
        }
    }
    for (let n = 0; n < mines; n++) {
        i = Math.floor(Math.random() * positions.length);
        p = positions.splice(i, 1)[0];
        board[p.row][p.column].value = 'b';
    }
    generateNumbers();
    dead = false;
    firstClick = true;
}

const generateNumbers = () => {
    // calculate numbers
    for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
            let t = board[r][c];
            if (t.value != 'b') {
                t.value = 0;
                let neighbors = getNeighbors(t);
                neighbors.forEach((n) => {
                    t.value += n.value == 'b';
                });
            }
        }
    }
}

const printBoard = () => {
    board.forEach((row) => {
        console.log(row.map(t => t.value).join(''));
    });
}

// gameplay logic
const revealTile = (tile) => {
    if (tile.revealed) {
        return;
    }
    if (firstClick && tile.value == 'b') {
        tile.value = ' ';
        let done = false;
        for (let r = 0; r < h && !done; r++) {
            for (let c = 0; c < w && !done; c++) {
                let t = board[r][c];
                if (!(tile.row == r && tile.column == c) && t.value != 'b') {
                    t.value = 'b';
                    done = true;
                }
            }
        }
        generateNumbers();
    }
    firstClick = false;
    if (tile.value == 'b') {
        dead = true;
        sendLose();
        sendAllTiles(null, true);
    }
    else {
        tile.revealed = true;
        const r = tile.row;
        const c = tile.column;
        if (tile.value == 0) {
            let neighbors = getNeighbors(tile);
            neighbors.forEach((n) => {
                revealTile(n);
            });
        }
        sendTile(tile);
    }
}

const checkVictory = () => {
    let problemFound = false;
    let flags = 0;
    for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
            t = board[r][c];
            if (t.value == 'b' && t.flag != 'yes'
                    || t.value != 'b' && t.flag != 'no'
                    || t.value != 'b' && !t.revealed) {
                problemFound = true;
            }
            if (t.flag == 'yes') {
                flags += 1;
            }
        }
    }
    notifyClients('flags ' + flags.toString());
    if (!problemFound) {
        dead = true;
        sendWin();
        sendAllTiles();
    }
}

// client interaction
let sseResponses = [];
const notifyClients = (message) => {
    sseResponses.forEach((res) => {
        res.write('data: ' + message + '\n\n');
    });
};

const sendWin = () => {
    notifyClients('win');
}

const sendLose = () => {
    notifyClients('lose');
}

const sendNew = () => {
    notifyClients('new');
}

const sendTile = (tile, response=null) => {
    let c = ' ';
    if (dead) {
        if (tile.flag == 'yes') {
            if (tile.value == 'b') {
                c = 'f,' + tile.color;
            }
            else {
                c = 'x';
            }
        }
        else if (tile.flag == 'maybe') {
            c = tile.value == ('b' ? 'b' : '?') + ',' + tile.color;
        }
        else {
            c = tile.value;
        }
    }
    else {
        if (tile.revealed) {
            c = tile.value;
        }
        else {
            if (tile.flag == 'no') {
                c = ' ';
            }
            else if (tile.flag == 'maybe') {
                c = '?,' + tile.color;
            }
            else if (tile.flag == 'yes') {
                c = 'f,' + tile.color;
            }
        }
    }
    let data = `${tile.row},${tile.column},${c},`
    if (response) {
        response.write(`data: ${data}\n\n`);
    }
    else {
        notifyClients(data);
    }
}

const sendAllTiles = (response=null) => {
    for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
            sendTile(board[r][c], response);
        }
    }
}

// game starts here
let mines = 99;
var board = null;
var dead = false;
var firstClick = true;
generateBoard();

http.createServer((req, res) => {
    const p = url.parse(req.url, true);

    // new game
    if (p.pathname == '/new') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end();
        generateBoard();
        generateNumbers();
        sendNew();
        sendAllTiles();
    }
    // sse
    else if (p.pathname == '/sse') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache'
        });
        res.on('close', (e) => {
            const i = sseResponses.indexOf(res);
            if (i != -1) {
                sseResponses.splice(i, 1);
            }
        });
        sseResponses.push(res);
        sendAllTiles(res);
    }
    // init
    else if (p.pathname == '/init') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify({ }));
        res.end();
    }
    // reveal
    else if (p.pathname == '/reveal') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write('okay');
        res.end();
        const r = parseInt(p.query['row']);
        const c = parseInt(p.query['column']);
        const tile = board[r][c];
        if (!dead && tile.flag == 'no') {
            revealTile(tile);
            if (!dead) {
            checkVictory();
            }
        }
    }
    // flag
    else if (p.pathname == '/flag') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write('okay');
        res.end();
        const r = parseInt(p.query['row']);
        const c = parseInt(p.query['column']);
        const color = p.query['color'];
        const tile = board[r][c];
        if (!dead && !tile.revealed) {
            if (tile.flag == 'no') {
                tile.flag = 'yes';
            }
            else if (tile.flag == 'yes') {
                tile.flag = 'maybe';
            }
            else if (tile.flag == 'maybe') {
                tile.flag = 'no';
            }
            tile.color = color;
            sendTile(tile);
            checkVictory();
        }
    }
    // resource
    else {
        serveFile(req, res);
    }
}).listen(8080);
