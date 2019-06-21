const { spawnSync } = require('child_process');

module.exports.getjavaVersionAndPath = function () {        
    let platform = process.platform;
    let java = {path:'java', version:null, process:null}
    let windowsJavaPath = 'java.exe';
    let darwinJavaPath = 'java';

    if (platform === 'win32') {
        java.path = windowsJavaPath;
    } else if (platform === 'darwin') {
        java.path = darwinJavaPath;
    }

    java.process = spawnSync(java.path, ['-version'], {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'pipe',
        encoding: 'utf-8'
    });

    data = String(java.process.stderr).split('\n')[0];
    java.version = new RegExp('java version').test(data) ? data.split(' ')[2].replace(/"/g, '') : false;

    if (!java.version) {
        throw new Error("Java version not found, please install JRE 1.8 or later");
    }

    console.log("Java version is: " + java.version);

    return java;
}