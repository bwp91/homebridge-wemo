var Service, Characteristic;
var net = require('net');

module.exports = function(homebridge){
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-vsx", "VSX", VSXAccessory);
}

function VSXAccessory(config) {
  this.name = config["name"];
  this.ip = config["ip"];
  this.port = 23;
}

VSXAccessory.prototype.getPowerOn = function(callback) {


  }.bind(this));
}

VSXAccessory.prototype.setPowerOn = function(powerOn, callback) {

  var client = new net.Socket();
client.connect(port, host, function() {

    console.log('CONNECTED TO: ' + HOST + ':' + PORT);
    // Write a message to the socket as soon as the client is connected, the server will receive it as message from the client 
    client.write('PO');

});

// Add a 'data' event handler for the client socket
// data is what the server sent to this socket
client.on('data', function(data) {
    
    console.log('DATA: ' + data);
    // Close the client socket completely
    client.destroy();
    
});

// Add a 'close' event handler for the client socket
client.on('close', function() {
    console.log('Connection closed');
});
  }.bind(this));
}

VSXAccessory.prototype.getServices = function() {
  
    var switchService = new Service.Switch(this.name);
    
    switchService
      .getCharacteristic(Characteristic.On)
      .on('get', this.getPowerOn.bind(this))
      .on('set', this.setPowerOn.bind(this));
    
    return [switchService];
 
  }
}


