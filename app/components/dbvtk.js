const { app } = require('electron');
const { spawn } = require('child_process');
const waitOn = require('wait-on');
const path = require('path');
const fs = require('fs');
const tmp = require('tmp');
const Loading = require("./loading");
const { getjavaVersionAndPath, setJvmLog } = require('../helpers/javaHelper');
const MemoryManager = require('../helpers/memoryManagerHelper');
const electronSettings = require('electron-settings');
const log = require('electron-log');
const ipc = require('electron').ipcMain
const dialog = require('electron').dialog

ipc.on('show-open-dialog', function (event, options) {
    dialog.showOpenDialog(options).then(result => {
        event.returnValue = result.filePaths
       }).catch(err => {
        log.error(err)
       })
})

ipc.on('show-save-dialog', function (event, options) {
    dialog.showSaveDialog(options).then(result => {
        event.returnValue = result.filePath
       }).catch(err => {
        log.error(err)
       })
})

ipc.on('show-confirmation-dialog', function (event, options) {
    dialog.showMessageBox(options).then(result => {
        event.returnValue = result
       }).catch(err => {
        log.error(err)
       })
})

module.exports = class Dbvtk {
    constructor() {
        this.filename = null;
        this.port = 8080;
        this.appUrl = "http://localhost";
        this.process = null;
        this.loading = null;
    }

    setLoadingScreen(loading){
        this.loading = loading;
    }

    getWarFile() {
        let files = fs.readdirSync(app.getAppPath() + '/resources/war');

        for (let i in files) {
            if (path.extname(files[i]) === '.war') {
                this.filename = path.basename(files[i]);
                break;
            }
        }

        if (!this.filename) {
            throw new Error('Resources files are missing')
        }
    }

    async createProcess() {
        let java = getjavaVersionAndPath();

        let serverPortFile = tmp.tmpNameSync();
        log.info("Port file at " + serverPortFile);

        let jvmLog = tmp.tmpNameSync();
        setJvmLog(jvmLog);
        log.info("JVM log at " + jvmLog);
        this.loading.showLog(jvmLog);
    

        let memoryManager = new MemoryManager()
        let maxHeapMemory = memoryManager.getMaxHeapMemorySettings();
        let tmpDir = electronSettings.get('tmpDir');
        let disableTimezone = electronSettings.get('disableTimezone');

        // Ask for a random unassigned port and to write it down in serverPortFile
        let javaVMParameters = [
            "-Dserver.port=0",
            "-Dfile.encoding=UTF-8",
            "-Dserver.port.file=" + serverPortFile,
            "-Djavax.xml.parsers.DocumentBuilderFactory=org.apache.xerces.jaxp.DocumentBuilderFactoryImpl",
            "-Djavax.xml.parsers.SAXParserFactory=org.apache.xerces.jaxp.SAXParserFactoryImpl",
            "-Denv=desktop",
        ];

        if (disableTimezone) {
            javaVMParameters.push("-Duser.timezone=GMT");
        }

        if ( maxHeapMemory != null ) {
            javaVMParameters.push("-Xmx" + maxHeapMemory)
        }

        if (tmpDir) {
            javaVMParameters.push("-Djava.io.tmpdir=" + tmpDir);
        }

        if(process.env.SNAP_USER_COMMON){
            log.info("SNAP_USER_COMMON: " + process.env.SNAP_USER_COMMON);
            javaVMParameters.push("-Ddbvtk.home=" + process.env.SNAP_USER_COMMON);
        }

        console.log(javaVMParameters)

        this.process = spawn(java.path, ['-jar'].concat(javaVMParameters).concat("resources/war/" + this.filename), {
            cwd: app.getAppPath().replace('app.asar', 'app.asar.unpacked') + '/'
        });

        const file = fs.createWriteStream(jvmLog, { flags: 'a' })
        file.on('error', function(err) {
            throw new Error('DBVTK could not be started');
        });
        this.process.stdout.pipe(file); // logging

        this.process.on('error', (code, signal) => {
            log.error('log file');    
            throw new Error('DBVTK could not be started');
        });
        log.info('Server PID: ' + this.process.pid);

        // Waiting for app to start
        log.info('Wait until ' + serverPortFile + ' exists...');
        await waitOn({ resources: [serverPortFile] });

        this.port = parseInt(fs.readFileSync(serverPortFile));
        fs.unlink(serverPortFile, (err) => { });

        this.appUrl = `${this.appUrl}:${this.port}`;

        log.info("Server at " + this.appUrl);
        await waitOn({ resources: [this.appUrl] });
        log.info('Server started!');
    }
}