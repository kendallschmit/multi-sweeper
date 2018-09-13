const appendText = (element, text) => {
    element.appendChild(document.createTextNode(text));
}

const makeElement = (type, classes) => {
    let e = document.createElement(type);
    if (classes) {
        classes.forEach((c) => { e.className += ' ' + c; });
    }
    return e;
}

const makeElementIn = (type, classes, parentElement) => {
    let e = makeElement(type, classes);
    parentElement.appendChild(e);
    return e;
}

const lookup = {
    ' ': { 'text': ' ', style: 'hidden' },
    'f': { 'text': '⚑', style: 'flag' },
    '?': { 'text': '?', style: 'flag' },
    'x': { 'text': '╳', style: 'mistake' },
    'b': { 'text': '⁜', style: 'bomb' },

    '0': { 'text': ' ', style: 'zero' },
    '1': { 'text': '1', style: 'one' },
    '2': { 'text': '2', style: 'two' },
    '3': { 'text': '3', style: 'three' },
    '4': { 'text': '4', style: 'four' },
    '5': { 'text': '5', style: 'five' },
    '6': { 'text': '6', style: 'six' },
    '7': { 'text': '7', style: 'seven' },
    '8': { 'text': '8', style: 'eight' }
}

const updateTile = (tileElement, r, c, value, color) => {
    while (tileElement.hasChildNodes()) {
        tileElement.removeChild(tileElement.lastChild);
    }
    const content = makeElementIn('div',
            ['tile-content', lookup[value].style],
            tileElement);
    if (color) {
        content.style.color = '#' + color;
    }
    appendText(content, lookup[value].text);
}
