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

const removeChildElements = (parentElement) => {
    while (parentElement.hasChildNodes()) {
        parentElement.removeChild(parentElement.lastChild);
    }
}

const lookup = {
    'h': { 'text': ' ', style: ['hidden'] },
    'f': { 'text': '⚑', style: ['hidden', 'flag'] },
    'm': { 'text': '?', style: ['hidden', 'flag'] },
    'i': { 'text': '╳', style: ['hidden', 'mistake'] },
    'b': { 'text': '⁜', style: ['hidden', 'bomb'] },
    'e': { 'text': '⁜', style: ['revealed', 'explode'] },

    '0': { 'text': ' ', style: ['revealed', 'zero'] },
    '1': { 'text': '1', style: ['revealed', 'one'] },
    '2': { 'text': '2', style: ['revealed', 'two'] },
    '3': { 'text': '3', style: ['revealed', 'three'] },
    '4': { 'text': '4', style: ['revealed', 'four'] },
    '5': { 'text': '5', style: ['revealed', 'five'] },
    '6': { 'text': '6', style: ['revealed', 'six'] },
    '7': { 'text': '7', style: ['revealed', 'seven'] },
    '8': { 'text': '8', style: ['revealed', 'eight'] }
}

const updateTile = (tileElement, r, c, value, color) => {
    removeChildElements(tileElement);
    const content = makeElementIn('div', lookup[value].style, tileElement);
    if (color) {
        content.style.color = color;
    }
    appendText(content, lookup[value].text);
}
