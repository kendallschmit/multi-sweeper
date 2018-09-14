const notify = (message) => {
    console.log('notify:', message);
};

const colorR = document.getElementById('color-r');
const colorG = document.getElementById('color-g');
const colorB = document.getElementById('color-b');
const colorText = document.getElementById('color-text');
const statusText = document.getElementById('status-text');

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

// board globals
const boardGrid = document.getElementById('board-grid');
let tileElements = [];

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
    for (let r = 0; r < width; r++) {
        const row = [];
        for (let c = 0; c < height; c++) {
            const tileElement = makeElementIn('div', ['tile'], boardGrid);
            const cr = r;
            const cc = c;
            tileElement.addEventListener('click', (e) => {
                requestReveal(cr, cc);
            });
            tileElement.addEventListener('contextmenu', (e) => {
                requestFlag(cr, cc, color);
                e.preventDefault();
            });
            updateTile(tileElement, r, c, ' ');
            row.push(tileElement);
        }
        tileElements.push(row);
    }
}, false);
source.addEventListener('reveal', (e) => {
    const sp = e.data.split(',');
    const r = parseInt(sp[0]);
    const c = parseInt(sp[1]);
    const v = sp[2] == 'b' ? 'b' : parseInt(sp[2]);
    updateTile(tileElements[r][c], r, c, v, null);
}, false);
source.addEventListener('explode', (e) => {
    console.log(e.data);
}, false);
source.addEventListener('flag', (e) => {
    console.log(e.data);
}, false);
source.addEventListener('mark', (e) => {
    console.log(e.data);
}, false);
source.addEventListener('clear', (e) => {
    console.log(e.data);
}, false);
source.addEventListener('incorrect', (e) => {
    console.log(e.data);
}, false);
source.addEventListener('message', (e) => {
    console.log(e.data);
}, false);
