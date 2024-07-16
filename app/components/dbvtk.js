const { app } = require('electron');
const { spawn } = require('child_process');
const waitOn = require('wait-on');
const path = require('path');
const fs = require('fs');
const tmp = require('tmp');
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
        this.zookeeperHost = "localhost:9983";
    }

    setLoadingScreen(loading){
        this.loading = loading;
    }

    setZookeeperHost(zooPort) {
        this.zookeeperHost = "localhost:" + zooPort;
    }

    getWarFile() {
        let resourceDir = app.getAppPath() + '/resources/war';
        let files = fs.readdirSync(resourceDir);

        for (let i in files) {
            if (path.extname(files[i]) === '.war') {
                this.filename = path.basename(files[i]);
                log.info("DBPTK war at: " + resourceDir + '/' + this.filename);
                break;
            }
        }

        if (!this.filename) {
            throw new Error('Resources files are missing')
        }
    }

    async createProcess() {
        let java = getjavaVersionAndPath();

        const dbptkDesktopTmpDir = tmp.dirSync({ template: 'dbptkDesktopTmpDir-XXXXXX' });
        log.info("DBPTK Desktop tmp dir at " + dbptkDesktopTmpDir.name)

        let serverPortFile = tmp.tmpNameSync({dir: dbptkDesktopTmpDir.name, template: 'port-XXXXXX' });
        log.info("Port file at " + serverPortFile);

        let jvmLog = tmp.tmpNameSync({dir: dbptkDesktopTmpDir.name, template: 'jvm-XXXXXX.log' });
        setJvmLog(jvmLog);

        log.info("JVM log at " + jvmLog);
        this.loading.showLog(jvmLog);
    

        let memoryManager = new MemoryManager()
        let maxHeapMemory = memoryManager.getMaxHeapMemorySettings();
        let tmpDir = electronSettings.getSync('tmpDir');
        let disableTimezone = electronSettings.getSync('disableTimezone');

        // Ask for a random unassigned port and to write it down in serverPortFile
        let javaVMParameters = [
            "-Dserver.port=0",
            "-Dfile.encoding=UTF-8",
            "-Dserver.port.file=" + serverPortFile,
            "-Djavax.xml.parsers.DocumentBuilderFactory=org.apache.xerces.jaxp.DocumentBuilderFactoryImpl",
            "-Djavax.xml.parsers.SAXParserFactory=org.apache.xerces.jaxp.SAXParserFactoryImpl",
            "-Denv=desktop",
            "--add-opens",
            "java.base/java.util=ALL-UNNAMED",
            "--add-opens",
            "java.base/java.lang=ALL-UNNAMED",
            "--add-opens",
            "java.xml/com.sun.org.apache.xerces.internal.jaxp=ALL-UNNAMED"
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
            cwd: app.getAppPath().replace('app.asar', 'app.asar.unpacked') + '/',
            env: {
                ...process.env,
                JAVA_HOME: java.home,
                SOLR_ZOOKEEPER_HOSTS: this.zookeeperHost
            }
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

    killProcess() {
        if(this.process.pid != null){
            log.info('Killing DBVTK process with PID: ' + this.process.pid);
            process.kill(this.process.pid);
        }
        this.process = null;
    }
}