const os = require("os");
const electronSettings = require('electron-settings');
const MINIMAL_MEMORY_MB=256

module.exports = class MemoryManager {
    getOsMemory() {
        return os.freemem();
    }

    getMaxHeapMemory() {
        return Math.floor(this.getOsMemory() * 3 / (4 * Math.pow(2, 10))) * Math.pow(2, 10);
    }

    getMinHeapMemory() {
        return MINIMAL_MEMORY_MB * Math.pow(2, 20);
    }

    getMaxHeapMemorySettings() {
        let memorySettings = electronSettings.get('maxHeapMemory');
        if(memorySettings == null || memorySettings > this.getOsMemory()){
            this.setMaxHeapMemorySettings(memorySettings)
            return this.getMaxHeapMemory();
        }
        return electronSettings.get('maxHeapMemory');
    }

    setMaxHeapMemorySettings(maxHeapMemory) {
        if (maxHeapMemory != null && maxHeapMemory <= this.getOsMemory()){
            electronSettings.set('maxHeapMemory', maxHeapMemory);    
        } else {
            electronSettings.set('maxHeapMemory', this.getMaxHeapMemory());
        }
    }

    getHumanizedMemoryValue(memory) {
        return (memory / Math.pow(1024, 3)).toFixed(2)
    }

    convertGBinBytes(memoryGB) {
        return (memoryGB * Math.pow(1024, 3)).toFixed(2)
    }
}