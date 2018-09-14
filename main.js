const http = require('http');
const fs = require('fs');
const url = require('url');

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

// SHORT MESSAGES
// new width,height,mines
//
// reveal: row,column,number
// explode: row,column
// flag: row,column,color
// mark: row,column,color
// clear: row,column
// incorrect: row,column
//
// alive: alive
// flag-count: flagCount
//
// REQUESTS
// new: width,height,mines
// reveal: row,column
// flag: row,column,color
// mark: row,column,color
// clear: row,columnr

// network stuff
var clientResponses = [];
http.createServer((req, res) => {
    const p = url.parse(req.url, true);
    // new game
    if (p.pathname == '/new') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end();
        handleNewRequest(p);
    }
    else if (p.pathname == '/reveal') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end();
        handleRevealRequest(p); }
    else if (p.pathname == 'flag') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end();
        handleFlagRequest(p);
    }
    else if (p.pathname == 'mark') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end();
        handleMarkRequest(p);
    }
    else if (p.pathname == 'clear') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end();
        handleClearRequest(p);
    }
    else if (p.pathname == '/sse') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache'
        });
        res.on('close', (e) => {
            const i = clientResponses.indexOf(res);
            if (i != -1) {
                clientResponses.splice(i, 1);
            }
        });
        clientResponses.push(res);
        handleSseRequest(p, res);
    }
    else {
        serveFile(req, res);
    }
}).listen(8080);

const notifyClient = (message, client=null) => {
    console.log('notify');
    if (client) {
        console.log('event:', message.event);
        console.log('data:', message.data);
        client.write('event: ' + message.event + '\n');
        client.write('data: ' + message.data + '\n\n');
    }
    else {
        clientResponses.forEach((res) => {
            console.log('event:', message.event);
            console.log('data:', message.data);
            res.write('event: ' + message.event + '\n');
            res.write('data: ' + message.data + '\n\n');
        });
    }
};

const makeNewEvent = (width, height, mines) => {
    return {
        'event': 'new',
        'data': `${width},${height},${mines}`
    };
};

const makeRevealEvent = (row, column, number) => {
    return {
        'event': 'reveal',
        'data': `${row},${column},${number}`
    };
};

const makeExplodeEvent = (row, column) => {
    return {
        'event': 'explode',
        'data': `${row},${column}`
    };
};

const makeFlagEvent = (row, column, color) => {
    return {
        'event': 'flag',
        'data': `${row},${column},${color}`
    };
};

const makeMarkEvent = (row, column, color) => {
    return {
        'event': 'mark',
        'data': `${row},${column},${color}`
    };
};

const makeClearEvent = (row, column) => {
    return {
        'event': 'clear',
        'data': `${row},${column}`
    };
};

const makeIncorrectEvent = (row, column) => {
    return {
        'event': 'incorrect',
        'data': `${row},${column},${color}`
    };
};

const makeAliveEvent = (alive) => {
    return {
        'event': 'alive',
        'data': alive ? 'true' : 'false'
    };
};

const makeFlagCountEvent = (flagCount) => {
    return {
        'event': 'flag-count',
        'data': `${flagCount}`
    };
};

// globals
var width = 10;
var height = 10;
var mines = 20;

var alive = true;
var flagCount = 0;
var board = null;

// game logic
const makeTile = (row, column) => {
    return {
        'row': row,
        'column': column,
        'bomb': false,
        'revealed': false,
        'flag': null,
        'mark': null
    };
};

const getNeighbors = (tile) => {
    let row = tile.row;
    let column = tile.column;
    let neighbors = []
    for (let r = Math.max(row - 1, 0);
            r <= Math.min(row + 1, height - 1);
            r++) {
        for (let c = Math.max(column - 1, 0);
                c <= Math.min(column + 1, width - 1);
                c++) {
            neighbors.push(board[r][c]);
        }
    }
    return neighbors;
};

const getValue = (tile) => {
    let neighbors = getNeighbors(tile);
    let value = 0;
    neighbors.forEach((n) => {
        value += n.bomb;
    });
    return value;
};

const generateBoard = (w, h, m) => {
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
};

const checkVictoryState = () => {
    let problemFound = false;
    let flags = 0;
    for (let r = 0; r < h && !problemFound; r++) {
        for (let c = 0; c < w && !problemFound; c++) {
            t = board[r][c];
            if ((t.bomb && !t.flag)
                || (!t.bomb && t.flag)
                || (!t.bomb && !t.revealed)) {
                problemFound = true;
            }
        }
    }
    return !problemFound;
}

