const { dialog } = require('electron');
const { autoUpdater } = require('electron-updater');

let updater
let focusedWindow
autoUpdater.autoDownload = false

autoUpdater.on('error', (error) => {
    dialog.showErrorBox('Error; ', error == null ? "unknown" : (error.stack || error).toString());
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
    focusedWindow = window
    autoUpdater.checkForUpdates()
}

module.exports.checkForUpdatesFromMenu = function () {
    updater = menuItem
    updater.enabled = false
    autoUpdater.checkForUpdates()
}