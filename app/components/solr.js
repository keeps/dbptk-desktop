const { app } = require('electron');
const { spawn } = require('child_process');
const waitOn = require('wait-on');
const path = require('path');
const { getjavaInfo } = require('../helpers/javaHelper');
const fs = require('fs');
const { deleteProcessFile, createProcessInfoDir } = require('../helpers/processHelper.js');
const { findFreePort } = require('../helpers/netHelper');
const log = require('electron-log');
const CONSTANTS = require('../helpers/constants.js');

module.exports = class SolrManager {
    constructor() {
        this.filename = null;
        this.port = 8983;
        this.zooPort = 9983;
        this.appUrl = "http://localhost";
        this.process = null;
        this.loading = null;
        this.solrHome = path.join(app.getPath('home'), CONSTANTS.DBVKT_DIRECTORY, CONSTANTS.INDEX_DIRECTORY);
        this.processInfoDir = null;
        this.solrPortFile = null;
    }

    async createProcess() {
        this.processInfoDir = await createProcessInfoDir();
        this.solrPortFile = path.join(this.processInfoDir, "solr.port");

        if (fs.existsSync(this.solrPortFile)) {
            // if there's a port file, use that port
            this.port = parseInt(fs.readFileSync(this.solrPortFile, 'utf8'));
            log.info(`Starting Solr with port: ${this.port}`);
        } else {
            //define the zooPort here aswell
            this.port = await findFreePort(18984);
            log.info(`Found free port to use for Solr: ${this.port}`);
        }

        this.zooPort = this.port + 1000;

        if (process.env.SNAP_USER_COMMON) {
            log.info("SNAP_USER_COMMON: " + process.env.SNAP_USER_COMMON);
            this.solrHome = process.env.SNAP_USER_COMMON + "/" + CONSTANTS.DBVKT_DIRECTORY + "/" + CONSTANTS.INDEX_DIRECTORY;
            this.processInfoDir = process.env.SNAP_USER_COMMON + "/" + CONSTANTS.DBVKT_DIRECTORY + "/" + CONSTANTS.PROCESS_INFO_DIRECTORY;
        }

        if (!fs.existsSync(this.solrHome)) {
            const dir = fs.mkdirSync(this.solrHome, { recursive: true });
            if (dir === undefined) {
                throw new Error(`Failed to create Solr home directory at ${this.solrHome}`);
            }
        }

        let solrArgs = [
            "start",
            "-c",
            "-p", this.port,
            "-s", this.solrHome
        ];

        // Waiting for solr to start
        log.info('Waiting for Solr process to start...');
        this.process = this.spawnSolrProcess(solrArgs);

        fs.writeFileSync(this.solrPortFile, this.port.toString(), 'utf8');

        let solrURL = `${this.appUrl}:${this.port}`;
        await waitOn({ resources: [solrURL] });
        log.info('Solr started!');
    }

    async killProcess() {
        if (this.port != null) {
            log.info('Shutting down Solr service...');
            let solrArgs = [
                "stop",
                "-p", this.port,
            ];
    
            try {
                await this.spawnSolrProcess(solrArgs);
                log.info('Solr service shut down');
                deleteProcessFile(this.solrPortFile);
            } catch (error) {
                log.error('Error shutting down Solr:', error);
                throw error;
            }
        }
    
        this.process = null;
    }

    async spawnSolrProcess(solrArgs) {
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
                    SOLR_LOGS_DIR: solrLogsDir,
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
};