const newGame = (w, h, m) => {
    width = w;
    height = h;
    mines = m;
    generateBoard(w, h, m);
    alive = true;
    flags = 0;

    notifyClient(makeNewEvent(w, h, m));
    notifyClient(makeAliveEvent(alive));
    notifyClient(makeFlagCountEvent(flags));
};

// player actions, before validation
const handleNewRequest = (parsedUrl) => {
    const w = parseInt(parsedUrl.query['width']);
    const h = parseInt(parsedUrl.query['height']);
    const m = parseInt(parsedUrl.query['mines']);

    newGame(w, h, m);
}

const handleRevealRequest = (parsedUrl) => {
    if (!alive) {
        return;
    }
    const r = parseInt(parsedUrl.query['row']);
    const c = parseInt(parsedUrl.query['column']);
    const tile = board[r][c];
    if (!tile.revealed && !tile.flag && !tile.mark) {
        revealTile(tile);
    }
}

const handleFlagRequest = (parsedUrl) => {
    if (!alive) {
        return;
    }
    const r = parseInt(parsedUrl.query['row']);
    const c = parseInt(parsedUrl.query['column']);
    const color = '#' + parsedUrl.query['color'];
    const tile = board[r][c];
    if (!tile.revealed && !tile.flag) {
        flagTile(tile, color);
    }
}

const handleMarkRequest = (parsedUrl) => {
    if (!alive) {
        return;
    }
    const r = parseInt(parsedUrl.query['row']);
    const c = parseInt(parsedUrl.query['column']);
    const color = '#' + parsedUrl.query['color'];
    const tile = board[r][c];
    if (!tile.revealed && !tile.mark) {
        markTile(tile, color);
    }
}

const handleClearRequest = (parsedUrl) => {
    if (!alive) {
        return;
    }
    const r = parseInt(parsedUrl.query['row']);
    const c = parseInt(parsedUrl.query['column']);
    const tile = board[r][c];
    if (!tile.revealed && !tile.mark) {
        clearTile(tile);
    }
}

const handleSseRequest = (parsedUrl, clientResponse) => {
    notifyClient(makeNewEvent(width, height, mines), clientResponse);
    notifyClient(makeAliveEvent(alive), clientResponse);
    notifyClient(makeFlagCountEvent(flags), clientResponse);

    sendAllTiles(clientResponse);
}

const sendAllTiles = (client=null) => {
    console.log('sending tiles');
    console.log(height, width);
    for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
            const tile = board[r][c];
            if (alive) {
                if (tile.revealed) {
                    notifyClient(makeRevealEvent(r, c, getValue(tile)), client);
                }
                else if (tile.flag) {
                    notifyClient(makeFlagEvent(r, c, tile.flag), client);
                }
                else if (tile.mark) {
                    notifyClient(makeFlagEvent(r, c, tile.flag), client);
                }
            }
            else {
                if (tile.bomb) {
                    if (revealed) {
                        notifyClient(makeExplodeEvent(r, c), client);
                    }
                    else {
                        notifyClient(makeRevealEvent(r, c, 'b'));
                    }
                }
                else {
                    if (tile.flag) {
                        notifyClient(makeIncorrectEvent(r, c, client));
                    }
                    else {
                        notifyClient(makeRevealEvent(r,
                                c,
                                getValue(tile)),
                                client);
                    }
                }
            }
        }
    }
    console.log('tiles sent');
}

// player actions, after validation
const revealTile = (tile) => {
    if (tile.revealed) {
        return;
    }
    if (tile.bomb) {
        alive = false;
        notifyClient(makeAliveEvent(alive));
        sendAllTiles();
    }
    else {
        if (tile.flag) { tile.flag = null;
            flags--;
            notifyClient(makeFlagsEvent(flags));
        }
        if (tile.mark) {
            tile.mark = null;
        }
        tile.revealed = true;
        const r = tile.row;
        const c = tile.column;
        const v = getValue(tile);
        if (v == 0) {
            let neighbors = getNeighbors(tile);
            neighbors.forEach((n) => {
                revealTile(n);
            });
        }
        notifyClient(makeRevealEvent(r, c, v));
    }
}

const flagTile = (tile, color) => {
    if (!tile.flag) {
        flags++;
    }
    tile.flag = color;
    tile.mark = null;
    notifyClient(makeFlagsEvent(flags));
}

const markTile = (tile, color) => {
    if (tile.flag) {
        flags--;
    }
    tile.flag = null;
    tile.mark = color;
    notifyClient(makeFlagsEvent(flags));
}

const clearTile = (tile, color) => {
    if (tile.flag) {
        flags--;
    }
    tile.flag = null;
    tile.mark = color;
    notifyClient(makeClearEvent(flags));
}

newGame(width, height, mines);
