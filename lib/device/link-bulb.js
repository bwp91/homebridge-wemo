/* jshint node: true, esversion: 10, -W014, -W033 */
/* eslint-disable new-cap */
'use strict'

const xml2js = require('xml2js')

module.exports = class deviceLinkBulb {
  constructor (platform, priAcc, accessory) {
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
    this.priAcc = priAcc

    // Set up variables from the device
    this.deviceID = accessory.context.deviceId

    // Set up custom variables for this device type
    const deviceConf = platform.deviceConf[this.deviceID]
    this.brightStep =
      deviceConf && deviceConf.brightnessStep
        ? Math.min(deviceConf.brightnessStep, 100)
        : platform.consts.defaultValues.brightnessStep
    this.alShift =
      deviceConf && deviceConf.adaptiveLightingShift
        ? deviceConf.adaptiveLightingShift
        : platform.consts.defaultValues.adaptiveLightingShift
    this.transitionTime =
      deviceConf && deviceConf.transitionTime
        ? deviceConf.transitionTime
        : platform.consts.defaultValues.transitionTime

    // Objects containing mapping info for the device capabilities
    this.linkCodes = {
      switch: '10006',
      brightness: '10008',
      color: '10300',
      temperature: '30301'
    }
    this.linkCodesRev = {
      10600: 'switch',
      10008: 'brightness',
      10300: 'color',
      30301: 'temperature'
    }

    // Quick check variables for later use
    this.hasBrightSupport = accessory.context.capabilities[this.linkCodes.brightness]
    this.hasColourSupport = accessory.context.capabilities[this.linkCodes.color]
    this.hasCTempSupport = accessory.context.capabilities[this.linkCodes.temperature]

    // Add the lightbulb service if it doesn't already exist
    this.service =
      this.accessory.getService(this.hapServ.Lightbulb) ||
      this.accessory.addService(this.hapServ.Lightbulb)

    // If adaptive lighting has just been disabled then remove and re-add service to hide AL icon
    if (this.alShift === -1 && this.accessory.context.adaptiveLighting) {
      this.accessory.removeService(this.service)
      this.service = this.accessory.addService(this.hapServ.Lightbulb)
      this.accessory.context.adaptiveLighting = false
    }

    // Add the set handler to the lightbulb on/off characteristic
    this.service.getCharacteristic(this.hapChar.On).onSet(async value => {
      await this.internalStateUpdate(value)
    })

    // Add the set handler to the brightness characteristic if supported
    if (this.hasBrightSupport) {
      this.service
        .getCharacteristic(this.hapChar.Brightness)
        .setProps({ minStep: this.brightStep })
        .onSet(async value => {
          await this.internalBrightnessUpdate(value)
        })
    }

    if (this.hasColourSupport) {
      this.service.getCharacteristic(this.hapChar.Hue).onSet(async value => {
        await this.internalColourUpdate(value)
      })
      this.cacheHue = this.service.getCharacteristic(this.hapChar.Hue).value
      this.cacheSat = this.service.getCharacteristic(this.hapChar.Saturation).value
    }

    // Add the set handler to the colour temperature characteristic if supported
    if (this.hasCTempSupport) {
      this.service.getCharacteristic(this.hapChar.ColorTemperature).onSet(async value => {
        await this.internalCTUpdate(value)
      })
      this.cacheMired = this.service.getCharacteristic(this.hapChar.ColorTemperature).value

      // Add support for adaptive lighting if not disabled by user
      if (this.alShift !== -1) {
        this.alController = new platform.api.hap.AdaptiveLightingController(this.service, {
          customTemperatureAdjustment: this.alShift
        })
        this.accessory.configureController(this.alController)
      }
    }

    // Output the customised options to the log
    const opts = JSON.stringify({
      adaptiveLightingShift: this.alShift,
      brightnessStep: this.brightStep,
      logging: this.enableDebugLogging ? 'debug' : this.enableLogging ? 'standard' : 'disable',
      transitionTime: this.transitionTime
    })
    this.log('[%s] %s %s.', this.name, this.lang.devInitOpts, opts)

    // Request a device update immediately
    this.requestDeviceUpdate()
  }

  receiveDeviceUpdate (attribute) {
    // Log the receiving update if debug is enabled
    if (this.enableDebugLogging) {
      this.log(
        '[%s] %s [%s: %s].',
        this.name,
        this.lang.recUpd,
        this.linkCodesRev[attribute.name],
        attribute.value
      )
    }

    // Check which attribute we are getting
    switch (attribute.name) {
      case this.linkCodes.switch:
        // Need a HomeKit true/false value for the state update
        this.externalStateUpdate(parseInt(attribute.value) !== 0)
        break
      case this.linkCodes.brightness:
        // Need a HomeKit int value for the brightness update
        this.externalBrightnessUpdate(Math.round(attribute.value.split(':').shift() / 2.55))
        break
      case this.linkCodes.color: {
        // Need a HomeKit int values for the colour update
        const xy = attribute.value.split(':')
        this.externalColourUpdate(xy[0], xy[1])
        break
      }
      case this.linkCodes.temperature:
        // Need a HomeKit int value for the colour temperature update
        this.externalCTUpdate(Math.round(attribute.value.split(':').shift()))
        break
    }
  }

  async sendDeviceUpdate (capability, value) {
    // Log the sending update if debug is enabled
    if (this.enableDebugLogging) {
      this.log('[%s] %s {%s: %s}.', this.name, this.lang.senUpd, capability, value)
    }

    // Send the update
    await this.priAcc.control.sendDeviceUpdate(
      this.accessory.context.serialNumber,
      capability,
      value
    )
  }

  async requestDeviceUpdate () {
    try {
      // Request the update via the main (hidden) accessory
      const data = await this.priAcc.control.requestDeviceUpdate(
        this.accessory.context.serialNumber
      )

      // Parse the response
      const res = await xml2js.parseStringPromise(data.DeviceStatusList, { explicitArray: false })
      const deviceStatus = res.DeviceStatusList.DeviceStatus
      const values = deviceStatus.CapabilityValue.split(',')
      const caps = {}
      deviceStatus.CapabilityID.split(',').forEach((val, index) => {
        caps[val] = values[index]
      })

      // If no capability values received then device must be offline
      if (!caps[this.linkCodes.switch] || !caps[this.linkCodes.switch].length) {
        this.log.warn('[%s] %s.', this.name, this.lang.devOffline)
        return
      }

      // Need a HomeKit true/false value for the state update
      if (caps[this.linkCodes.switch]) {
        this.externalStateUpdate(parseInt(caps[this.linkCodes.switch]) !== 0)
      }

      // Need a HomeKit int value for the brightness update
      if (caps[this.linkCodes.brightness] && this.hasBrightSupport) {
        this.externalBrightnessUpdate(
          Math.round(caps[this.linkCodes.brightness].split(':').shift() / 2.55)
        )
      }

      // Need a HomeKit int value for the colour update
      if (caps[this.linkCodes.color] && this.hasColourSupport) {
        const xy = caps[this.linkCodes.color].split(':')
        this.externalColourUpdate(xy[0], xy[1])
      }

      // Need a HomeKit int value for the colour temperature update
      if (caps[this.linkCodes.temperature] && this.hasCTempSupport) {
        this.externalCTUpdate(Math.round(caps[this.linkCodes.temperature].split(':').shift()))
      }
    } catch (err) {
      if (this.enableDebugLogging) {
        const eText = this.funcs.parseError(err, [
          this.lang.timeout,
          this.lang.timeoutUnreach,
          this.lang.noService
        ])
        this.log.warn('[%s] %s %s.', this.name, this.lang.rduErr, eText)
      }
    }
  }

  async internalStateUpdate (value) {
    try {
      // Wait a longer time than the brightness so in scenes brightness is sent first
      await this.funcs.sleep(500)

      // Send the update
      await this.sendDeviceUpdate(this.linkCodes.switch, value ? 1 : 0)

      // Update the cache and log if appropriate
      this.cacheState = value
      if (this.enableLogging) {
        this.log('[%s] %s [%s].', this.name, this.lang.curState, value ? 'on' : 'off')
      }
    } catch (err) {
      const eText = this.funcs.parseError(err, [this.lang.timeout, this.lang.timeoutUnreach])
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
      const updateKey = this.funcs.generateRandomString(5)
      this.updateKeyBR = updateKey
      await this.funcs.sleep(300)
      if (updateKey !== this.updateKeyBR) {
        return
      }

      // Don't continue if this value is same as before
      if (this.cacheBright === value) {
        return
      }

      // Send the update - value = brightness:transition_time
      await this.sendDeviceUpdate(
        this.linkCodes.brightness,
        value * 2.55 + ':' + this.transitionTime
      )

      // Update the cache and log if appropriate
      this.cacheBright = value
      if (this.enableLogging) {
        this.log('[%s] %s [%s%].', this.name, this.lang.curBright, value)
      }
    } catch (err) {
      const eText = this.funcs.parseError(err, [this.lang.timeout, this.lang.timeoutUnreach])
      this.log.warn('[%s] %s %s.', this.name, this.lang.cantCtl, eText)

      // Throw a 'no response' error and set a timeout to revert this after 2 seconds
      setTimeout(() => {
        this.service.updateCharacteristic(this.hapChar.Brightness, this.cacheBright)
      }, 2000)
      throw new this.hapErr(-70402)
    }
  }

  async internalColourUpdate (value) {
    try {
      // Avoid multiple updates in quick succession
      const updateKey = this.funcs.generateRandomString(5)
      this.updateKeyHue = updateKey
      await this.funcs.sleep(400)
      if (updateKey !== this.updateKeyHue) {
        return
      }

      // Don't continue if this value is same as before
      if (this.cacheHue === value) {
        return
      }

      // First convert to RGB
      const currentSat = this.service.getCharacteristic(this.hapChar.Saturation).value
      const [r, g, b] = this.hs2rgb(value, currentSat)

      // Then convert the RGB to the values needed for Wemo
      const [x, y] = this.rgb2xy(r, g, b)
      const X = Math.round(x * 65535)
      const Y = Math.round(y * 65535)

      // Send the update - value = ct:transition_time
      await this.sendDeviceUpdate(this.linkCodes.color, X + ':' + Y + ':' + this.transitionTime)

      // Update the cache and log if appropriate
      this.cacheHue = value
      this.cacheSat = currentSat
      this.cacheMired = 0
      if (this.enableLogging) {
        this.log('[%s] %s [X:%s Y:%s].', this.name, this.lang.curColour, X, Y)
      }
    } catch (err) {
      const eText = this.funcs.parseError(err, [this.lang.timeout, this.lang.timeoutUnreach])
      this.log.warn('[%s] %s %s.', this.name, this.lang.cantCtl, eText)

      // Throw a 'no response' error and set a timeout to revert this after 2 seconds
      setTimeout(() => {
        this.service.updateCharacteristic(this.hapChar.Hue, this.cacheHue)
      }, 2000)
      throw new this.hapErr(-70402)
    }
  }

  async internalCTUpdate (value) {
    try {
      // Avoid multiple updates in quick succession
      const updateKey = this.funcs.generateRandomString(5)
      this.updateKeyCT = updateKey
      await this.funcs.sleep(400)
      if (updateKey !== this.updateKeyCT) {
        return
      }

      // Value needs to be between 170 and 370
      value = Math.min(Math.max(value, 170), 370)

      // Don't continue if this value is same as before
      if (this.cacheMired === value) {
        return
      }

      // Send the update - value = ct:transition_time
      await this.sendDeviceUpdate(this.linkCodes.temperature, value + ':' + this.transitionTime)

      // Update the cache and log if appropriate
      this.cacheMired = value
      this.cacheHue = 0
      this.cacheSat = 0
      if (this.enableLogging) {
        // Convert mired value to kelvin for logging
        const mToK = Math.round(1000000 / value)
        if (this.alController && this.alController.isAdaptiveLightingActive()) {
          this.log(
            '[%s] %s [%sK / %sM] %s.',
            this.name,
            this.lang.curCCT,
            mToK,
            value,
            this.lang.viaAL
          )
        } else {
          this.log('[%s] %s [%sK / %sM].', this.name, this.lang.curCCT, mToK, value)
        }
      }
    } catch (err) {
      const eText = this.funcs.parseError(err, [this.lang.timeout, this.lang.timeoutUnreach])
      this.log.warn('[%s] %s %s.', this.name, this.lang.cantCtl, eText)

      // Throw a 'no response' error and set a timeout to revert this after 2 seconds
      setTimeout(() => {
        this.service.updateCharacteristic(this.hapChar.ColorTemperature, this.cacheMired)
      }, 2000)
      throw new this.hapErr(-70402)
    }
  }

  externalStateUpdate (value) {
    try {
      // Don't continue if the state is the same as before
      if (value === this.cacheState) {
        return
      }

      // Update the state HomeKit characteristic
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

  externalBrightnessUpdate (value) {
    try {
      // Don't continue if the brightness is the same as before
      if (value === this.cacheBright) {
        return
      }

      // Update the brightness HomeKit characteristic
      this.service.updateCharacteristic(this.hapChar.Brightness, value)

      // Update the cache and log if appropriate
      this.cacheBright = value
      if (this.enableLogging) {
        this.log('[%s] %s [%s%].', this.name, this.lang.curBright, value)
      }
    } catch (err) {
      const eText = this.funcs.parseError(err)
      this.log.warn('[%s] %s %s.', this.name, this.lang.cantUpd, eText)
    }
  }

  externalColourUpdate (valueX, valueY) {
    try {
      // Convert the given values to RGB and hue/saturation
      const [r, g, b] = this.xy2rgb(valueX / 65535, valueY / 65535)
      const [h, s] = this.rgb2hs(r, g, b)

      // Don't continue if the hue and saturation are the same as before
      if (this.cacheHue !== h || this.cacheSat !== s) {
        // Update the HomeKit characteristics
        this.service.updateCharacteristic(this.hapChar.ColorTemperature, 140)
        this.service.updateCharacteristic(this.hapChar.Hue, h)
        this.service.updateCharacteristic(this.hapChar.Saturation, s)

        // Update the cache values
        this.cacheMired = 0
        this.cacheHue = h
        this.cacheSat = s

        // Log the change if appropriate
        if (this.enableLogging) {
          this.log('[%s] %s [X:%s Y:%s].', this.name, this.lang.curColour, valueX, valueY)
        }

        // Colour chosen externally so disable adaptive lighting
        if (this.alController && this.alController.isAdaptiveLightingActive()) {
          this.alController.disableAdaptiveLighting()
          this.log.warn('[%s] %s.', this.name, this.lang.alDisabled)
        }
      }
    } catch (err) {
      const eText = this.funcs.parseError(err)
      this.log.warn('[%s] %s %s.', this.name, this.lang.cantUpd, eText)
    }
  }

  externalCTUpdate (value) {
    try {
      // Don't continue if the mired value is the same as before
      if (value === this.cacheMired) {
        return
      }

      // Update the mired HomeKit characteristic
      this.service.updateCharacteristic(this.hapChar.ColorTemperature, value)

      // Log the change if appropriate
      if (this.enableLogging) {
        const mToK = Math.round(1000000 / value)
        this.log('[%s] %s [%sK / %sM].', this.name, this.lang.curCCT, mToK, value)
      }

      // If the difference is significant (>20) then disable adaptive lighting
      if (!isNaN(this.cacheMired)) {
        const diff = Math.abs(value - this.cacheMired) > 20
        if (this.alController && this.alController.isAdaptiveLightingActive() && diff) {
          this.alController.disableAdaptiveLighting()
          this.log.warn('[%s] %s.', this.name, this.lang.alDisabled)
        }
      }

      // Update the cache value after the adaptive lighting check
      this.cacheMired = value
    } catch (err) {
      const eText = this.funcs.parseError(err)
      this.log.warn('[%s] %s %s.', this.name, this.lang.cantUpd, eText)
    }
  }

  hs2rgb (h, s) {
    /*
      Credit:
      https://github.com/WickyNilliams/pure-color
    */
    h = parseInt(h) / 60
    s = parseInt(s) / 100
    const f = h - Math.floor(h)
    const p = 255 * (1 - s)
    const q = 255 * (1 - s * f)
    const t = 255 * (1 - s * (1 - f))
    let rgb
    switch (Math.floor(h) % 6) {
      case 0:
        rgb = [255, t, p]
        break
      case 1:
        rgb = [q, 255, p]
        break
      case 2:
        rgb = [p, 255, t]
        break
      case 3:
        rgb = [p, q, 255]
        break
      case 4:
        rgb = [t, p, 255]
        break
      case 5:
        rgb = [255, p, q]
        break
    }
    if (rgb[0] === 255 && rgb[1] <= 25 && rgb[2] <= 25) {
      rgb[1] = 0
      rgb[2] = 0
    }
    return [Math.round(rgb[0]), Math.round(rgb[1]), Math.round(rgb[2])]
  }

  rgb2hs (r, g, b) {
    /*
      Credit:
      https://github.com/WickyNilliams/pure-color
    */
    r = parseInt(r)
    g = parseInt(g)
    b = parseInt(b)
    const min = Math.min(r, g, b)
    const max = Math.max(r, g, b)
    const delta = max - min
    let h
    let s
    if (max === 0) {
      s = 0
    } else {
      s = (delta / max) * 100
    }
    if (max === min) {
      h = 0
    } else if (r === max) {
      h = (g - b) / delta
    } else if (g === max) {
      h = 2 + (b - r) / delta
    } else if (b === max) {
      h = 4 + (r - g) / delta
    }
    h = Math.min(h * 60, 360)

    if (h < 0) {
      h += 360
    }
    return [Math.round(h), Math.round(s)]
  }

  rgb2xy (r, g, b) {
    const redC = r / 255
    const greenC = g / 255
    const blueC = b / 255
    const redN = redC > 0.04045 ? Math.pow((redC + 0.055) / (1.0 + 0.055), 2.4) : redC / 12.92
    const greenN =
      greenC > 0.04045 ? Math.pow((greenC + 0.055) / (1.0 + 0.055), 2.4) : greenC / 12.92
    const blueN = blueC > 0.04045 ? Math.pow((blueC + 0.055) / (1.0 + 0.055), 2.4) : blueC / 12.92
    const X = redN * 0.664511 + greenN * 0.154324 + blueN * 0.162028
    const Y = redN * 0.283881 + greenN * 0.668433 + blueN * 0.047685
    const Z = redN * 0.000088 + greenN * 0.07231 + blueN * 0.986039
    const x = X / (X + Y + Z)
    const y = Y / (X + Y + Z)
    return [x, y]
  }

  xy2rgb (x, y) {
    const z = 1 - x - y
    const X = x / y
    const Z = z / y
    let red = X * 1.656492 - 1 * 0.354851 - Z * 0.255038
    let green = -X * 0.707196 + 1 * 1.655397 + Z * 0.036152
    let blue = X * 0.051713 - 1 * 0.121364 + Z * 1.01153
    if (red > blue && red > green && red > 1) {
      green = green / red
      blue = blue / red
      red = 1
    } else if (green > blue && green > red && green > 1) {
      red = red / green
      blue = blue / green
      green = 1
    } else if (blue > red && blue > green && blue > 1.0) {
      red = red / blue
      green = green / blue
      blue = 1.0
    }
    red = red <= 0.0031308 ? 12.92 * red : (1.0 + 0.055) * Math.pow(red, 1.0 / 2.4) - 0.055
    green = green <= 0.0031308 ? 12.92 * green : (1.0 + 0.055) * Math.pow(green, 1.0 / 2.4) - 0.055
    blue = blue <= 0.0031308 ? 12.92 * blue : (1.0 + 0.055) * Math.pow(blue, 1.0 / 2.4) - 0.055
    red = Math.abs(Math.round(red * 255))
    green = Math.abs(Math.round(green * 255))
    blue = Math.abs(Math.round(blue * 255))
    if (isNaN(red)) {
      red = 0
    }
    if (isNaN(green)) {
      green = 0
    }
    if (isNaN(blue)) {
      blue = 0
    }
    return [red, green, blue]
  }
}
