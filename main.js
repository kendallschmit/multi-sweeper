const http = require('http');
const fs = require('fs');
const url = require('url');

// general server stuff
const serveFile = (req, res) => {
    const p = url.parse(req.url, true);
    let ext = p.pathname.split('.').pop();
    if (ext == 'png') {
        fs.readFile('./' + p.pathname, (err, contents) => {
            if (!err) {
                res.writeHead(200, { 'Content-Type': 'image/png' });
                res.end(contents, 'binary');
            }
            else {
                res.end();
            }
        });
    }
    else if (ext == 'css' || ext == 'js' || ext == 'html') {
        console.log(p.pathname);
        fs.readFile('./' + p.pathname, 'utf8', (err, contents) => {
            if (!err) {
                const types = {
                    'css': 'text/css',
                    'js': 'application/javascript',
                    'html': 'text/html'
                };
                res.writeHead(200, {
                    'Content-Type': `${types[ext]}; charset=utf-8`
                });
                res.write(contents);
                res.end();
            }
            else {
                res.end();
            }
        });
    }
    else {
        res.end();
    }
};

// SHORT MESSAGES
// new width,height,mines
//
// tile: row,column,<tile>,<color>
//   h: hidden
//   0-8: revealed number
//   f: flag
//   m: mark
//   i: incorrect
//   b: undetonated bomb
//   e: detonated bomb
//
// state: alive/dead/win
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
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.write('configuration applied');
        res.end();
        handleNewRequest(p);
    }
    else if (p.pathname == '/reveal') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end();
        handleRevealRequest(p);
    }
    else if (p.pathname == '/auto') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end();
        handleAutoRequest(p);
    }
    else if (p.pathname == '/flag') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end();
        handleFlagRequest(p);
    }
    else if (p.pathname == '/mark') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end();
        handleMarkRequest(p);
    }
    else if (p.pathname == '/clear') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end();
        handleClearRequest(p);
    }
    else if (p.pathname == '/sse') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
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
    if (client) {
        client.write('event: ' + message.event + '\n');
        client.write('data: ' + message.data + '\n\n');
    }
    else {
        clientResponses.forEach((res) => {
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

const makeTileEvent = (tile) => {
    let info = 'h';
    if (state == 'alive') {
        if (tile.revealed) {
            info = getValue(tile);
        }
        else if (tile.flag) {
            info = `f,${tile.flag}`;
        }
        else if (tile.mark) {
            info = `m,${tile.mark}`;
        }
    }
    else {
        if (tile.bomb) {
            if (tile.revealed) {
                info = 'e';
            }
            else {
                if (tile.flag) {
                    info = `f,${tile.flag}`;
                }
                else {
                    info = 'b';
                }
            }
        }
        else {
            if (tile.revealed) {
                info = getValue(tile);
            }
            else if (tile.flag) {
                info = 'i';
            }
            else if (tile.mark) {
                info = `m,${tile.mark}`;
            }
        }
    }
    return {
        'event': 'tile',
        'data': `${tile.row},${tile.column},${info}`
    };
};

const makeStateEvent = (state) => {
    return {
        'event': 'state',
        'data': state
    };
};

const makeFlagCountEvent = (flagCount) => {
    return {
        'event': 'flag-count',
        'data': `${flagCount}`
    };
}

const makeWinEvent = () => {
    return {
        'event': 'win',
        'data': ``
    };
};
;

// globals
var width = 10;
var height = 10;
var mines = 20;

var state = 'alive';
var flagCount = 0;
var board = null;

var firstReveal = true;

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
            if (!(r == row && c == column)) {
                neighbors.push(board[r][c]);
            }
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
        board[p.row][p.column].bomb = true;
    }
};

const checkVictoryState = () => {
    let problemFound = false;
    let flags = 0;
    for (let r = 0; r < height && !problemFound; r++) {
        for (let c = 0; c < width && !problemFound; c++) {
            t = board[r][c];
            if ((t.bomb && !t.flag)
                || (!t.bomb && t.flag)
                || (!t.bomb && !t.revealed)) {
                problemFound = true;
            }
        }
    }
    if (!problemFound) {
        state = 'win';
        notifyClient(makeStateEvent(state));
    }
}

const newGame = (w, h, m) => {
    width = w;
    height = h;
    mines = m;
    generateBoard(w, h, m);
    state = 'alive';
    flags = 0;
    firstReveal = true;
    notifyClient(makeNewEvent(w, h, m));
    notifyClient(makeStateEvent(state));
    notifyClient(makeFlagCountEvent(flags));
};

// player actions, before validation
const handleNewRequest = (parsedUrl) => {
    let w = width;
    let h = height;
    let m = mines;
    if (parsedUrl.query['width']
            && parsedUrl.query['height']
            && parsedUrl.query['mines']) {
        w = parseInt(parsedUrl.query['width']);
        h = parseInt(parsedUrl.query['height']);
        m = parseInt(parsedUrl.query['mines']);
    }
    newGame(w, h, m);
}

const handleRevealRequest = (parsedUrl) => {
    if (state != 'alive') {
        return;
    }
    const r = parseInt(parsedUrl.query['row']);
    const c = parseInt(parsedUrl.query['column']);
    const tile = board[r][c];
    if (!tile.revealed && !tile.flag && !tile.mark) {
        revealTile(tile);
    }
    checkVictoryState();
}

const handleAutoRequest = (parsedUrl) => {
    if (state != 'alive') {
        return;
    }
    const r = parseInt(parsedUrl.query['row']);
    const c = parseInt(parsedUrl.query['column']);
    const tile = board[r][c];
    if (tile.revealed) {
        let fcount = 0;
        let neighbors = getNeighbors(tile);
        neighbors.forEach((n) => {
            if (n.flag) {
                fcount++;
            }
        });
        if (fcount == getValue(tile)) {
            neighbors.forEach((n) => {
                if (!n.flag) {
                    revealTile(n);
                }
            });
        }
    }
}

const handleFlagRequest = (parsedUrl) => {
    if (state != 'alive') {
        return;
    }
    const r = parseInt(parsedUrl.query['row']);
    const c = parseInt(parsedUrl.query['column']);
    const color = '#' + parsedUrl.query['color'];
    const tile = board[r][c];
    if (!tile.revealed && !tile.flag) {
        flagTile(tile, color);
    }
    checkVictoryState();
}

const handleMarkRequest = (parsedUrl) => {
    if (state != 'alive') {
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
    if (state != 'alive') {
        return;
    }
    const r = parseInt(parsedUrl.query['row']);
    const c = parseInt(parsedUrl.query['column']);
    const tile = board[r][c];
    if (tile.mark || tile.flag) {
        clearTile(tile);
    }
}

const handleSseRequest = (parsedUrl, clientResponse) => {
    notifyClient(makeNewEvent(width, height, mines), clientResponse);
    notifyClient(makeStateEvent(state), clientResponse);
    notifyClient(makeFlagCountEvent(flags), clientResponse);

    sendAllTiles(clientResponse);
}

const sendAllTiles = (client=null) => {
    for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
            const tile = board[r][c];
            if (tile.revealed || tile.bomb || tile.flag || tile.mark) {
                notifyClient(makeTileEvent(tile), client);
            }
        }
    }
}

