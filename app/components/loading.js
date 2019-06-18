const { BrowserWindow, app } = require('electron');

module.exports = class Loading {
    constructor() {
        this.window = new BrowserWindow({
            show: false,
            frame: false,
            title: "Loading",
            width: 300,
            height: 150
        });

        this.window.loadURL("file://" + app.getAppPath() + '/app/views/loading.html');
    }

    show() {
        this.window.webContents.once('dom-ready', () => {
            console.log("Loading");
            this.window.show();
        })
    }

    hide() {
        this.window.hide();
        this.window.close();
    }
}