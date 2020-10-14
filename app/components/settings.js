const { BrowserWindow, app, ipcMain } = require('electron');
const log = require('electron-log');
const electronSettings = require('electron-settings');
const MemoryManager = require('../helpers/memoryManagerHelper');

module.exports = class Settings {
    constructor() {
        if(!!Settings.instance) {
            log.debug("Setting already exist")
            return Settings.instance
        }
        Settings.instance = this;
        this.window = null;
        this.memoryManager = new MemoryManager();
        this.log = log
        this.registerEvents();

        return this;
    }

    createWindow() {
        let window = new BrowserWindow({
            show: false,
            title: "Settings",
            resizable: false,
            width: 450,
            height: 450,
            parent: BrowserWindow.getFocusedWindow(),
            modal: true,
            frame: false,
            webPreferences: {
                nodeIntegration: true
            }
        })

        window.on('closed',function(){
            Settings.instance = null;
        })

        window.setMenuBarVisibility(false);
        window.loadURL("file://" + app.getAppPath() + '/app/views/settings.html');

        return window;
    }

    show() {
        if(this.window) {
            if(this.window.isMinimized) this.window.restore();
            this.window.show();
            this.window.focus();
        } else {
            this.window = this.createWindow();
            this.window.webContents.once('dom-ready', () => {
                this.window.show();
                this.buildSettings();
            })
        }
    }

    registerEvents() {
        ipcMain.on('APPLY_SETTINGS_EVENT', (event, data) => {
            this.log.info("Applying new settings")
            this.log.info("Memory = " + data.memory)
            this.memoryManager.setMaxHeapMemorySettings(data.memory);
            electronSettings.set("language", data.language)
            electronSettings.set('tmpDir', data.tmpDir)
            app.relaunch();
            app.quit();
        });

        ipcMain.on('GET_HUMANIZED_MEMORY_VALUE', (event, memory) => {
            event.returnValue = this.memoryManager.getHumanizedMemoryValue(memory);
        });

        ipcMain.on('GET_MEMORY_VALUE_IN_BYTES', (event, memory) => {
            event.returnValue = this.memoryManager.convertGBinBytes(memory);
        });

        ipcMain.on('CLOSE_WINDOW_EVENT', (event) => {
            Settings.instance = null;
            this.window.destroy();
        });
    }

    buildSettings() {
        const data = {
            "language" : electronSettings.get('language'),
            "maxHeapMemorySettings" : this.memoryManager.getMaxHeapMemorySettings(),
            "OsMemory" : this.memoryManager.getOsMemoryTotal(),
            "freeMemory" : this.memoryManager.getFreeMemory(),
            "minMemory" : this.memoryManager.getMinHeapMemory(),
            "tmpDir" : electronSettings.get('tmpDir'),
            "fileLocation" : electronSettings.file()
        }
        this.window.webContents.send("BUILD_SETTINGS_EVENT", data);
    }

}