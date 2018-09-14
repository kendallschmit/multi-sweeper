const handleRequestFailure = (e) => {
    console.log("error making get request: " + JSON.stringify(e));
}

const getText = (address, success, failure=handleRequestFailure) => {
    const req = new XMLHttpRequest();
    req.addEventListener("load", () => {
        success(req.responseText);
    });
    req.addEventListener("error", failure);
    req.addEventListener("abort", failure);

    req.open("GET", address);
    req.send();
    console.log('sent request');
};

const requestReveal = (row, column) => {
    getText(`reveal?row=${row}&column=${column}`, (response) => {
        console.log('reveal:', row, column, response);
    });
};

const requestFlag = (row, column, color) => {
    getText(`flag?row=${row}&column=${column}&color=${color}`, (response) => {
        console.log('flag:', row, column, response);
    });
};

const requestMark = (row, column, color) => {
    getText(`mark?row=${row}&column=${column}&color=${color}`, (response) => {
        console.log('mark:', row, column, response);
    });
};

const requestClear = (row, column, color) => {
    getText(`clear?row=${row}&column=${column}`, (response) => {
        console.log('clear:', row, column, response);
    });
};

const requestNew = (w, h, m) => {
    getText(`new?width=${w}&height=${h}&mines=${m}`, (response) => {
        //console.log('new:', response);
    });
};

const requestRestart = () => {
    getText(`new`, (response) => {
        //console.log('new:', response);
    });
};
