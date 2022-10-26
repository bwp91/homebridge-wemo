import { hasProperty, parseError } from '../utils/functions.js';
import platformLang from '../utils/lang-en.js';

export default class {
  constructor(platform, accessory) {
    // Set up variables from the platform
    this.hapChar = platform.api.hap.Characteristic;
    this.hapErr = platform.api.hap.HapStatusError;
    this.hapServ = platform.api.hap.Service;
    this.log = platform.log;
    this.platform = platform;

    // Set up variables from the accessory
    this.accessory = accessory;
    this.enableLogging = accessory.context.enableLogging;
    this.enableDebugLogging = accessory.context.enableDebugLogging;
    this.name = accessory.displayName;

    // If the accessory has an switch service then remove it
    if (this.accessory.getService(this.hapServ.Switch)) {
      this.accessory.removeService(this.accessory.getService(this.hapServ.Switch));
    }

    // If the accessory has an air purifier service then remove it
    if (this.accessory.getService(this.hapServ.AirPurifier)) {
      this.accessory.removeService(this.accessory.getService(this.hapServ.AirPurifier));
    }

    // Add the outlet service if it doesn't already exist
    this.service = this.accessory.getService(this.hapServ.Outlet)
      || this.accessory.addService(this.hapServ.Outlet);

    // Add the set handler to the outlet on/off characteristic
    this.service
      .getCharacteristic(this.hapChar.On)
      .onSet(async (value) => this.internalStateUpdate(value));

    // Remove the outlet-in-use characteristic as it only matches the state in this case
    if (this.service.testCharacteristic(this.hapChar.OutletInUse)) {
      this.service.removeCharacteristic(this.service.getCharacteristic(this.hapChar.OutletInUse));
    }

    // Output the customised options to the log
    const normalLogging = this.enableLogging ? 'standard' : 'disable';
    const opts = JSON.stringify({
      logging: this.enableDebugLogging ? 'debug' : normalLogging,
      showAs: 'outlet',
    });
    this.log('[%s] %s %s.', this.name, platformLang.devInitOpts, opts);

    // Request a device update immediately
    this.requestDeviceUpdate();

    // Start a polling interval if the user has disabled upnp
    if (this.accessory.context.connection === 'http') {
      this.pollingInterval = setInterval(
        () => this.requestDeviceUpdate(),
        platform.config.pollingInterval * 1000,
      );
    }
  }

  receiveDeviceUpdate(attribute) {
    // Log the receiving update if debug is enabled
    if (this.enableDebugLogging) {
      this.log('[%s] %s [%s: %s].', this.name, platformLang.recUpd, attribute.name, attribute.value);
    }

    // Send a HomeKit needed true/false argument
    // attribute.value is 0 if and only if the outlet is off
    this.externalStateUpdate(attribute.value !== 0);
  }

  async sendDeviceUpdate(value) {
    // Log the sending update if debug is enabled
    if (this.enableDebugLogging) {
      this.log('[%s] %s %s.', this.name, platformLang.senUpd, JSON.stringify(value));
    }

    // Send the update
    await this.platform.httpClient.sendDeviceUpdate(
      this.accessory,
      'urn:Belkin:service:basicevent:1',
      'SetBinaryState',
      value,
    );
  }

  async requestDeviceUpdate() {
    try {
      // Request the update
      const data = await this.platform.httpClient.sendDeviceUpdate(
        this.accessory,
        'urn:Belkin:service:basicevent:1',
        'GetBinaryState',
      );

      // Check for existence since BinaryState can be int 0
      if (hasProperty(data, 'BinaryState')) {
        // Send the data to the receive function
        this.receiveDeviceUpdate({
          name: 'BinaryState',
          value: parseInt(data.BinaryState, 10),
        });
      }
    } catch (err) {
      if (this.enableDebugLogging) {
        const eText = parseError(err, [
          platformLang.timeout,
          platformLang.timeoutUnreach,
          platformLang.noService,
        ]);
        this.log.warn('[%s] %s %s.', this.name, platformLang.rduErr, eText);
      }
    }
  }

  async internalStateUpdate(value) {
    try {
      // Send the update
      await this.sendDeviceUpdate({
        BinaryState: value ? 1 : 0,
      });

      // Update the cache value and log the change if appropriate
      this.cacheState = value;
      if (this.enableLogging) {
        this.log('[%s] %s [%s].', this.name, platformLang.curState, value ? 'on' : 'off');
      }
    } catch (err) {
      // Catch any errors
      const eText = parseError(err, [platformLang.timeout, platformLang.timeoutUnreach]);
      this.log.warn('[%s] %s %s.', this.name, platformLang.cantCtl, eText);

      // Throw a 'no response' error and set a timeout to revert this after 2 seconds
      setTimeout(() => {
        this.service.updateCharacteristic(this.hapChar.On, this.cacheState);
      }, 2000);
      throw new this.hapErr(-70402);
    }
  }

  externalStateUpdate(value) {
    try {
      // Check to see if the cache value is different
      if (value === this.cacheState) {
        return;
      }

      // Update the HomeKit characteristics
      this.service.updateCharacteristic(this.hapChar.On, value);

      // Update the cache value and log the change if appropriate
      this.cacheState = value;
      if (this.enableLogging) {
        this.log('[%s] %s [%s].', this.name, platformLang.curState, value ? 'on' : 'off');
      }
    } catch (err) {
      // Catch any errors
      const eText = parseError(err);
      this.log.warn('[%s] %s %s.', this.name, platformLang.cantUpd, eText);
    }
  }
}
