const { ipcRenderer } = require('electron');

let applyBtn = document.getElementById("apply")
let notification = document.getElementById("notification")

applyBtn.addEventListener("click", function(event) {
    event.preventDefault();
    let language = document.getElementById("language");
    let memory = document.getElementById("memory");
    let data = {
        "language" : language.value,
        "memory" : memory.value
    }
    ipcRenderer.send("APPLY_SETTINGS_EVENT", data)
})

let resetBtn = document.getElementById("close")
resetBtn.addEventListener("click", function(event) {
    event.preventDefault();
    ipcRenderer.send("CLOSE_WINDOW_EVENT");
})

ipcRenderer.on("BUILD_SETTINGS_EVENT", (event, data) => {
    let language = document.getElementById("language");
    language.addEventListener('change', function(){
        applyBtn.disabled = false;
        notification.style.display = "block"
    })

    for (let i = 0; i < language.options.length; i++) {
        if(language.options[i].value == data.language){
            language.options[i].selected = true;
        }   
    }

    let memory = document.getElementById("memory");
    let memoryDisplay = document.getElementById("memoryDisplay");
    
    memory.max=data.OsMemory
    memory.min=data.minMemory
    memory.value=data.maxHeapMemorySettings
    memoryDisplay.value=ipcRenderer.sendSync("GET_HUMANIZED_MEMORY_VALUE", memory.value);
    memory.addEventListener("input", function (){
        if(memory.value >= data.maxMemory ){
            memory.value = data.maxMemory;
        } 
          applyBtn.disabled = false;
          notification.style.display = "block"
          memoryDisplay.value=ipcRenderer.sendSync("GET_HUMANIZED_MEMORY_VALUE", memory.value);
    })

    memoryDisplay.addEventListener("change", function (){
        let memoryValueInBytes = ipcRenderer.sendSync("GET_MEMORY_VALUE_IN_BYTES", memoryDisplay.value);
        if(memoryValueInBytes >= data.maxMemory ){
            memoryValueInBytes = data.maxMemory
        } else if (memoryValueInBytes <= data.minMemory ) {
            memoryValueInBytes = data.minMemory
        }
        applyBtn.disabled = false;
        notification.style.display = "block"
        memoryDisplay.value = ipcRenderer.sendSync("GET_HUMANIZED_MEMORY_VALUE", memoryValueInBytes);
        memory.value = memoryValueInBytes
    })
});