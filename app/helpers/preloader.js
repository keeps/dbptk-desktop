//This script will load before all DBVTK client libraries

//Renamed symbols in the page to avoid conflicts with some libraries in client
window.nodeRequire = require;
delete window.require;
delete window.exports;
delete window.module;