/* jshint node: true,esversion: 9, -W014, -W033 */
/* eslint-disable new-cap */
'use strict'

module.exports = class eveCharacteristics {
  constructor (api) {
    this.hapServ = api.hap.Service
    this.hapChar = api.hap.Characteristic
    this.uuids = {
      currentConsumption: 'E863F10D-079E-48FF-8F27-9C2605A29F52',
      totalConsumption: 'E863F10C-079E-48FF-8F27-9C2605A29F52',
      voltage: 'E863F10A-079E-48FF-8F27-9C2605A29F52',
      electricCurrent: 'E863F126-079E-48FF-8F27-9C2605A29F52',
      resetTotal: 'E863F112-079E-48FF-8F27-9C2605A29F52',
      lastActivation: 'E863F11A-079E-48FF-8F27-9C2605A29F52',
      openDuration: 'E863F118-079E-48FF-8F27-9C2605A29F52',
      closedDuration: 'E863F119-079E-48FF-8F27-9C2605A29F52',
      timesOpened: 'E863F129-079E-48FF-8F27-9C2605A29F52'
    }
    const self = this
    this.CurrentConsumption = function () {
      self.hapChar.call(this, 'Current Consumption', self.uuids.currentConsumption)
      this.setProps({
        format: self.hapChar.Formats.UINT16,
        unit: 'W',
        maxValue: 100000,
        minValue: 0,
        minStep: 1,
        perms: [self.hapChar.Perms.READ, self.hapChar.Perms.NOTIFY]
      })
      this.value = this.getDefaultValue()
    }
    this.TotalConsumption = function () {
      self.hapChar.call(this, 'Total Consumption', self.uuids.totalConsumption)
      this.setProps({
        format: self.hapChar.Formats.FLOAT,
        unit: 'kWh',
        maxValue: 100000000000,
        minValue: 0,
        minStep: 0.01,
        perms: [self.hapChar.Perms.READ, self.hapChar.Perms.NOTIFY]
      })
      this.value = this.getDefaultValue()
    }
    this.Voltage = function () {
      self.hapChar.call(this, 'Voltage', self.uuids.voltage)
      this.setProps({
        format: self.hapChar.Formats.FLOAT,
        unit: 'V',
        maxValue: 100000000000,
        minValue: 0,
        minStep: 1,
        perms: [self.hapChar.Perms.READ, self.hapChar.Perms.NOTIFY]
      })
      this.value = this.getDefaultValue()
    }
    this.ElectricCurrent = function () {
      self.hapChar.call(this, 'Electric Current', self.uuids.electricCurrent)
      this.setProps({
        format: self.hapChar.Formats.FLOAT,
        unit: 'A',
        maxValue: 100000000000,
        minValue: 0,
        minStep: 0.1,
        perms: [self.hapChar.Perms.READ, self.hapChar.Perms.NOTIFY]
      })
      this.value = this.getDefaultValue()
    }
    this.ResetTotal = function () {
      self.hapChar.call(this, 'Reset Total', self.uuids.resetTotal)
      this.setProps({
        format: self.hapChar.Formats.UINT32,
        unit: self.hapChar.Units.seconds,
        perms: [self.hapChar.Perms.READ, self.hapChar.Perms.NOTIFY, self.hapChar.Perms.WRITE]
      })
      this.value = this.getDefaultValue()
    }
    this.LastActivation = function () {
      self.hapChar.call(this, 'Last Activation', self.uuids.lastActivation)
      this.setProps({
        format: self.hapChar.Formats.UINT32,
        unit: self.hapChar.Units.SECONDS,
        perms: [self.hapChar.Perms.READ, self.hapChar.Perms.NOTIFY]
      })
      this.value = this.getDefaultValue()
    }
    this.OpenDuration = function () {
      self.hapChar.call(this, 'Open Duration', self.uuids.openDuration)
      this.setProps({
        format: self.hapChar.Formats.UINT32,
        unit: self.hapChar.Units.SECONDS,
        perms: [self.hapChar.Perms.READ, self.hapChar.Perms.NOTIFY, self.hapChar.Perms.WRITE]
      })
      this.value = this.getDefaultValue()
    }
    this.ClosedDuration = function () {
      self.hapChar.call(this, 'Closed Duration', self.uuids.closedDuration)
      this.setProps({
        format: self.hapChar.Formats.UINT32,
        unit: self.hapChar.Units.SECONDS,
        perms: [self.hapChar.Perms.READ, self.hapChar.Perms.NOTIFY, self.hapChar.Perms.WRITE]
      })
      this.value = this.getDefaultValue()
    }
    this.TimesOpened = function () {
      self.hapChar.call(this, 'Times Opened', self.uuids.timesOpened)
      this.setProps({
        format: self.hapChar.Formats.UINT32,
        perms: [self.hapChar.Perms.READ, self.hapChar.Perms.NOTIFY]
      })
      this.value = this.getDefaultValue()
    }
    const inherits = require('util').inherits
    inherits(this.CurrentConsumption, this.hapChar)
    inherits(this.TotalConsumption, this.hapChar)
    inherits(this.Voltage, this.hapChar)
    inherits(this.ElectricCurrent, this.hapChar)
    inherits(this.LastActivation, this.hapChar)
    inherits(this.ResetTotal, this.hapChar)
    inherits(this.OpenDuration, this.hapChar)
    inherits(this.ClosedDuration, this.hapChar)
    inherits(this.TimesOpened, this.hapChar)
    this.CurrentConsumption.UUID = this.uuids.currentConsumption
    this.TotalConsumption.UUID = this.uuids.totalConsumption
    this.Voltage.UUID = this.uuids.voltage
    this.ElectricCurrent.UUID = this.uuids.electricCurrent
    this.LastActivation.UUID = this.uuids.lastActivation
    this.ResetTotal.UUID = this.uuids.resetTotal
    this.OpenDuration.UUID = this.uuids.openDuration
    this.ClosedDuration.UUID = this.uuids.closedDuration
    this.TimesOpened.UUID = this.uuids.timesOpened
  }
}
