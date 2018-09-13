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

const tileElements = [];

notify('generating board')
const boardGrid = document.getElementById('board-grid');
for (let r = 0; r < 16; r++) {
    const row = [];
    for (let c = 0; c < 30; c++) {
        const tile = makeElementIn('div', ['tile'], boardGrid);
        const cr = r;
        const cc = c;
        tile.addEventListener('click', (e) => {
            sendReveal(cr, cc);
        });
        tile.addEventListener('contextmenu', (e) => {
            sendFlag(cr, cc, color);
            e.preventDefault();
        });
        updateTile(tile, r, c, ' ');
        row.push(tile);
    }
    tileElements.push(row);
}
notify('board generated')

notify('connecting');
getJson('init', (response) => {
    notify('connected');
},
(error) => {
    notify(response);
});

// set up server side events
const source = new EventSource('/sse');
source.addEventListener('message', (e) => {
    if (e.data == 'win') {
        statusText.innerHTML = 'Win!';
    }
    else if (e.data == 'lose') {
        statusText.innerHTML = 'Lose :(';
    }
    else if (e.data == 'new') {
        statusText.innerHTML = 'New game';
    }
    else if (e.data.startsWith('flags')) {
        const flagCount = parseInt(e.data.split(' ')[1]);
        statusText.innerHTML = 'Flags: ' + flagCount;
    }
    else {
        const sp = e.data.split(',');
        const row = parseInt(sp[0]);
        const column = parseInt(sp[1]);
        const value = sp[2];
        const color = value == 'f' || value == '?' ? sp[3] : null;
        updateTile(tileElements[row][column], row, column, value, color);
    }
}, false);
