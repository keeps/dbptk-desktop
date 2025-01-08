const fs = require('fs');
const { spawn, exec } = require('child_process');
const path = require('path');
const { getjavaInfo } = require('../helpers/javaHelper');
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

module.exports.spawnSolrProcess = async function (solrArgs) {
    if (!solrArgs || solrArgs.length === 0) {
        throw new Error('solrArgs cannot be empty');
    }

    let java = getjavaInfo();

    const isWindows = process.platform === 'win32';
    const solrScript = isWindows ? 'solr.cmd' : 'solr';
    const solrBinPath = path.join(app.getAppPath().replace('app.asar', 'app.asar.unpacked'), 'resources', 'solr', 'bin', solrScript);
    const solrLogsDir = path.join(app.getPath('home'), CONSTANTS.DBVKT_DIRECTORY, CONSTANTS.INDEX_DIRECTORY, CONSTANTS.LOGS_DIRECTORY);

    if (!fs.existsSync(solrLogsDir)) {
        fs.mkdirSync(solrLogsDir, { recursive: true });
    }

    const spawnCommand = isWindows ? 'cmd.exe' : solrBinPath;
    const spawnArgs = isWindows ? ['/c', solrBinPath, ...solrArgs] : solrArgs;

    return new Promise((resolve, reject) => {
        const solrProcess = spawn(spawnCommand, spawnArgs, {
            cwd: app.getAppPath().replace('app.asar', 'app.asar.unpacked') + '/',
            env: {
                ...process.env,
                JAVA_HOME: java.home,
                SOLR_LOGS_DIR: solrLogsDir
            }
        });

        const operation = solrArgs[0];

        solrProcess.on('error', (err) => {
            reject(new Error(`Failed to ${operation} Solr process: ` + err));
        });

        solrProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Solr process exited with code ${code}`));
            }
        });
    });
};