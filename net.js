const handleRequestFailure = (e) => {
    console.log("error getting json: " + JSON.stringify(e));
}

const getJson = (address, success, failure=handleRequestFailure) => {
    const req = new XMLHttpRequest();
    req.addEventListener("load", () => {
        success(JSON.parse(req.responseText));
    });
    req.addEventListener("error", failure);
    req.addEventListener("abort", failure);

    req.open("GET", address);
    req.send();
};

const getText = (address, success, failure=handleRequestFailure) => {
    const req = new XMLHttpRequest();
    req.addEventListener("load", () => {
        success(req.responseText);
    });
    req.addEventListener("error", failure);
    req.addEventListener("abort", failure);

    req.open("GET", address);
    req.send();
};

const sendReveal = (row, column) => {
    getText(`reveal?row=${row}&column=${column}`, (response) => {
        //console.log('reveal:', row, column, response);
    });
};

const sendFlag = (row, column, color) => {
    getText(`flag?row=${row}&column=${column}&color=${color}`, (response) => {
        //console.log('flag:', row, column, response);
    });
};

const sendNew = () => {
    getText(`new`, (response) => {
        //console.log('new:', response);
    });
};
