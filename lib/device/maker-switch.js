/* jshint node: true,esversion: 9, -W014, -W033 */
/* eslint-disable new-cap */
'use strict'

const xml2js = require('xml2js')

module.exports = class deviceMakerSwitch {
  constructor (platform, accessory) {
    // Set up variables from the platform
    this.consts = platform.consts
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

    // Set up custom variables for this device type
    const deviceConf = platform.deviceConf[accessory.context.serialNumber]
    this.reversePolarity = deviceConf && deviceConf.reversePolarity

    // If the accessory has a garage door service then remove it
    if (this.accessory.getService(this.hapServ.GarageDoorOpener)) {
      this.accessory.removeService(this.accessory.getService(this.hapServ.GarageDoorOpener))
    }

    // Add the switch service if it doesn't already exist
    this.service =
      this.accessory.getService(this.hapServ.Switch) ||
      this.accessory.addService(this.hapServ.Switch)

    // Add the set handler to the switch on/off characteristic
    this.service.getCharacteristic(this.hapChar.On).onSet(async value => {
      await this.internalStateUpdate(value)
    })

    // Output the customised options to the log
    const opts = JSON.stringify({
      logging: this.enableDebugLogging ? 'debug' : this.enableLogging ? 'standard' : 'disable'
    })
    this.log('[%s] %s %s.', this.name, this.lang.devInitOpts, opts)

    // Request a device update immediately
    this.requestDeviceUpdate()
  }

  receiveDeviceUpdate (attribute) {
    // Log the receiving update if debug is enabled
    if (this.enableDebugLogging) {
      this.log('[%s] %s [%s: %s].', this.name, this.lang.recUpd, attribute.name, attribute.value)
    }

    // Check which attribute we are getting
    switch (attribute.name) {
      case 'Switch': {
        const hkValue = attribute.value === 1
        this.externalStateUpdate(hkValue)
        break
      }
      case 'Sensor':
        this.externalSensorUpdate(attribute.value)
        break
    }
  }

  async sendDeviceUpdate (value) {
    // Log the sending update if debug is enabled
    if (this.enableDebugLogging) {
      this.log('[%s] %s %s.', this.name, this.lang.senUpd, JSON.stringify(value))
    }

    // Send the update
    await this.platform.httpClient.sendDeviceUpdate(
      this.accessory,
      'urn:Belkin:service:basicevent:1',
      'SetBinaryState',
      value
    )
  }

  async requestDeviceUpdate () {
    try {
      // Request the update
      const data = await this.platform.httpClient.sendDeviceUpdate(
        this.accessory,
        'urn:Belkin:service:deviceevent:1',
        'GetAttributes'
      )

      // Parse the response
      const decoded = this.funcs.decodeXML(data.attributeList)
      const xml = '<attributeList>' + decoded + '</attributeList>'
      const result = await xml2js.parseStringPromise(xml, { explicitArray: false })
      const attributes = {}
      for (const key in result.attributeList.attribute) {
        if (this.funcs.hasProperty(result.attributeList.attribute, key)) {
          const attribute = result.attributeList.attribute[key]
          attributes[attribute.name] = parseInt(attribute.value)
        }
      }

      // Only send the required attributes to the receiveDeviceUpdate function
      if (attributes.Switch) {
        this.externalStateUpdate(attributes.Switch === 1)
      }

      // Check to see if the accessory has a contact sensor
      const contactSensor = this.accessory.getService(this.hapServ.ContactSensor)
      if (attributes.SensorPresent === 1) {
        // Add a contact sensor service if the physical device has one
        if (!contactSensor) {
          this.accessory.addService(this.hapServ.ContactSensor)
        }
        if (attributes.Sensor) {
          this.externalSensorUpdate(attributes.Sensor)
        }
      } else {
        // Remove the contact sensor service if the physical device doesn't have one
        if (contactSensor) {
          this.accessory.removeService(contactSensor)
        }
      }
    } catch (err) {
      const eText = this.funcs.parseError(err)
      this.log.warn('[%s] %s: %s.', this.name, this.lang.rduErr, eText)
    }
  }

  async internalStateUpdate (value) {
    try {
      // Send the update
      await this.sendDeviceUpdate({
        BinaryState: value ? 1 : 0
      })

      // Update the cache and log if appropriate
      this.cacheState = value
      if (this.enableLogging) {
        this.log('[%s] %s [%s].', this.name, this.lang.curState, value ? 'on' : 'off')
      }
    } catch (err) {
      const eText = this.funcs.parseError(err)
      this.log.warn('[%s] %s %s.', this.name, this.lang.cantCtl, eText)

      // Throw a 'no response' error and set a timeout to revert this after 2 seconds
      setTimeout(() => {
        this.service.updateCharacteristic(this.hapChar.On, this.cacheState)
      }, 2000)
      throw new this.hapErr(-70402)
    }
  }

  externalStateUpdate (value) {
    try {
      // Don't continue if the value is the same as before
      if (value === this.cacheState) {
        return
      }

      // Update the HomeKit characteristic
      this.service.updateCharacteristic(this.hapChar.On, value)

      // Update the cache and log if appropriate
      this.cacheState = value
      if (this.enableLogging) {
        this.log('[%s] %s [%s].', this.name, this.lang.curState, value ? 'on' : 'off')
      }
    } catch (err) {
      const eText = this.funcs.parseError(err)
      this.log.warn('[%s] %s %s.', this.name, this.lang.cantUpd, eText)
    }
  }

  externalSensorUpdate (value) {
    try {
      // Reverse the polarity if enabled by user
      if (this.reversePolarity) {
        value = 1 - value
      }

      // Don't continue if the sensor value is the same as before
      if (value === this.cacheContact) {
        return
      }

      // Update the HomeKit characteristic
      this.accessory
        .getService(this.hapServ.ContactSensor)
        .updateCharacteristic(this.hapChar.ContactSensorState, value)

      // Update the cache and log the change if appropriate
      this.cacheContact = value
      if (this.enableLogging) {
        this.log(
          '[%s] %s [%s].',
          this.name,
          this.lang.curCont,
          value === 1 ? this.lang.detectedNo : this.lang.detectedYes
        )
      }
    } catch (err) {
      const eText = this.funcs.parseError(err)
      this.log.warn('[%s] %s %s.', this.name, this.lang.cantUpd, eText)
    }
  }
}
