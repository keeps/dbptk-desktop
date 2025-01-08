const fs = require('fs');
const { spawn, exec } = require('child_process');
const path = require('path');
const log = require('electron-log');
const { app } = require('electron');
const CONSTANTS = require('./constants');

module.exports.pidIsRunning = function (pid) {
    try {
        process.kill(pid, 0);
        return true; // Process is running
    } catch (e) {
        return false; // Process is not running
    }
}

module.exports.deleteProcessFile = async function (processFile) {
    fs.unlink(processFile, (err) => {
        if (err) {
            console.error(`Error deleting the file: ${err.message}`);
        } else {
            console.log(`File ${processFile} was successfully deleted`);
        }
    });
    
}

module.exports.createProcessInfoDir = async function () {
    processInfoDir = path.join(app.getPath('home'), CONSTANTS.DBVKT_DIRECTORY, CONSTANTS.PROCESS_INFO_DIRECTORY);
    if (!fs.existsSync(processInfoDir)) {
        const dir = fs.mkdirSync(processInfoDir, { recursive: true });
        if (dir === undefined) {
            throw new Error(`Failed to create process information directory at ${processInfoDir}`);
        }
    }
    return processInfoDir;
}