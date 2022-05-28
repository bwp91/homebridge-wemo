import { request } from 'http';
import platformConsts from '../utils/constants.js';
import { parseError } from '../utils/functions.js';
import platformLang from '../utils/lang-en.js';

export default class {
  constructor(platform, accessory) {
    // Set up global vars from the platform
    this.debug = platform.config.debug;
    this.log = platform.log;
    this.platform = platform;
    this.upnpInterval = platform.config.upnpInterval;
    this.upnpIntervalMilli = this.upnpInterval * 1000;

    // Set up other variables we need
    this.accessory = accessory;
    this.name = accessory.displayName;
    this.services = accessory.context.serviceList;
    this.subs = {};
  }

  startSubscriptions() {
    // Subscribe to each of the services that the device supports, that the plugin uses
    Object.keys(this.services)
      .filter((el) => platformConsts.servicesToSubscribe.includes(el))
      .forEach((service) => {
        // Subscript to the service
        this.subs[service] = {};
        this.subscribe(service);
      });
  }

  stopSubscriptions() {
    Object.entries(this.subs).forEach((entry) => {
      const [serviceType, sub] = entry;
      if (sub.timeout) {
        clearTimeout(sub.timeout);
      }
      if (sub.status) {
        this.unsubscribe(serviceType);
      }
    });
    if (this.accessory.context.enableDebugLogging) {
      this.log.warn('[%s] %s.', this.name, platformLang.stoppedSubs);
    }
  }

  subscribe(serviceType) {
    try {
      // Check to see an already sent request is still pending
      if (this.subs[serviceType].status === 'PENDING') {
        if (this.accessory.context.enableDebugLogging) {
          this.log('[%s] [%s] %s.', this.name, serviceType, platformLang.subPending);
        }
        return;
      }

      // Set up the options for the subscription request
      const timeout = this.upnpInterval + 10;
      const options = {
        host: this.accessory.context.ipAddress,
        port: this.accessory.context.port,
        path: this.services[serviceType].eventSubURL,
        method: 'SUBSCRIBE',
        headers: { TIMEOUT: `Second-${timeout}` },
      };

      // The remaining options depend on whether the subscription already exists
      if (this.subs[serviceType].status) {
        // Subscription already exists so renew
        options.headers.SID = this.subs[serviceType].status;
      } else {
        // Subscription doesn't exist yet to set up for new subscription
        this.subs[serviceType].status = 'PENDING';
        if (this.accessory.context.enableDebugLogging) {
          this.log('[%s] [%s] %s.', this.name, serviceType, platformLang.subInit);
        }
        options.headers.CALLBACK = `<http://${this.accessory.context.cbURL}/${this.accessory.UUID}>`;
        options.headers.NT = 'upnp:event';
      }

      // Execute the subscription request
      const req = request(options, (res) => {
        if (res.statusCode === 200) {
          // Subscription request successful
          this.subs[serviceType].status = res.headers.sid;

          // Renew subscription after 150 seconds
          this.subs[serviceType].timeout = setTimeout(
            () => this.subscribe(serviceType),
            this.upnpIntervalMilli,
          );
        } else {
          // Subscription request failure
          if (this.accessory.context.enableDebugLogging) {
            this.log.warn(
              '[%s] [%s] %s [%s].',
              this.name,
              serviceType,
              platformLang.subError,
              res.statusCode,
            );
          }
          this.subs[serviceType].status = null;

          // Try to recover from a failed subscription after 10 seconds
          this.subs[serviceType].timeout = setTimeout(() => this.subscribe(serviceType), 10000);
        }
      });

      // Listen for errors on the subscription
      req.removeAllListeners('error');
      req.on('error', (err) => {
        if (!err) {
          return;
        }

        // Stop the subscriptions
        this.stopSubscriptions();

        // Use the platform function to disable the upnp client for this accessory
        this.platform.disableUPNP(this.accessory, err);
      });
      req.end();
    } catch (err) {
      // Catch any errors during the process
      if (this.accessory.context.enableLogging) {
        const eText = parseError(err);
        this.log.warn('[%s] [%s] %s %s.', this.name, serviceType, platformLang.subscribeError, eText);
      }
    }
  }

  unsubscribe(serviceType) {
    try {
      // Check to see an already sent request is still pending
      if (!this.subs[serviceType] || this.subs[serviceType].status === 'PENDING') {
        return;
      }

      // Set up the options for the subscription request
      const options = {
        host: this.accessory.context.ipAddress,
        port: this.accessory.context.port,
        path: this.services[serviceType].eventSubURL,
        method: 'UNSUBSCRIBE',
        headers: { SID: this.subs[serviceType].status },
      };

      // Execute the subscription request
      const req = request(options, (res) => {
        if (res.statusCode === 200) {
          // Unsubscribed
          if (this.accessory.context.enableDebugLogging) {
            this.log('[%s] [%s] unsubscribe successful.', this.name, serviceType);
          }
        } else if (this.accessory.context.enableDebugLogging) {
        // Subscription request failure
          this.log.warn(
            '[%s] [%s] %s [%s].',
            this.name,
            serviceType,
            platformLang.unsubFail,
            res.statusCode,
          );
        }
      });

      // Listen for errors on the subscription
      req.removeAllListeners('error');
      req.on('error', (err) => {
        if (!err) {
          return;
        }
        if (this.accessory.context.enableDebugLogging) {
          this.log.warn(
            '[%s] [%s] %s [%s].',
            this.name,
            serviceType,
            platformLang.unsubFail,
            err.message,
          );
        }
      });
      req.end();
    } catch (err) {
      if (this.accessory.context.enableLogging) {
        const eText = parseError(err);
        this.log.warn('[%s] [%s] %s [%s].', this.name, serviceType, platformLang.unsubFail, eText);
      }
    }
  }
}
