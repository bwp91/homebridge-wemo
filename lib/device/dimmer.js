/* jshint node: true,esversion: 9, -W014, -W033 */
/* eslint-disable new-cap */
'use strict'

module.exports = class deviceDimmer {
  constructor (platform, accessory, device) {
    // Set up variables from the platform
    this.consts = platform.consts
    this.funcs = platform.funcs
    this.hapChar = platform.api.hap.Characteristic
    this.hapErr = platform.api.hap.HapStatusError
    this.hapServ = platform.api.hap.Service
    this.lang = platform.lang
    this.log = platform.log

    // Set up variables from the accessory
    this.accessory = accessory
    this.client = accessory.client
    this.name = accessory.displayName

    // Set up custom variables for this device type
    const deviceConf = platform.wemoLights[device.serialNumber]
    this.brightStep =
      deviceConf && deviceConf.brightnessStep
        ? Math.min(deviceConf.brightnessStep, 100)
        : platform.consts.defaultValues.brightnessStep
    this.pollingInterval =
      deviceConf && deviceConf.pollingInterval ? deviceConf.pollingInterval : false

    // Set the correct logging variables for this accessory
    this.enableLogging = !platform.config.disableDeviceLogging
    this.enableDebugLogging = platform.config.debug
    if (deviceConf && deviceConf.overrideLogging) {
      switch (deviceConf.overrideLogging) {
        case 'standard':
          this.enableLogging = true
          this.enableDebugLogging = false
          break
        case 'debug':
          this.enableLogging = true
          this.enableDebugLogging = true
          break
        case 'disable':
          this.enableLogging = false
          this.enableDebugLogging = false
          break
      }
    }

    // Add the lightbulb service if it doesn't already exist
    this.service =
      accessory.getService(this.hapServ.Lightbulb) || accessory.addService(this.hapServ.Lightbulb)

    // Add the set handler to the lightbulb on/off characteristic
    this.service.getCharacteristic(this.hapChar.On).onSet(async value => {
      await this.internalStateUpdate(value)
    })

    // Add the set handler to the lightbulb brightness characteristic
    this.service
      .getCharacteristic(this.hapChar.Brightness)
      .setProps({ minStep: this.brightStep })
      .onSet(async value => {
        await this.internalBrightnessUpdate(value)
      })

    // Output the customised options to the log
    const opts = JSON.stringify({
      brightnessStep: this.brightStep,
      logging: this.enableDebugLogging ? 'debug' : this.enableLogging ? 'standard' : 'disable',
      pollingInterval: this.pollingInterval
    })
    this.log('[%s] %s %s.', this.name, this.lang.devInitOpts, opts)

    // Listeners for when the device sends an update to the plugin
    this.client.on('BinaryState', attribute => this.receiveDeviceUpdate(attribute))
    this.client.on('Brightness', attribute => this.receiveDeviceUpdate(attribute))

    // Request a device update immediately
    this.requestDeviceUpdate()

    // Set up polling for updates (seems to be needed on the newer RTOS models)
    if (device.firmwareVersion) {
      if (device.firmwareVersion.includes('RTOS')) {
        if (this.pollingInterval) {
          this.pollInterval = setInterval(
            () => this.requestDeviceUpdate(),
            this.pollingInterval * 1000
          )
        } else {
          this.log.warn('[%s] %s.', this.name, this.lang.dimmerPoll)
        }
      } else {
        if (this.pollingInterval) {
          this.log.warn('[%s] %s.', this.name, this.lang.dimmerNoPoll)
        }
      }
    }

    // Stop the polling interval on any client error
    this.client.on('error', () => clearInterval(this.pollInterval))

    // Stop the polling on Homebridge shutdown
    platform.api.on('shutdown', () => clearInterval(this.pollInterval))
  }

  receiveDeviceUpdate (attribute) {
    // Log the receiving update if debug is enabled
    if (this.enableDebugLogging) {
      this.log('[%s] %s [%s: %s].', this.name, this.lang.recUpd, attribute.name, attribute.value)
    }

    // Check which attribute we are getting
    switch (attribute.name) {
      case 'BinaryState': {
        // Send a HomeKit needed true/false argument
        // attribute.value is 0 if and only if the device is off
        const hkValue = attribute.value !== 0
        this.externalSwitchUpdate(hkValue)
        break
      }
      case 'Brightness':
        // Send a HomeKit needed INT argument
        this.externalBrightnessUpdate(attribute.value)
        break
    }
  }

  async sendDeviceUpdate (value) {
    // Log the sending update if debug is enabled
    if (this.enableDebugLogging) {
      this.log('[%s] %s %s.', this.name, this.lang.senUpd, JSON.stringify(value))
    }

    // Send the update
    await this.client.sendRequest('urn:Belkin:service:basicevent:1', 'SetBinaryState', value)
  }

  async requestDeviceUpdate () {
    try {
      // Request the update
      const data = await this.client.sendRequest(
        'urn:Belkin:service:basicevent:1',
        'GetBinaryState'
      )

      // Check for existence since BinaryState can be int 0
      if (this.funcs.hasProperty(data, 'BinaryState')) {
        this.receiveDeviceUpdate({
          name: 'BinaryState',
          value: parseInt(data.BinaryState)
        })
      }

      // Check for existence since brightness can be int 0
      if (this.funcs.hasProperty(data, 'brightness')) {
        this.receiveDeviceUpdate({
          name: 'Brightness',
          value: parseInt(data.brightness)
        })
      }
    } catch (err) {
      const eText = this.funcs.parseError(err)
      this.log.warn('[%s] %s: %s.', this.name, this.lang.rduErr, eText)
    }
  }

  async getCurrentBrightness () {
    // A quick function to get the current brightness of the device
    const data = await this.client.sendRequest('urn:Belkin:service:basicevent:1', 'GetBinaryState')
    return parseInt(data.brightness)
  }

  async internalStateUpdate (value) {
    try {
      // Wait a longer time than the brightness so in scenes brightness is sent first
      await this.funcs.sleep(500)

      // Send the update
      await this.sendDeviceUpdate({
        BinaryState: value ? 1 : 0
      })

      // Update the cache and log if appropriate
      this.cacheState = value
      if (this.enableLogging) {
        this.log('[%s] %s [%s].', this.name, this.lang.curState, value ? 'on' : 'off')
      }

      // Don't continue if turning the device off
      if (!value) {
        return
      }

      // When turning the device on we want to update the HomeKit brightness
      const updatedBrightness = await this.getCurrentBrightness()

      // Don't continue if the brightness is the same
      if (updatedBrightness === this.cacheBright) {
        return
      }

      // Update the brightness characteristic
      this.service.updateCharacteristic(this.hapChar.Brightness, updatedBrightness)

      // Update the cache and log if appropriate
      this.cacheBright = updatedBrightness
      if (this.enableLogging) {
        this.log('[%s] %s [%s%].', this.name, this.lang.curBright, this.cacheBright)
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

  async internalBrightnessUpdate (value) {
    try {
      // Avoid multiple updates in quick succession
      const updateKey = Math.random()
        .toString(36)
        .substr(2, 8)
      this.updateKey = updateKey
      await this.funcs.sleep(300)
      if (updateKey !== this.updateKey) {
        return
      }

      // Send the update
      await this.sendDeviceUpdate({
        BinaryState: value === 0 ? 0 : 1,
        brightness: value
      })

      // Update the cache and log if appropriate
      this.cacheBright = value
      if (this.enableLogging) {
        this.log('[%s] %s [%s%].', this.name, this.lang.curBright, this.cacheBright)
      }
    } catch (err) {
      const eText = this.funcs.parseError(err)
      this.log.warn('[%s] %s %s.', this.name, this.lang.cantCtl, eText)

      // Throw a 'no response' error and set a timeout to revert this after 2 seconds
      setTimeout(() => {
        this.service.updateCharacteristic(this.hapChar.Brightness, this.cacheBright)
      }, 2000)
      throw new this.hapErr(-70402)
    }
  }

  async externalSwitchUpdate (value) {
    try {
      // Don't continue if the value is the same as the cache
      if (value === this.cacheState) {
        return
      }

      // Update the ON/OFF characteristic
      this.service.updateCharacteristic(this.hapChar.On, value)

      // Update the cache and log if appropriate
      this.cacheState = value
      if (this.enableLogging) {
        this.log('[%s] %s [%s].', this.name, this.lang.curState, value ? 'on' : 'off')
      }

      // Don't continue if the new state is OFF
      if (!value) {
        return
      }

      // If the new state is ON then we want to update the HomeKit brightness
      const updatedBrightness = await this.getCurrentBrightness()

      // Don't continue if the brightness is the same
      if (updatedBrightness === this.cacheBright) {
        return
      }

      // Update the HomeKit brightness characteristic
      this.service.updateCharacteristic(this.hapChar.Brightness, updatedBrightness)

      // Update the cache and log if appropriate
      this.cacheBright = updatedBrightness
      if (this.enableLogging) {
        this.log('[%s] %s [%s%].', this.name, this.lang.curBright, this.cacheBright)
      }
    } catch (err) {
      const eText = this.funcs.parseError(err)
      this.log.warn('[%s] %s %s.', this.name, this.lang.cantUpd, eText)
    }
  }

  externalBrightnessUpdate (value) {
    try {
      // Don't continue if the brightness is the same as the cache value
      if (value === this.cacheBright) {
        return
      }
      // Update the HomeKit brightness characteristic
      this.service.updateCharacteristic(this.hapChar.Brightness, value)

      // Update the cache and log if appropriate
      this.cacheBright = value
      if (this.enableLogging) {
        this.log('[%s] %s [%s%].', this.name, this.lang.curBright, this.cacheBright)
      }
    } catch (err) {
      const eText = this.funcs.parseError(err)
      this.log.warn('[%s] %s %s.', this.name, this.lang.cantUpd, eText)
    }
  }
}
