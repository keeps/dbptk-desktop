const net = require('net');

module.exports.findFreePort = function (startPort = 3000, endPort = 65535) {
    return new Promise((resolve, reject) => {
      let currentPort = startPort;
  
      const server = net.createServer();
      server.unref();
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          currentPort++;
          if (currentPort > endPort) {
            reject(new Error('There are no free ports available in the specified range.'));
          } else {
            server.listen(currentPort);
          }
        } else {
          reject(err);
        }
      });
  
      server.on('listening', () => {
        const port = server.address().port;
        server.close(() => {
          resolve(port);
        });
      });
  
      server.listen(currentPort);
    });
  }