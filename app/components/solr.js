const { app } = require('electron');
const { spawn } = require('child_process');
const waitOn = require('wait-on');
const path = require('path');
const fs = require('fs');
const { getjavaVersionAndPath, setJvmLog } = require('../helpers/javaHelper');
const { findFreePort } = require('../helpers/netHelper');
const log = require('electron-log');

module.exports = class SolrManager {
    constructor() {
        this.filename = null;
        this.port = 8983;
        this.zooPort = 9983;
        this.appUrl = "http://localhost";
        this.process = null;
        this.loading = null;
        this.solrPID = null
    }

    async createProcess() {
        let java = getjavaVersionAndPath();

        const solrScript = process.platform === 'win32' ? 'solr.cmd' : 'solr';
        const solrBinPath = path.join(app.getAppPath().replace('app.asar', 'app.asar.unpacked'), 'resources', 'solr', 'bin', solrScript);

        this.port = await findFreePort(8983);
        this.zooPort = this.port + 1000;
        log.info(`Founded free port to use for solr ${this.port}`);

        let solrHome = path.join(app.getPath('home'), ".dbvtk", "index");
        let solrPidFile = path.join(solrHome, "solr-" + this.port + ".pid");

        if (process.env.SNAP_USER_COMMON) {
            log.info("SNAP_USER_COMMON: " + process.env.SNAP_USER_COMMON);
            solrHome = process.env.SNAP_USER_COMMON + "/.dbvtk/index";
        }

        if (!fs.existsSync(solrHome)) {
            const dir = fs.mkdirSync(solrHome, { recursive: true });
            if (dir === undefined) {
                throw new Error(`Failed to create Solr home directory at ${solrHome}`);
            }
        }

        let solrArgs = [
            "start",
            "-c",
            "-p", this.port,
            "-s", solrHome
        ];

        console.log(solrArgs)

        this.process = spawn(solrBinPath, solrArgs, {
            cwd: app.getAppPath().replace('app.asar', 'app.asar.unpacked') + '/',
            env: {
                ...process.env,
                JAVA_HOME: java.home,
                SOLR_PID_DIR: solrHome,
            }
        });

        this.process.on('error', (code, signal) => {
            throw new Error('Failed to start Solr process:', err);
        });

        // Waiting for solr to start
        log.info('Wait until ' + solrPidFile + ' exists...');
        await waitOn({ resources: [solrPidFile] });

        this.solrPID = parseInt(fs.readFileSync(solrPidFile));
        log.info('Solr PID: ' + this.solrPID);

        let solrURL = `${this.appUrl}:${this.port}`;

        log.info("Solr at " + solrURL);
        await waitOn({ resources: [solrURL] });
        log.info('Solr started!');
    }

    killProcess() {
        if(this.solrPID != null){
            log.info('Killing Solr process with PID: ' + this.solrPID);
            process.kill(this.solrPID);
        }
        this.process = null;
    }
}