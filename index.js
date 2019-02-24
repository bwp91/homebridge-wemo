var Service, Characteristic;
var net = require('net');

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-vsx", "VSX", VSX);
};

function VSX(log, config) {
  this.log = log;
  this.name = config.name;
  this.HOST = config.ip;
  this.PORT = config.port;
  this.INPUT = config.input;
}

VSX.prototype.getServices = function () {
  this.informationService = new Service.AccessoryInformation();
  this.informationService.setCharacteristic(
      Characteristic.Manufacturer, "Pioneer");

  this.switchService = new Service.Switch(this.name);
  this.switchService.getCharacteristic(Characteristic.On)
  .on('set', this.setOn.bind(this))
  .on('get', this.getOn.bind(this));

  return [this.switchService, this.informationService];
};

VSX.prototype.getOn = function (callback) {

  const me = this;
  me.log('Query Power Status on '
      + me.HOST + ':' + me.PORT + " input " + me.INPUT);

  var client = new net.Socket();
  client.on('error', function (ex) {
    me.log("Received an error while communicating" + ex);
    callback(ex)
  });

  client.connect(me.PORT, me.HOST, function () {
    client.write('?P\r\n');
  });

  client.on('data', function (data) {
    me.log('Received data: ' + data);

    var str = data.toString();

    if (str.includes("PWR1")) {
      me.log("Power is Off");
      client.destroy();
      callback(null, false);
    } else if (str.includes("PWR0")) {
      me.log("Power is On");
      if (me.INPUT) {
        client.write('?F\r\n'); // Request input
      } else {
        callback(null, true);
        client.destroy();
      }
    } else if (str.includes("FN")) {
      me.log("Current input is " + str);
      client.destroy();
      if (str.includes(me.INPUT)) {
        me.log("Current input matches target input of " + me.INPUT);
        callback(null, true);
      } else {
        me.log("Receiver has different input selected");
        callback(null, false);
      }
    } else {
      me.log("waiting");
    }
  });
};

VSX.prototype.setOn = function (on, callback) {

  const me = this;
  var client = new net.Socket();
  client.on('error', function (ex) {
    me.log("Received an error while communicating" + ex);
    callback(ex)
  });

  if (on) {
    client.connect(me.PORT, me.HOST, function () {
      me.log('Set Power On on '
          + me.HOST + ':' + me.PORT + " input " + me.INPUT);
      client.write('PO\r\n');
      if (me.INPUT == null) {
        client.destroy();
      }
    });
    client.on('data', function (data) {
      me.log("Change input to " + me.INPUT);
      client.write(me.INPUT + 'FN\r\n');
      client.destroy();
    });
  }

  if (!on) {
    client.connect(me.PORT, me.HOST, function () {
      me.log('Set Power Off on ' + me.HOST + ':' + me.PORT);
      client.write('PF\r\n');
      client.destroy();
    });
  }
  callback();
};


