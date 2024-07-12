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

module.exports = class SolrManager {
    constructor() {
        this.filename = null;
        this.port = 8983;
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

        const solrTmpDir = tmp.dirSync({ template: 'solrTmpDir-XXXXXX' });
        log.info("SOLR tmp dir at " + solrTmpDir.name)

        let serverPortFile = tmp.tmpNameSync({dir: solrTmpDir.name, template: 'port-XXXXXX' });
        log.info("Port file at " + serverPortFile);

        let jvmLog = tmp.tmpNameSync({dir: solrTmpDir.name, template: 'jvm-XXXXXX.log' });
        setJvmLog(jvmLog);

        log.info("JVM log at " + jvmLog);
        this.loading.showLog(jvmLog);
    

        let memoryManager = new MemoryManager()
        let maxHeapMemory = memoryManager.getMaxHeapMemorySettings();
        let tmpDir = electronSettings.getSync('tmpDir');
        let disableTimezone = electronSettings.getSync('disableTimezone');

        // Ask for a random unassigned port and to write it down in serverPortFile
        let javaVMParameters = [];

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
            javaVMParameters.push("-Dsolr.home=" + process.env.SNAP_USER_COMMON);
        }

        console.log(javaVMParameters)

        const solrScript = process.platform === 'win32' ? 'solr.cmd' : 'solr';
        const solrBinPath = path.join(app.getAppPath().replace('app.asar', 'app.asar.unpacked'), 'resources', 'solr', 'bin', solrScript);

        this.process = spawn(solrBinPath, ['start'], {
            cwd: app.getAppPath().replace('app.asar', 'app.asar.unpacked') + '/',
            env: {
                ...process.env, // Inherit existing environment variables
                JAVA_HOME: java.home // Ensure JAVA_HOME is set for the spawned process
            }
        });

        const file = fs.createWriteStream(jvmLog, { flags: 'a' })
        file.on('error', function(err) {
            throw new Error('Solr could not be started');
        });
        this.process.stdout.pipe(file); // logging

        this.process.on('error', (code, signal) => {
            log.error('log file');    
            throw new Error('Solr could not be started');
        });
        log.info('Server PID: ' + this.process.pid);

        // Waiting for app to start
        log.info('Wait until ' + serverPortFile + ' exists...');
        await waitOn({ resources: [serverPortFile] });

        this.port = parseInt(fs.readFileSync(serverPortFile));
        fs.unlink(serverPortFile, (err) => { });

        this.appUrl = `${this.appUrl}:${this.port}`;

        log.info("Solr at " + this.appUrl);
        await waitOn({ resources: [this.appUrl] });
        log.info('Solr started!');
    }
}