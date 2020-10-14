const { ipcRenderer, clipboard } = require('electron');

const logsPanel = document.getElementById("logsPanel")
const showLogsBtn = document.getElementById("showLogs")
const hideLogsBtn = document.getElementById("hideLogs")
const copyLogsBtn = document.getElementById("copyLogs")
const settingsBtn = document.getElementById("settings")
const closeApp = document.getElementById('closeApp');

showLogsBtn.addEventListener("click", function(event) {
    event.preventDefault();
    logsPanel.style.display = "flex";
    showLogsBtn.style.display = "none";
    hideLogsBtn.style.display = "block";
    copyLogsBtn.style.display = "block";
    settingsBtn.style.display = "block";
    ipcRenderer.send("REZISE", true)
})

hideLogsBtn.addEventListener("click", function(event) {
    event.preventDefault();
    logsPanel.style.display = "none";
    showLogsBtn.style.display = "block";
    hideLogsBtn.style.display = "none";
    copyLogsBtn.style.display = "none";
    settingsBtn.style.display = "none";
    ipcRenderer.send("REZISE", false)
})

copyLogsBtn.addEventListener("click", function(event) {
    let jvmLog = document.getElementById("jvmLog")
    clipboard.writeText(jvmLog.value)
})

ipcRenderer.on("UPDATED_LOG_LIST", (event, data) => {
    let jvmLog = document.getElementById("jvmLog")
    jvmLog.value = data;
    jvmLog.scrollTop = jvmLog.scrollHeight;
})

closeApp.addEventListener('click', () => {
    ipcRenderer.send('CLOSE_APP')
});

settingsBtn.addEventListener('click', () => { 
    ipcRenderer.send('OPEN_SETTINGS')
})