const { spawnSync } = require('child_process');
const { app } = require('electron');
const log = require('electron-log');

let java = {path:'java', version:null, os:"linux", exec: 'bin/java', jvmLog: null}

module.exports.getjavaVersionAndPath = function () {        
    let platform = process.platform;

    if (platform === 'win32') {
        java.os = "windows"
        java.exec = "bin/java.exe"
    } else if (platform === 'darwin') {
        java.os = "mac"
        java.exec = "Contents/Home/bin/java"
    }

    let path = `/resources/jre/${java.os}/${process.arch}/${java.exec}`
    java.path = app.getAppPath().replace('app.asar', 'app.asar.unpacked') + path;

    java.version = getJavaVersion(java.path);

    log.info("Java version is: " + java.version);
    log.info("Java Path is: " + java.path);

    return java;
}

module.exports.setJvmLog = function (path) {
  java.jvmLog = path;
}

module.exports.getJvmLog = function () {
  return java.jvmLog;
}

function getJavaVersion(path){
        
    let javaProcess = spawnSync(path, ['-version'], {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'pipe',
        encoding: 'utf-8'
    });

    let data = String(javaProcess.stderr).split('\n')[0];
    let version = new RegExp('(java|openjdk) version').test(data) ? data.split(' ')[2].replace(/"/g, '') : false;

    return version;
}