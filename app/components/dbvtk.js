const { app } = require('electron');
const { spawn } = require('child_process');
const waitOn = require('wait-on');
const path = require('path');
const fs = require('fs');
const tmp = require('tmp');
const os = require("os");
const { getjavaVersionAndPath } = require('../helpers/javaHelper');

module.exports = class Dbvtk {
    constructor() {
        this.filename = null;
        this.windowsJavaPath = 'java.exe';
        this.darwinJavaPath = 'java';
        this.port = 8080;
        this.appUrl = "http://localhost";
        this.process = null
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
        console.log("Port file at " + serverPortFile);

        let jvmLog = tmp.tmpNameSync();
        console.log("JVM log at " + jvmLog);

        // get 3/4th of physical memory for set maximum heap size
        // This value must be a multiple of 1024
        let maxHeapMemory = Math.floor(os.totalmem() * 3 / (4 * 1024)) * 1024;
        // console.log("Max HEAP: " + (maxHeapMemory / Math.pow(1024, 3)).toFixed(2) + " GB");

        // Ask for a random unassigned port and to write it down in serverPortFile
        let javaVMParameters = [
            "-Dserver.port=0",
            "-Dserver.port.file=" + serverPortFile,
            // "-Xmx" + maxHeapMemory,  
            "-Denv=Desktop",
        ];

        this.process = spawn(java.path, ['-jar'].concat(javaVMParameters).concat("resources/war/" + this.filename), {
            cwd: app.getAppPath().replace('app.asar', 'app.asar.unpacked') + '/'
        });

        this.process.stdout.pipe(fs.createWriteStream(jvmLog, {
            flags: 'a'
        })); // logging

        this.process.on('error', (code, signal) => {
            throw new Error('DBVTK could not be started');
        });
        console.log('Server PID: ' + this.process.pid);

        // Waiting for app to start
        console.log('Wait until ' + serverPortFile + ' exists...');
        await waitOn({ resources: [serverPortFile] });

        this.port = parseInt(fs.readFileSync(serverPortFile));
        fs.unlink(serverPortFile, (err) => { });

        this.appUrl = `${this.appUrl}:${this.port}`;

        console.log("Server at " + this.appUrl);
        await waitOn({ resources: [this.appUrl] });
        console.log('Server started!');
    }
}