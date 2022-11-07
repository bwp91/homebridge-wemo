import { Builder, parseStringPromise } from 'xml2js';
import { decodeXML, parseError } from '../utils/functions.js';
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

    // Add the switch service if it doesn't already exist
    this.service = this.accessory.getService(this.hapServ.Switch)
      || this.accessory.addService(this.hapServ.Switch);

    // Add the set handler to the outlet on/off characteristic
    this.service
      .getCharacteristic(this.hapChar.On)
      .removeOnSet()
      .onSet(async (value) => this.internalModeUpdate(value));

    // Output the customised options to the log
    const normalLogging = this.enableLogging ? 'standard' : 'disable';
    const opts = JSON.stringify({
      logging: this.enableDebugLogging ? 'debug' : normalLogging,
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

    // Check which attribute we are getting
    switch (attribute.name) {
      case 'Mode':
        this.externalModeUpdate(attribute.value);
        break;
      default:
    }
  }

  async sendDeviceUpdate(attributes) {
    // Log the sending update if debug is enabled
    if (this.enableDebugLogging) {
      this.log('[%s] %s %s.', this.name, platformLang.senUpd, JSON.stringify(attributes));
    }

    // Generate the XML to send
    const builder = new Builder({
      rootName: 'attribute',
      headless: true,
      renderOpts: { pretty: false },
    });
    const xmlAttributes = Object.keys(attributes)
      .map((attributeKey) => builder.buildObject({
        name: attributeKey,
        value: attributes[attributeKey],
      }))
      .join('');

    // Send the update
    await this.platform.httpClient.sendDeviceUpdate(
      this.accessory,
      'urn:Belkin:service:deviceevent:1',
      'SetAttributes',
      {
        attributeList: { '#text': xmlAttributes },
      },
    );
  }

  async requestDeviceUpdate() {
    try {
      // Request the update
      const data = await this.platform.httpClient.sendDeviceUpdate(
        this.accessory,
        'urn:Belkin:service:deviceevent:1',
        'GetAttributes',
      );

      // Parse the response
      const decoded = decodeXML(data.attributeList);
      const xml = `<attributeList>${decoded}</attributeList>`;
      const result = await parseStringPromise(xml, { explicitArray: false });
      Object.keys(result.attributeList.attribute).forEach((key) => {
        // Only send the required attributes to the receiveDeviceUpdate function
        switch (result.attributeList.attribute[key].name) {
          case 'Mode':
            this.receiveDeviceUpdate({
              name: result.attributeList.attribute[key].name,
              value: parseInt(result.attributeList.attribute[key].value, 10),
            });
            break;
          default:
        }
      });
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

  async internalModeUpdate(value) {
    try {
      // Coffee maker cannot be turned off remotely
      if (!value) {
        throw new Error('coffee maker cannot be turned off remotely');
      }

      // Send the update to turn ON
      await this.sendDeviceUpdate({ Mode: 4 });

      // Update the cache value and log the change if appropriate
      this.cacheState = true;
      if (this.enableLogging) {
        this.log('[%s] %s [%s].', this.name, platformLang.curState, 'on');
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

  externalModeUpdate(value) {
    try {
      // Value of 4 means brewing (ON) otherwise (OFF)
      value = value === 4;

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
