import axios from 'axios';
// eslint-disable-next-line import/no-unresolved
import PQueue from 'p-queue';
import xml2js from 'xml2js';
import xmlbuilder from 'xmlbuilder';
import platformFuncs from '../utils/functions.js';
import platformLang from '../utils/lang-en.js';

export default class {
  constructor(platform) {
    // Set up global vars from the platform
    this.debug = platform.config.debug;
    this.log = platform.log;
    this.platform = platform;
    this.queue = new PQueue({
      concurrency: 1,
      interval: 250,
      intervalCap: 1,
      timeout: 9000,
      throwOnTimeout: true,
    });
  }

  async sendDeviceUpdate(accessory, serviceType, action, body) {
    try {
      return await this.queue.add(async () => {
        // Check the device has this service (it should have)
        if (
          !accessory.context.serviceList[serviceType]
          || !accessory.context.serviceList[serviceType].controlURL
        ) {
          throw new Error(platformLang.noService);
        }

        // Generate the XML to send to the device
        const xml = xmlbuilder
          .create('s:Envelope', {
            version: '1.0',
            encoding: 'utf-8',
            allowEmpty: true,
          })
          .att('xmlns:s', 'http://schemas.xmlsoap.org/soap/envelope/')
          .att('s:encodingStyle', 'http://schemas.xmlsoap.org/soap/encoding/')
          .ele('s:Body')
          .ele(`u:${action}`)
          .att('xmlns:u', serviceType);

        // Send the request to the device
        const hostPort = `http://${accessory.context.ipAddress}:${accessory.context.port}`;
        const res = await axios({
          url: hostPort + accessory.context.serviceList[serviceType].controlURL,
          method: 'post',
          headers: {
            SOAPACTION: `"${serviceType}#${action}"`,
            'Content-Type': 'text/xml; charset="utf-8"',
          },
          data: (body ? xml.ele(body) : xml).end(),
          timeout: 10000,
        });

        // Parse the response from the device
        const xmlRes = res.data;
        const response = await xml2js.parseStringPromise(xmlRes, {
          explicitArray: false,
        });

        if (!accessory.context.httpOnline) {
          this.platform.updateHTTPStatus(accessory, true);
        }

        // Return the parsed response
        return response['s:Envelope']['s:Body'][`u:${action}Response`];
      });
    } catch (err) {
      const eText = platformFuncs.parseError(err);
      if (['at Object.<anonymous>', 'EHOSTUNREACH'].some((el) => eText.includes(el))) {
        // Device disconnected from network
        if (accessory.context.httpOnline) {
          this.platform.updateHTTPStatus(accessory, false);
        }
        throw new Error(
          eText.includes('EHOSTUNREACH') ? platformLang.timeoutUnreach : platformLang.timeout,
        );
      }
      throw err;
    }
  }

  async receiveDeviceUpdate(accessory, body) {
    try {
      if (accessory.context.enableDebugLogging) {
        this.log('[%s] %s:\n%s', accessory.displayName, platformLang.incKnown, body.trim());
      }
      // Convert the XML to JSON
      const json = await xml2js.parseStringPromise(body, { explicitArray: false });

      // Loop through the JSON for the necessary information
      // eslint-disable-next-line no-restricted-syntax
      for (const prop in json['e:propertyset']['e:property']) {
        if (platformFuncs.hasProperty(json['e:propertyset']['e:property'], prop)) {
          const data = json['e:propertyset']['e:property'][prop];
          switch (prop) {
            case 'BinaryState':
              try {
                accessory.control.receiveDeviceUpdate({
                  name: 'BinaryState',
                  value: parseInt(data.substring(0, 1), 10),
                });
              } catch (err) {
                const eText = platformFuncs.parseError(err);
                this.log.warn('[%s] %s %s %s.', accessory.displayName, prop, platformLang.proEr, eText);
              }
              break;
            case 'Brightness':
              try {
                accessory.control.receiveDeviceUpdate({
                  name: 'Brightness',
                  value: parseInt(data, 10),
                });
              } catch (err) {
                const eText = platformFuncs.parseError(err);
                this.log.warn('[%s] %s %s %s.', accessory.displayName, prop, platformLang.proEr, eText);
              }
              break;
            case 'InsightParams': {
              try {
                const params = data.split('|');
                accessory.control.receiveDeviceUpdate({
                  name: 'InsightParams',
                  value: {
                    state: parseInt(params[0], 10),
                    power: parseInt(params[7], 10),
                    todayWm: parseFloat(params[8]),
                    todayOnSeconds: parseFloat(params[3]),
                  },
                });
              } catch (err) {
                const eText = platformFuncs.parseError(err);
                this.log.warn('[%s] %s %s %s.', accessory.displayName, prop, platformLang.proEr, eText);
              }
              break;
            }
            case 'attributeList':
              try {
                const decoded = platformFuncs.decodeXML(data);
                const xml = `<attributeList>${decoded}</attributeList>`;
                // eslint-disable-next-line no-await-in-loop
                const result = await xml2js.parseStringPromise(xml, { explicitArray: true });
                result.attributeList.attribute.forEach((attribute) => {
                  accessory.control.receiveDeviceUpdate({
                    name: attribute.name[0],
                    value: parseInt(attribute.value[0], 10),
                  });
                });
              } catch (err) {
                const eText = platformFuncs.parseError(err);
                this.log.warn('[%s] %s %s %s.', accessory.displayName, prop, platformLang.proEr, eText);
              }
              break;
            case 'StatusChange':
              try {
                // eslint-disable-next-line no-await-in-loop
                const xml = await xml2js.parseStringPromise(data, { explicitArray: false });
                accessory.control.receiveDeviceUpdate(xml.StateEvent.DeviceID._, {
                  name: xml.StateEvent.CapabilityId,
                  value: xml.StateEvent.Value,
                });
              } catch (err) {
                const eText = platformFuncs.parseError(err);
                this.log.warn('[%s] %s %s %s.', accessory.displayName, prop, platformLang.proEr, eText);
              }
              break;
            default:
              return;
          }
        }
      }
    } catch (err) {
      // Catch any errors during this process
      if (accessory.context.enableLogging) {
        const eText = platformFuncs.parseError(err);
        this.log.warn('[%s] %s %s.', accessory.displayName, platformLang.incFail, eText);
      }
    }
  }
}
