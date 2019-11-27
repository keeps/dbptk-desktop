const { ipcRenderer } = require('electron');

let logsPanel = document.getElementById("logsPanel")
let showLogsBtn = document.getElementById("showLogs")
let hideLogsBtn = document.getElementById("hideLogs")

showLogsBtn.addEventListener("click", function(event) {
    event.preventDefault();
    logsPanel.style.display = "flex";
    showLogsBtn.style.display = "none";
    hideLogsBtn.style.display = "block";
    ipcRenderer.send("REZISE", true)
})

hideLogsBtn.addEventListener("click", function(event) {
    event.preventDefault();
    logsPanel.style.display = "none";
    showLogsBtn.style.display = "block";
    hideLogsBtn.style.display = "none";
    ipcRenderer.send("REZISE", false)
})

ipcRenderer.on("UPDATED_LOG_LIST", (event, data) => {
    let jvmLog = document.getElementById("jvmLog")
    jvmLog.value = data;
    jvmLog.scrollTop = jvmLog.scrollHeight;
})