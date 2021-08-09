/* jshint node: true,esversion: 9, -W014, -W033 */
/* eslint-disable new-cap */
'use strict'

const http = require('http')

module.exports = class connectionUPNP {
  constructor (platform, accessory) {
    // Set up global vars from the platform
    this.consts = platform.consts
    this.debug = platform.config.debug
    this.funcs = platform.funcs
    this.log = platform.log
    this.lang = platform.lang
    this.platform = platform

    // Set up other variables we need
    this.accessory = accessory
    this.name = accessory.displayName
    this.services = accessory.context.serviceList
    this.subs = {}
  }

  startSubscriptions () {
    // Subscribe to each of the services that the device supports, that the plugin uses
    Object.keys(this.services)
      .filter(el => this.consts.servicesToSubscribe.includes(el))
      .forEach(service => {
        // Subscript to the service
        this.subs[service] = {}
        this.subscribe(service)
      })
  }

  stopSubscriptions () {
    for (const [serviceType, sub] of Object.entries(this.subs)) {
      if (sub.timeout) {
        clearTimeout(sub.timeout)
      }
      if (sub.status) {
        this.unsubscribe(serviceType)
      }
    }
    this.subs = {}
    if (this.accessory.context.enableDebugLogging) {
      this.log.warn('[%s] %s.', this.name, this.lang.stoppedSubs)
    }
  }

  subscribe (serviceType) {
    try {
      // Check to see an already sent request is still pending
      if (this.subs[serviceType].status === 'PENDING') {
        if (this.accessory.context.enableDebugLogging) {
          this.log('[%s] [%s] %s.', this.name, serviceType, this.lang.subPending)
        }
        return
      }

      // Set up the options for the subscription request
      const options = {
        host: this.accessory.context.ipAddress,
        port: this.accessory.context.port,
        path: this.services[serviceType].eventSubURL,
        method: 'SUBSCRIBE',
        headers: { TIMEOUT: 'Second-125' }
      }

      // The remaining options depend on whether the subscription already exists
      if (this.subs[serviceType].status) {
        // Subscription already exists so renew
        options.headers.SID = this.subs[serviceType].status
      } else {
        // Subscription doesn't exist yet to setup for new subscription
        this.subs[serviceType].status = 'PENDING'
        if (this.accessory.context.enableDebugLogging) {
          this.log('[%s] [%s] %s.', this.name, serviceType, this.lang.subInit)
        }
        options.headers.CALLBACK =
          '<' + this.accessory.context.cbURL + '/' + this.accessory.context.udn + '>'
        options.headers.NT = 'upnp:event'
      }

      // Execute the subscription request
      const req = http.request(options, res => {
        if (res.statusCode === 200) {
          // Subscription request successful
          this.subs[serviceType].status = res.headers.sid

          // Renew subscription after 150 seconds
          this.subs[serviceType].timeout = setTimeout(() => this.subscribe(serviceType), 120000)
        } else {
          // Subscription request failure
          if (this.accessory.context.enableDebugLogging) {
            this.log.warn(
              '[%s] [%s] %s [%s].',
              this.name,
              serviceType,
              this.lang.subError,
              res.statusCode
            )
          }
          this.subs[serviceType].status = null

          // Try to recover from a failed subscription after 2 seconds
          this.subs[serviceType].timeout = setTimeout(() => this.subscribe(serviceType), 2000)
        }
      })

      // Listen for errors on the subscription
      req.removeAllListeners('error')
      req.on('error', err => {
        if (!err) {
          return
        }

        // Stop the subscriptions
        this.stopSubscriptions()

        // Use the platform function to disable the upnp client for this accessory
        this.platform.disableUPNP(this.accessory, err)
      })
      req.end()
    } catch (err) {
      // Catch any errors during the process
      const eText = this.funcs.parseError(err)
      this.log.warn('[%s] [%s] %s %s.', this.name, serviceType, this.lang.subscribeError, eText)
    }
  }

  unsubscribe (serviceType) {
    try {
      // Check to see an already sent request is still pending
      if (!this.subs[serviceType] || this.subs[serviceType].status === 'PENDING') {
        return
      }

      // Set up the options for the subscription request
      const options = {
        host: this.accessory.context.ipAddress,
        port: this.accessory.context.port,
        path: this.services[serviceType].eventSubURL,
        method: 'UNSUBSCRIBE',
        headers: { SID: this.subs[serviceType].status }
      }

      // Execute the subscription request
      const req = http.request(options, res => {
        if (res.statusCode === 200) {
          // Unsubscribed
          if (this.accessory.context.enableDebugLogging) {
            this.log('[%s] [%s] unsubscribe successful.', this.name, serviceType)
          }
        } else {
          // Subscription request failure
          if (this.accessory.context.enableDebugLogging) {
            this.log.warn(
              '[%s] [%s] %s [%s].',
              this.name,
              serviceType,
              this.lang.unsubFail,
              res.statusCode
            )
          }
        }
      })

      // Listen for errors on the subscription
      req.removeAllListeners('error')
      req.on('error', err => {
        if (!err) {
          return
        }
        if (this.accessory.context.enableDebugLogging) {
          this.log.warn('[%s] [%s] %s [%s].', this.name, serviceType, this.lang.unsubFail, err)
        }
      })
      req.end()
    } catch (err) {
      const eText = this.funcs.parseError(err)
      if (this.accessory.context.enableDebugLogging) {
        this.log.warn('[%s] [%s] %s [%s].', this.name, serviceType, this.lang.unsubFail, eText)
      }
    }
  }
}
