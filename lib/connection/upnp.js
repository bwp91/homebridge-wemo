/* jshint node: true,esversion: 9, -W014, -W033 */
/* eslint-disable new-cap */
'use strict'

const axios = require('axios')
const EventEmitter = require('events').EventEmitter
const http = require('http')
const xmlbuilder = require('xmlbuilder')
const xml2js = require('xml2js')

module.exports = class connectionUPNP extends EventEmitter {
  constructor (platform, device) {
    super()

    // Set up global vars from the platform
    this.debug = platform.config.debug
    this.funcs = platform.funcs
    this.log = platform.log
    this.lang = platform.lang

    // Set up other variables we need
    this.device = device
    this.name = device.friendlyName
    this.subs = {}
    this.services = {}

    // Create a map of device services
    if (!device.serviceList || !Array.isArray(device.serviceList.service)) {
      if (this.debug) {
        this.log.warn('[%s] %s.', this.name, this.lang.servicesNotArray)
      }
      return
    }
    device.serviceList.service.forEach(service => {
      this.services[service.serviceType] = {
        serviceId: service.serviceId,
        controlURL: service.controlURL,
        eventSubURL: service.eventSubURL
      }
    })

    // Transparently subscribe to serviceType events
    this.removeAllListeners('newListener')
    this.on('newListener', (event, listener) => {
      let serviceType
      switch (event) {
        case 'AttributeList':
        case 'BinaryState':
          serviceType = 'urn:Belkin:service:basicevent:1'
          break
        case 'InsightParams':
          serviceType = 'urn:Belkin:service:insight:1'
          break
        case 'StatusChange':
          serviceType = 'urn:Belkin:service:bridge:1'
          break
      }

      // Check the device supports this service type
      if (this.services[serviceType]) {
        this.subscribe(serviceType)
      }
    })
  }

  subscribe (serviceType) {
    try {
      // Check to see an already sent request is still pending
      if (this.subs[serviceType] && this.subs[serviceType] === 'PENDING') {
        if (this.debug) {
          this.log('[%s] %s.', this.name, this.lang.subPending)
        }
        return
      }

      // Set up the options for the subscription request
      const options = {
        host: this.device.host,
        port: this.device.port,
        path: this.services[serviceType].eventSubURL,
        method: 'SUBSCRIBE',
        headers: { TIMEOUT: 'Second-300' }
      }

      // The remaining options depend on whether the subscription already exists
      if (this.subs[serviceType]) {
        // Subscription already exists so renew
        options.headers.SID = this.subs[serviceType]
      } else {
        // Subscription doesn't exist yet to setup for new subscription
        this.subs[serviceType] = 'PENDING'
        if (this.debug) {
          this.log('[%s] %s [%s].', this.name, this.lang.subInit, serviceType)
        }
        options.headers.CALLBACK = '<' + this.device.cbURL + '/' + this.device.UDN + '>'
        options.headers.NT = 'upnp:event'
      }

      // Execute the subscription request
      const req = http.request(options, res => {
        if (res.statusCode === 200) {
          // Subscription request successful
          this.subs[serviceType] = res.headers.sid

          // Renew subscription after 150 seconds
          setTimeout(() => this.subscribe(serviceType), 150000)
        } else {
          // Subscription request failure
          if (this.debug) {
            const code = res.statusCode
            this.log.warn('[%s] %s [%s].', this.name, this.lang.subError, code)
          }
          this.subs[serviceType] = null

          // Try to recover from a failed subscription after 2 seconds
          setTimeout(() => this.subscribe(serviceType), 2000)
        }
      })

      // Listen for errors on the subscription
      req.removeAllListeners('error')
      req.on('error', err => {
        this.subs[serviceType] = null
        this.error = err
        this.emit('error', err)
      })
      req.end()
    } catch (err) {
      // Catch any errors during the process
      const eText = this.funcs.parseError(err)
      this.log.warn('[%s] %s %s.', this.name, this.lang.subscribeError, eText)
    }
  }

  async sendRequest (serviceType, action, body) {
    try {
      // Check if there are any existing errors reported for this device
      if (this.error) {
        throw this.error
      }

      // Generate the XML to send to the device
      const xml = xmlbuilder
        .create('s:Envelope', {
          version: '1.0',
          encoding: 'utf-8',
          allowEmpty: true
        })
        .att('xmlns:s', 'http://schemas.xmlsoap.org/soap/envelope/')
        .att('s:encodingStyle', 'http://schemas.xmlsoap.org/soap/encoding/')
        .ele('s:Body')
        .ele('u:' + action)
        .att('xmlns:u', serviceType)

      // Send the request to the device
      const hostPort = 'http://' + this.device.host + ':' + this.device.port
      const res = await axios({
        url: hostPort + this.services[serviceType].controlURL,
        method: 'post',
        headers: {
          SOAPACTION: '"' + serviceType + '#' + action + '"',
          'Content-Type': 'text/xml; charset="utf-8"'
        },
        data: (body ? xml.ele(body) : xml).end(),
        timeout: 10000
      })

      // Parse the response from the device
      const xmlRes = res.data
      const response = await xml2js.parseStringPromise(xmlRes, {
        explicitArray: false
      })

      // Return the parsed response
      return response['s:Envelope']['s:Body']['u:' + action + 'Response']
    } catch (err) {
      this.error = err
      this.emit('error', err)
      throw err
    }
  }

  async receiveRequest (body) {
    try {
      // Convert the XML to JSON
      const json = await xml2js.parseStringPromise(body, { explicitArray: false })

      // Loop through the JSON for the necessary information
      for (const prop in json['e:propertyset']['e:property']) {
        if (!this.funcs.hasProperty(json['e:propertyset']['e:property'], prop)) {
          continue
        }
        const data = json['e:propertyset']['e:property'][prop]
        switch (prop) {
          case 'BinaryState':
            try {
              this.emit('BinaryState', {
                name: 'BinaryState',
                value: parseInt(data.substring(0, 1))
              })
            } catch (e) {
              const eText = this.funcs.parseError(e)
              this.log.warn('[%s] %s %s %s.', this.name, prop, this.lang.proEr, eText)
            }
            break
          case 'Brightness':
            try {
              this.emit('Brightness', {
                name: 'Brightness',
                value: parseInt(data)
              })
            } catch (e) {
              const eText = this.funcs.parseError(e)
              this.log.warn('[%s] %s %s %s.', this.name, prop, this.lang.proEr, eText)
            }
            break
          case 'InsightParams': {
            try {
              const params = data.split('|')
              this.emit('InsightParams', {
                name: 'InsightParams',
                value: {
                  state: parseInt(params[0]),
                  power: parseInt(params[7]),
                  todayWm: parseFloat(params[8]),
                  todayOnSeconds: parseFloat(params[3])
                }
              })
            } catch (e) {
              const eText = this.funcs.parseError(e)
              this.log.warn('[%s] %s %s %s.', this.name, prop, this.lang.proEr, eText)
            }
            break
          }
          case 'attributeList':
            try {
              const decoded = this.funcs.decodeXML(data)
              const xml = '<attributeList>' + decoded + '</attributeList>'
              const result = await xml2js.parseStringPromise(xml, { explicitArray: true })
              result.attributeList.attribute.forEach(attribute => {
                this.emit('AttributeList', {
                  name: attribute.name[0],
                  value: parseInt(attribute.value[0])
                })
              })
            } catch (e) {
              const eText = this.funcs.parseError(e)
              this.log.warn('[%s] %s %s %s.', this.name, prop, this.lang.proEr, eText)
            }
            break
          case 'StatusChange':
            try {
              const xml = await xml2js.parseStringPromise(data, { explicitArray: false })
              this.emit('StatusChange', xml.StateEvent.DeviceID._, {
                name: xml.StateEvent.CapabilityId,
                value: xml.StateEvent.Value
              })
            } catch (e) {
              const eText = this.funcs.parseError(e)
              this.log.warn('[%s] %s %s %s.', this.name, prop, this.lang.proEr, eText)
            }
            break
        }
      }
    } catch (err) {
      // Catch any errors during this process
      const eText = this.funcs.parseError(err)
      this.log.warn('[%s] %s %s.', this.name, this.lang.incFail, eText)
    }
  }
}
