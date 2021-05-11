const { ipcRenderer } = require('electron');
const os = require('os');

let applyBtn = document.getElementById("apply")
let notificationChanges = document.getElementById("notificationChanges")

applyBtn.addEventListener("click", function (event) {
    event.preventDefault();
    let language = document.getElementById("language");
    let tmpDir = document.getElementById("tmpDir");
    let useGMT = document.getElementById("useGMT");
    let memory = document.getElementById("memory");
    let data = {
        "language": language.value,
        "memory": memory.value,
        "tmpDir": tmpDir.value,
        "useGMT": useGMT.checked == true
    }
    ipcRenderer.send("APPLY_SETTINGS_EVENT", data)
})

let resetBtn = document.getElementById("close")
resetBtn.addEventListener("click", function (event) {
    event.preventDefault();
    ipcRenderer.send("CLOSE_WINDOW_EVENT");
})

ipcRenderer.on("BUILD_SETTINGS_EVENT", (event, data) => {
    let fileLocation = document.getElementById("fileLocation")
    let memory = document.getElementById("memory");
    let memoryDisplay = document.getElementById("memoryDisplay");
    
    fileLocation.innerText = data.fileLocation

    let language = document.getElementById("language");
    language.addEventListener('change', function () {
        applyBtn.disabled = false;
        notificationChanges.style.display = "block"
    })

    for (let i = 0; i < language.options.length; i++) {
        if (language.options[i].value == data.language) {
            language.options[i].selected = true;
        }
    }

    let btnOpen = document.getElementById("btnOpen");
    btnOpen.addEventListener('click', function () {
        var path = ipcRenderer.sendSync('show-open-dialog', {
            properties: ['openDirectory']
          })
        let tmpDir = document.getElementById("tmpDir");
        if (path) {
        applyBtn.disabled = false;
        notificationChanges.style.display = "block"
        tmpDir.value = path;
        }
    })

    if (data.tmpDir) {
        let tmpDir = document.getElementById("tmpDir");
        tmpDir.value = data.tmpDir;
    } else {
        tmpDir.value = os.tmpdir();
    }

    let useGMT = document.getElementById("useGMT");
    if(data.useGMT) {
        useGMT.checked = true
    }
    useGMT.addEventListener('change', function () {
        applyBtn.disabled = false;
        notificationChanges.style.display = "block"
    })

    memory.max = data.OsMemory
    memory.min = data.minMemory
    if (data.maxHeapMemorySettings) {
        memory.value = data.maxHeapMemorySettings
    } else {
        memory.value = data.minMemory
    }
    memoryDisplay.value = ipcRenderer.sendSync("GET_HUMANIZED_MEMORY_VALUE", memory.value);


    memory.addEventListener("input", function () {
        applyBtn.disabled = false;
        notificationChanges.style.display = "block"
        memoryDisplay.value = ipcRenderer.sendSync("GET_HUMANIZED_MEMORY_VALUE", memory.value);
    })

    memoryDisplay.addEventListener("change", function () {
        applyBtn.disabled = false;
        notificationChanges.style.display = "block"
        memoryDisplay.value = ipcRenderer.sendSync("GET_HUMANIZED_MEMORY_VALUE", memoryValueInBytes);
        memory.value = memoryValueInBytes
    })
});