// player actions, after validation
const revealTile = (tile) => {
    if (tile.revealed) {
        return;
    }
    tile.revealed = true;
    tile.flag = null;
    tile.mark = null;
    if (firstReveal && tile.bomb) {
        for (let r = 0; r < height && tile.bomb; r++) {
            for (let c = 0; c < width && tile.bomb; c++) {
                const t = board[r][c];
                if (t != tile && !t.bomb) {
                    tile.bomb = false;
                    t.bomb = true;
                }
            }
        }
    }
    firstReveal = false;
    if (tile.bomb) {
        state = 'dead';
        notifyClient(makeStateEvent(state));
        sendAllTiles();
    }
    else {
        if (tile.flag) { tile.flag = null;
            flags--;
            notifyClient(makeFlagCountEvent(flags));
        }
        if (tile.mark) {
            tile.mark = null;
        }
        const v = getValue(tile);
        if (v == 0) {
            let neighbors = getNeighbors(tile);
            neighbors.forEach((n) => {
                revealTile(n);
            });
        }
        notifyClient(makeTileEvent(tile));
    }
}

const flagTile = (tile, color) => {
    if (!tile.flag) {
        flags++;
    notifyClient(makeFlagCountEvent(flags));
    }
    tile.flag = color;
    tile.mark = null;
    notifyClient(makeTileEvent(tile));
}

const markTile = (tile, color) => {
    if (tile.flag) {
        flags--;
    notifyClient(makeFlagCountEvent(flags));
    }
    tile.flag = null;
    tile.mark = color;
    notifyClient(makeTileEvent(tile));
}

const clearTile = (tile, color) => {
    if (tile.flag) {
        flags--;
    notifyClient(makeFlagCountEvent(flags));
    }
    tile.flag = null;
    tile.mark = color;
    notifyClient(makeTileEvent(tile));
}

newGame(width, height, mines);
