const os = require("os");
const log = require('electron-log');
const electronSettings = require('electron-settings');
const MINIMAL_MEMORY_MB=256

module.exports = class MemoryManager {
    getFreeMemory() {
        return os.freemem();
    }

    getOsMemoryTotal() {
        return os.totalmem();
    }

    getMinHeapMemory() {
        return MINIMAL_MEMORY_MB * Math.pow(2, 20);
    }

    getMaxHeapMemorySettings() {
        let memorySettings = electronSettings.getSync('maxHeapMemory');
        if( memorySettings <= this.getOsMemoryTotal() && memorySettings >= this.getMinHeapMemory() ) {
            log.info("Configured memory: " + this.getHumanizedMemoryValue(memorySettings) + "GB")
            return electronSettings.getSync('maxHeapMemory');
        } 
        if( memorySettings == null ){
            log.info("Memory is not set")
        } else if( memorySettings > this.getOsMemoryTotal() ){
            log.warn("Configured memory ("+ this.getHumanizedMemoryValue(memorySettings)+") is larger than the total of memory on the system")
        } else {
            log.warn("Configured memory ("+ this.getHumanizedMemoryValue(memorySettings)+") is less than the minimum required")
        }
        log.info("Delegating responsibility to the JVM")
        electronSettings.unset('maxHeapMemory')
        return null;
    }

    setMaxHeapMemorySettings(maxHeapMemory) {
        if( maxHeapMemory <= this.getOsMemoryTotal() && maxHeapMemory >= this.getMinHeapMemory() ) {
            log.info("setting heap memory to: " + this.getHumanizedMemoryValue(maxHeapMemory) + "GB")
            electronSettings.setSync('maxHeapMemory', maxHeapMemory);
        } else {
            log.warn("Delegating responsibility to the JVM")
            electronSettings.unset('maxHeapMemory')
        }
    }

    getHumanizedMemoryValue(memory) {
        return (memory / Math.pow(1024, 3)).toFixed(2)
    }

    convertGBinBytes(memoryGB) {
        return (memoryGB * Math.pow(1024, 3)).toFixed(2)
    }
}