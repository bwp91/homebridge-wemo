var Service, Characteristic;
var net = require('net');

module.exports = function(homebridge){
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-vsx", "VSX", VSXAccessory);
}

function VSXAccessory(log, config) {
  this.log = log;
  this.name = config["name"];
  this.ip = config["ip"];
  this.device = null;
}

VSXAccessory.prototype.getPowerOn = function(callback) {


  }.bind(this));
}

VSXAccessory.prototype.setPowerOn = function(powerOn, callback) {

  
  }.bind(this));
}

WeMoAccessory.prototype.getServices = function() {
  
    var switchService = new Service.Switch(this.name);
    
    switchService
      .getCharacteristic(Characteristic.On)
      .on('get', this.getPowerOn.bind(this))
      .on('set', this.setPowerOn.bind(this));
    
    return [switchService];
 
  }
}


