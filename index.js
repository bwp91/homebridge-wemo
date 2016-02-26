var Service, Characteristic;
var net = require('net');
var HOST = '192.168.178.20';
var PORT = 23;

module.exports = function(homebridge) {

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-vsx", "VSX", Computer);
}

function VSX(log, config) {
  this.log = log;
  this.name = config.name;
  this.ip = config.ip;

  this._service = new Service.Switch(this.name);
  this._service.getCharacteristic(Characteristic.On)
    .on('set', this._setOn.bind(this));
}

Computer.prototype.getServices = function() {
  return [this._service];
}

Computer.prototype._setOn = function(on, callback) {

  if(on){
    var client = new net.Socket();
    client.connect(PORT, HOST, function() {

    console.log('CONNECTED TO: ' + HOST + ':' + PORT);
    // Write a message to the socket as soon as the client is connected, the server will receive it as message from the client 
    client.write('PO');

});
  }

  callback();
}
