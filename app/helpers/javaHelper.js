const { spawnSync } = require('child_process');
const { app } = require('electron');

module.exports.getjavaVersionAndPath = function () {        
    let platform = process.platform;
    let java = {path:'java', version:null, os:"linux", exec: 'bin/java'}
    let windowsJavaPath = 'java.exe';
    let darwinJavaPath = 'java';

    if (platform === 'win32') {
        java.path = windowsJavaPath;
        java.os = "windows"
        java.exec = "bin/java.exe"
    } else if (platform === 'darwin') {
        java.path = darwinJavaPath;
        java.os = "mac"
        java.exec = "Contents/Home/bin/java"
    }

    java.version = getJavaVersion(java.path);

    if (!java.version) {
        console.log("Java Version not found, working with internal JRE")

        let path = `/resources/jre/${java.os}/${process.arch}/${java.exec}`
        java.path = app.getAppPath().replace('app.asar', 'app.asar.unpacked') + path;

        java.version = getJavaVersion(java.path);
    }

    console.log("Java version is: " + java.version);
    console.log("Java Path is: " + java.path);

    return java;
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