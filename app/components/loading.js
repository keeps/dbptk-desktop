const { BrowserWindow, app, ipcMain } = require('electron');
const { getJvmLog } = require('../helpers/javaHelper');
var fs = require('fs')

module.exports = class Loading {
    constructor() {
        if(!!Loading.instance){
            return Loading.instance
        }
        Loading.instance = this;
        this.window = new BrowserWindow({
            show: false,
            frame: false,
            title: "Loading",
            width: 300,
            height: 150
        });

        this.refreshIntervalId;
        this.registerEvents();

        this.window.loadURL("file://" + app.getAppPath() + '/app/views/loading.html');
        return this;
    }

    show() {
        this.window.webContents.once('dom-ready', () => {
            console.log("Loading");
            this.window.show();
        })
    }

    hide() {
        // this.window.hide();
        // this.window.close();
        // clearInterval(this.refreshIntervalId);
    }

    registerEvents() {
        ipcMain.on('REZISE', (event, change) => {
            if(change){
                // Use 60% of screen size
                const screenSize = 0.6;
                const screen = require('electron').screen
                const { width, height } = screen.getPrimaryDisplay().workAreaSize
                let windowWidth = Math.round(width * screenSize );
                let windowHeight = Math.round(height * screenSize);
                this.window.setSize(windowWidth, windowHeight)
                this.window.center();
            } else {
                this.window.setSize(300, 150)
                this.window.center();
            }
        });
    }

    showJvmLog(){
        let jvmFile = getJvmLog();
        let loadingWin = this.window;
        this.refreshIntervalId = setInterval(function(){
            if(jvmFile){
                fs.readFile(jvmFile, 'utf8', function(err, contents) {
                    loadingWin.webContents.send("UPDATED_LOG_LIST", contents);
                });
            }
        }, 1000)
    }
}