const { checkForUpdates, eventsIsAUpdate } = require("./components/updater");
const { app, BrowserWindow, globalShortcut, dialog, ipcMain } = require('electron');
const Loading = require("./components/loading");
const ApplicationMenu = require("./components/application-menu");
const Settings = require('./components/settings');
const Dbvtk = require("./components/dbvtk");
const Solr = require("./components/solr");
const settings = require('electron-settings');
const log = require('electron-log');
const path = require('path');
const fs = require('fs');
const CONSTANTS = require('./helpers/constants.js');

let title = 'Database Preservation Toolkit';
let windowWidth = 1200;
let windowHeight = 800;
let mainWindow = null;
let otherInstanceOpen = !app.requestSingleInstanceLock();
let debug = process.env.TK_DEBUG;
let solr = null
let server = null
let loading = null

if (otherInstanceOpen) {
    log.info("Already open...")
    app.quit();
    return;
}

app.on('ready', async function () {

    loading = new Loading()
    loading.show();

    processInfoDir = path.join(app.getPath('home'), CONSTANTS.DBVKT_DIRECTORY, CONSTANTS.PROCESS_INFO_DIRECTORY);
    if (!fs.existsSync(processInfoDir)) {
        const dir = fs.mkdirSync(processInfoDir, { recursive: true });
        if (dir === undefined) {
            throw new Error(`Failed to create process information directory at ${processInfoDir}`);
        }
    }

    solr = new Solr(processInfoDir);
    try {
        await solr.createProcess();
    } catch (error) {
        log.error(error);
        dialog.showErrorBox(
            'Oops! Something went wrong!',
            error.message
        )
        closeApp()
    }

    server = new Dbvtk(processInfoDir);
    server.setLoadingScreen(loading);

    if (!debug) {
        try {
            server.getWarFile();
            await server.createProcess()
        } catch (error) {
            log.error(error);
            dialog.showErrorBox(
                'Oops! Something went wrong!',
                error.message
            )
            closeApp()
        }
    } else {
        server.appUrl = server.appUrl + ":" + server.port;
        loading.hide();
    }

    initApp()
});

app.on('window-all-closed', (event) => {
    event.preventDefault();
    closeApp();
});

app.on('will-quit', (event) => {
    event.preventDefault();
    closeApp();
});

app.on('second-instance', function (event, commandLine, workingDirectory) {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    }
    return true;
});

ipcMain.on('CLOSE_APP', (event, arg) => {
    event.preventDefault();
    closeApp();
})

ipcMain.on('OPEN_SETTINGS', (event, arg) => {
    new Settings().show()
})

function initApp() {
    const language = settings.getSync('language') != null ? settings.getSync('language') : "en";
    // Use 90% of screen size
    const screenSize = 0.9;
    const screen = require('electron').screen
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    windowWidth = Math.round(width * screenSize);
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
            contextIsolation: false,
            preload: app.getAppPath() + '/app/helpers/preloader.js'
        }
    });

    if (process.platform === "linux" && !process.env.SNAP) {
        mainWindow.setIcon(app.getAppPath() + '/buildResources/96x96.png')
    }
    mainWindow.unmaximize()

    checkForUpdates(mainWindow)

    mainWindow.loadURL(server.appUrl + "/?branding=false&locale=" + language);
    mainWindow.webContents.once('dom-ready', () => {
        log.info('main loaded');
        mainWindow.show()
        loading.hide();
        if (Settings.instance) {
            Settings.instance = null;
            new Settings().show()
        }
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
        if (server.process && !eventsIsAUpdate()) {
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
        log.info('Bring to front shortcut triggered');
        if (mainWindow) {
            mainWindow.focus();
        }
    })
}

async function closeApp() {
    loading.clear()
    // Unregister all shortcuts.
    globalShortcut.unregisterAll();

    if (server != null) {
        try {
            await server.killProcess();
        } catch (error) {
            log.error('Error shutting down DBVTK:', error);
        }
    }

    if (solr != null) {
        try {
            await solr.killProcess();
        } catch (error) {
            log.error('Error shutting down Solr:', error);
        }
    }

    app.exit();
}
