const { app } = require('electron');
const { spawn } = require('child_process');
const waitOn = require('wait-on');
const path = require('path');
const fs = require('fs');
const { deleteProcessFile, spawnSolrProcess } = require('../helpers/processHelper.js');
const { findFreePort } = require('../helpers/netHelper');
const log = require('electron-log');
const CONSTANTS = require('../helpers/constants.js');

module.exports = class SolrManager {
    constructor(processInfoDir) {
        this.filename = null;
        this.port = 8983;
        this.zooPort = 9983;
        this.appUrl = "http://localhost";
        this.process = null;
        this.loading = null;
        this.solrHome = path.join(app.getPath('home'), CONSTANTS.DBVKT_DIRECTORY, CONSTANTS.INDEX_DIRECTORY);
        this.processInfoDir = processInfoDir;
        this.solrPortFile = path.join(this.processInfoDir, "solr.port");
    }

    async createProcess() {
        if (fs.existsSync(this.solrPortFile)) {
            // if there's a port file, use that port
            this.port = parseInt(fs.readFileSync(this.solrPortFile, 'utf8'));
            log.info(`Starting Solr with port: ${this.port}`);
        } else {
            this.port = await findFreePort(8983);
            log.info(`Found free port to use for Solr: ${this.port}`);
        }

        if (process.env.SNAP_USER_COMMON) {
            log.info("SNAP_USER_COMMON: " + process.env.SNAP_USER_COMMON);
            this.solrHome = process.env.SNAP_USER_COMMON + CONSTANTS.DBVKT_DIRECTORY + "/" + CONSTANTS.INDEX_DIRECTORY;
            this.processInfoDir = process.env.SNAP_USER_COMMON + CONSTANTS.DBVKT_DIRECTORY + "/" + CONSTANTS.PROCESS_INFO_DIRECTORY;
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
        this.process = spawnSolrProcess(solrArgs);

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
                await spawnSolrProcess(solrArgs, null, null);
                log.info('Solr service shut down');
                deleteProcessFile(this.solrPortFile);
            } catch (error) {
                log.error('Error shutting down Solr:', error);
                throw error;
            }
        }
    
        this.process = null;
    }
};