/* jshint node: true,esversion: 9, -W014, -W033 */
/* eslint-disable new-cap */
'use strict'

const xmlbuilder = require('xmlbuilder')

module.exports = class deviceLinkHub {
  constructor (platform, accessory, devicesInHB) {
    // Set up variables from the platform
    this.consts = platform.consts
    this.devicesInHB = devicesInHB
    this.funcs = platform.funcs
    this.hapChar = platform.api.hap.Characteristic
    this.hapErr = platform.api.hap.HapStatusError
    this.hapServ = platform.api.hap.Service
    this.lang = platform.lang
    this.log = platform.log
    this.platform = platform

    // Set up variables from the accessory
    this.accessory = accessory
    this.enableLogging = accessory.context.enableLogging
    this.enableDebugLogging = accessory.context.enableDebugLogging
    this.name = accessory.displayName

    // Request a device update after a few seconds when the subaccessories should have setup
    setTimeout(() => this.requestDeviceUpdate(), 5000)

    // Start a polling interval if the user has disabled upnp
    if (this.accessory.context.connection === 'http') {
      this.pollingInterval = setInterval(
        () => this.requestDeviceUpdate(),
        platform.config.pollingInterval * 1000
      )
    }
  }

  receiveDeviceUpdate (deviceId, attribute) {
    // Find the accessory to which this relates
    this.devicesInHB.forEach(accessory => {
      if (
        accessory.context.serialNumber === deviceId &&
        accessory.control &&
        accessory.control.receiveDeviceUpdate
      ) {
        accessory.control.receiveDeviceUpdate(attribute)
      }
    })
  }

  async sendDeviceUpdate (deviceId, capability, value) {
    // Generate the XML to send
    const deviceStatusList = xmlbuilder
      .create('DeviceStatus', {
        version: '1.0',
        encoding: 'utf-8'
      })
      .ele({
        IsGroupAction: deviceId.length === 10 ? 'YES' : 'NO',
        DeviceID: deviceId,
        CapabilityID: capability,
        CapabilityValue: value
      })
      .end()

    // Send the update
    return await this.platform.httpClient.sendDeviceUpdate(
      this.accessory,
      'urn:Belkin:service:bridge:1',
      'SetDeviceStatus',
      {
        DeviceStatusList: { '#text': deviceStatusList }
      }
    )
  }

  async requestDeviceUpdate (deviceId) {
    return await this.platform.httpClient.sendDeviceUpdate(
      this.accessory,
      'urn:Belkin:service:bridge:1',
      'GetDeviceStatus',
      {
        DeviceIDs: deviceId
      }
    )
  }
}
