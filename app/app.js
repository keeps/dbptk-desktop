const { checkForUpdates } = require("./components/updater");
const { app, BrowserWindow, globalShortcut, dialog } = require('electron');
const Loading = require("./components/loading");
const Dbvtk = require("./components/dbvtk");

let title = 'Database Visualization Toolkit';
let windowWidth = 1200;
let windowHeight = 800;
let mainWindow = null;
let serverProcess = null;
let otherInstanceOpen = !app.requestSingleInstanceLock();

if (otherInstanceOpen) {
    console.log("Already open...")
    app.quit();
    return;
}

app.on('ready', async function () {

    let loading = new Loading()
    loading.show();

    let server = new Dbvtk();

    try {
        server.getWarFile();
        await server.createProcess();
        serverProcess = server.process;
    } catch (error) {
        console.log(error);
        dialog.showErrorBox(
            'Oops! Something went wrong!',
             error.message
        )
        app.exit()
    }

    // Open window with app
    mainWindow = new BrowserWindow({
        title: title
        , width: windowWidth
        , height: windowHeight
        , frame: true,
        webPreferences: {
            nodeIntegration: true,
            preload: app.getAppPath() + '/app/helpers/preloader.js'
        }        
    });

    checkForUpdates(mainWindow)

    mainWindow.loadURL(server.appUrl + "/?branding=false");
    mainWindow.webContents.once('dom-ready', () => {
        console.log('main loaded')
        mainWindow.show()
        loading.hide();
    })

    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    mainWindow.on('close', function (e) {
        if (serverProcess) {
            var choice = require('electron').dialog.showMessageBox(this, {
                type: 'question'
                , buttons: ['Yes', 'No']
                , title: 'Confirm'
                , message: 'Dou you really want to exit?'
            });
            if (choice == 1) {
                e.preventDefault();
            }
        }
    });

    // Register a shortcut listener.
    const ret = globalShortcut.register('CommandOrControl+Shift+`', () => {
        console.log('Bring to front shortcut triggered');
        if (mainWindow) {
            mainWindow.focus();
        }
    })
});

app.on('window-all-closed', function () {
    app.quit();
});

app.on('will-quit', (event) => {
    if (serverProcess != null) {
        event.preventDefault();

        // Unregister all shortcuts.
        globalShortcut.unregisterAll();

        console.log('Kill server process ' + serverProcess.pid);

        require('tree-kill')(serverProcess.pid, "SIGTERM", function (err) {
            console.log('Server process killed');
            serverProcess = null;
            app.quit();
        });
    }
});

app.on('second-instance', function (event, commandLine, workingDirectory) {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    }
    return true;
});