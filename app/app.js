const { checkForUpdates, eventsIsAUpdate } = require("./components/updater");
const { app, BrowserWindow, globalShortcut, dialog } = require('electron');
const Loading = require("./components/loading");
const ApplicationMenu = require("./components/application-menu");
const Dbvtk = require("./components/dbvtk");
const settings = require('electron-settings');

let title = 'Database Preservation Toolkit';
let windowWidth = 1200;
let windowHeight = 800;
let mainWindow = null;
let serverProcess = null;
let otherInstanceOpen = !app.requestSingleInstanceLock();
let debug = process.env.TK_DEBUG;

if (otherInstanceOpen) {
    console.log("Already open...")
    app.quit();
    return;
}

app.on('ready', async function () {

    let loading = new Loading()
    loading.show();

    let server = new Dbvtk();
    server.setLoadingScreen(loading);

    if(!debug){
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
    } else {
        server.appUrl = server.appUrl + ":" + server.port;
    }

    const language = settings.get('language')!= null ? settings.get('language') : "en";
    // Use 90% of screen size
    const screenSize = 0.9;
    const screen = require('electron').screen
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    windowWidth = Math.round(width * screenSize );
    windowHeight = Math.round(height * screenSize);

    // Open window with app
    mainWindow = new BrowserWindow({
        title: title,
        frame: true,
        width: windowWidth,
        height: windowHeight,
        minHeight: 720,
        minWidth: 800,
        webPreferences: {
            nodeIntegration: true,
            preload: app.getAppPath() + '/app/helpers/preloader.js'
        }
    });

    if(process.platform === "linux" && !process.env.SNAP){
        mainWindow.setIcon(app.getAppPath() + '/buildResources/96x96.png')
    }
    mainWindow.unmaximize()

    checkForUpdates(mainWindow)

    mainWindow.loadURL(server.appUrl + "/?branding=false&locale=" + language);
    mainWindow.webContents.once('dom-ready', () => {
        console.log('main loaded')
        mainWindow.show()
        loading.hide();
    })
    new ApplicationMenu().createMenu(mainWindow.webContents, debug);

    mainWindow.on('closed', function () {
        mainWindow = null;
        let windowList = BrowserWindow.getAllWindows();
        windowList.forEach(window => {
            window.close();
        });
    });

    mainWindow.on('close', function (e) {
        if (serverProcess && !eventsIsAUpdate()) {
            var choice = require('electron').dialog.showMessageBox(this, {
                type: 'question'
                , buttons: ['Yes', 'No']
                , title: 'Confirm'
                , message: 'Do you really want to exit?'
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