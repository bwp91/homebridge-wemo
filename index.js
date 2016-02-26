var Service, Characteristic;
var net = require('net');
var TelnetInput = require('telnet-stream').TelnetInput;
var TelnetOutput = require('telnet-stream').TelnetOutput;

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

  if (!this.device) {
    this.log("No '%s' device found (yet?)", this.wemoName);
    callback(new Error("Device not found"), false);
    return;
  }

  this.log("Getting power state on the '%s'...", this.wemoName);

  this.device.getBinaryState(function(err, result) {
    if (!err) {
      var binaryState = parseInt(result);
      var powerOn = binaryState > 0;
      this.log("Power state for the '%s' is %s", this.wemoName, binaryState);
      callback(null, powerOn);
    }
    else {
      this.log("Error getting power state on the '%s': %s", this.wemoName, err.message);
      callback(err);
    }
  }.bind(this));
}

WeMoAccessory.prototype.setPowerOn = function(powerOn, callback) {

  if (!this.device) {
    this.log("No '%s' device found (yet?)", this.wemoName);
    callback(new Error("Device not found"));
    return;
  }

  var binaryState = powerOn ? 1 : 0; // wemo langauge
  this.log("Setting power state on the '%s' to %s", this.wemoName, binaryState);

  var callbackWasCalled = false;

  this.device.setBinaryState(binaryState, function(err, result) {
    if (callbackWasCalled) {
      this.log("WARNING: setBinaryState called its callback more than once! Discarding the second one.");
    }
    
    callbackWasCalled = true;
    
    if (!err) {
      this.log("Successfully set power state on the '%s' to %s", this.wemoName, binaryState);
      callback(null);
    }
    else {
      this.log("Error setting power state to %s on the '%s'", binaryState, this.wemoName);
      callback(err);
    }
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


