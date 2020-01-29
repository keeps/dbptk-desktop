const { dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const Loading = require("./loading");

let updater
let focusedWindow
let loading
autoUpdater.autoDownload = false

autoUpdater.on('error', (error) => {
    //dialog.showErrorBox('Error; ', error == null ? "unknown" : (error.stack || error).toString());
    //TODO: create log for electron
})

autoUpdater.on('update-available', () => {
    dialog.showMessageBox(focusedWindow, {
        type: 'info',
        title: 'Found Updates',
        message: 'Found updates, do you want update now?',
        buttons: ['Yes', 'No']
    }, (buttonIndex) => {
        if (buttonIndex === 0) {
            autoUpdater.downloadUpdate()
            loading = new Loading()
            loading.show();
            loading.showJvmLog();
        } else {
            if(updater) {
                updater.enabled = true
                updater = null
            }
        }
    })
})

autoUpdater.on('update-not-available', () => {
    if(updater) {
        dialog.showMessageBox(focusedWindow, {
            type: 'info',
            title: 'No Updates',
            message: 'Current version is up-to-date.',
            buttons: ['Ok']
        })
    
        updater.enabled = true
        updater = null
    }
})

autoUpdater.on('update-downloaded', () => {
    loading.hide();
    dialog.showMessageBox(focusedWindow, {
        type: 'info',
        title: 'Install Updates',
        message: 'Updates downloaded, application will be quit for update...',
        buttons: ['Ok']
    }, () => {
        setImmediate(() => autoUpdater.quitAndInstall())
    })
})

module.exports.checkForUpdates = function (window) {
    if(process.env.SNAP){
        return
    }
    focusedWindow = window
    autoUpdater.checkForUpdates()
}

module.exports.checkForUpdatesFromMenu = function () {
    updater = menuItem
    updater.enabled = false
    autoUpdater.checkForUpdates()
}