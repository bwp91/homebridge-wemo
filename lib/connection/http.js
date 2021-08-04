/* jshint node: true,esversion: 9, -W014, -W033 */
/* eslint-disable new-cap */
'use strict'

const axios = require('axios')
const { default: PQueue } = require('p-queue')
const xmlbuilder = require('xmlbuilder')
const xml2js = require('xml2js')

module.exports = class connectionHTTP {
  constructor (platform) {
    // Set up global vars from the platform
    this.consts = platform.consts
    this.debug = platform.config.debug
    this.funcs = platform.funcs
    this.log = platform.log
    this.lang = platform.lang
    this.platform = platform
    this.queue = new PQueue({
      concurrency: 1,
      interval: 250,
      intervalCap: 1,
      timeout: 9000,
      throwOnTimeout: true
    })
  }

  async sendDeviceUpdate (accessory, serviceType, action, body) {
    return await this.queue.add(async () => {
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
      const hostPort = 'http://' + accessory.context.ipAddress + ':' + accessory.context.port
      const res = await axios({
        url: hostPort + accessory.context.serviceList[serviceType].controlURL,
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
    })
  }

  async receiveDeviceUpdate (accessory, body) {
    try {
      if (accessory.context.enableDebugLogging) {
        this.log('[%s] %s:\n%s', accessory.displayName, this.lang.incKnown, body.trim())
      }
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
              accessory.control.receiveDeviceUpdate({
                name: 'BinaryState',
                value: parseInt(data.substring(0, 1))
              })
            } catch (err) {
              const eText = this.funcs.parseError(err)
              this.log.warn('[%s] %s %s %s.', this.name, prop, this.lang.proEr, eText)
            }
            break
          case 'Brightness':
            try {
              accessory.control.receiveDeviceUpdate({
                name: 'Brightness',
                value: parseInt(data)
              })
            } catch (err) {
              const eText = this.funcs.parseError(err)
              this.log.warn('[%s] %s %s %s.', this.name, prop, this.lang.proEr, eText)
            }
            break
          case 'InsightParams': {
            try {
              const params = data.split('|')
              accessory.control.receiveDeviceUpdate({
                name: 'InsightParams',
                value: {
                  state: parseInt(params[0]),
                  power: parseInt(params[7]),
                  todayWm: parseFloat(params[8]),
                  todayOnSeconds: parseFloat(params[3])
                }
              })
            } catch (err) {
              const eText = this.funcs.parseError(err)
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
                accessory.control.receiveDeviceUpdate({
                  name: attribute.name[0],
                  value: parseInt(attribute.value[0])
                })
              })
            } catch (err) {
              const eText = this.funcs.parseError(err)
              this.log.warn('[%s] %s %s %s.', this.name, prop, this.lang.proEr, eText)
            }
            break
          case 'StatusChange':
            try {
              const xml = await xml2js.parseStringPromise(data, { explicitArray: false })
              accessory.control.receiveDeviceUpdate(xml.StateEvent.DeviceID._, {
                name: xml.StateEvent.CapabilityId,
                value: xml.StateEvent.Value
              })
            } catch (err) {
              const eText = this.funcs.parseError(err)
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
