// color stuff
const colorR = document.getElementById('color-r');
const colorG = document.getElementById('color-g');
const colorB = document.getElementById('color-b');
const colorText = document.getElementById('color-text');

var color = '#c03030';

const updateColor = () => {
    r = parseInt(colorR.value);
    g = parseInt(colorG.value);
    b = parseInt(colorB.value);

    const toHex = (n) => {
        let h = n.toString(16);
        return (h.length < 2 ? '0' : '') + h
    }
    color = (toHex(r) + toHex(g) + toHex(b));
    colorText.innerHTML = color;
    colorText.style.color = '#' + color;
}

updateColor();

colorR.oninput = updateColor;
colorG.oninput = updateColor;
colorB.oninput = updateColor;

// ui stuff
const statusText = document.getElementById('status');
const flagCounter = document.getElementById('flag-counter');

// board globals
const boardGrid = document.getElementById('board-grid');
let tileElements = [];
let tileValues = []

var width = 0;
var height = 0;
var mines = 0;

// set up server side events
const source = new EventSource('/sse');
source.addEventListener('new', (e) => {
    const sp = e.data.split(',');
    width = parseInt(sp[0]);
    height = parseInt(sp[1]);
    mines = parseInt(sp[2]);
    boardGrid.style.gridTemplate =
            `repeat(${height}, 1.3em) / repeat(${width}, 1.3em)`;
    // remove old tile elements
    while (boardGrid.hasChildNodes()) {
        boardGrid.removeChild(boardGrid.lastChild);
    }
    // set up new tiles elements
    tileElements = [];
    for (let r = 0; r < height; r++) {
        const row = [];
        const valueRow = [];
        for (let c = 0; c < width; c++) {
            const tileElement = makeElementIn('div', ['tile'], boardGrid);
            const cr = r;
            const cc = c;
            tileElement.addEventListener('click', (e) => {
                requestReveal(cr, cc);
            });
            tileElement.addEventListener('contextmenu', (e) => {
                const v = tileValues[cr][cc];
                if (v == 'f') {
                    requestMark(cr, cc, color);
                }
                else if (v == 'm') {
                    requestClear(cr, cc, color);
                }
                else {
                    requestFlag(cr, cc, color);
                }
                e.preventDefault();
            });
            updateTile(tileElement, r, c, 'h');
            row.push(tileElement);
            valueRow.push('h');
        }
        tileElements.push(row);
        tileValues.push(valueRow);
    }
}, false);
source.addEventListener('tile', (e) => {
    const sp = e.data.split(',');
    const r = parseInt(sp[0]);
    const c = parseInt(sp[1]);
    const v = sp[2];
    const color = sp.length > 3 ? sp[3] : null;
    tileValues[r][c] = v;
    updateTile(tileElements[r][c], r, c, v, color);
}, false);
source.addEventListener('state', (e) => {
    removeChildElements(statusText);
    if (e.data == 'alive') {
        appendText(statusText, 'in progress');
    }
    else if (e.data == 'dead') {
        appendText(statusText, 'lose');
    }
    else if (e.data == 'win') {
        appendText(statusText, 'win');
    }
}, false);
source.addEventListener('flag-count', (e) => {
    const flags = parseInt(e.data);
    removeChildElements(flagCounter);
    appendText(flagCounter, `⚑ ${flags}/${mines}`);
}, false);
