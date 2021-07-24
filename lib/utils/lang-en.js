/* jshint node: true,esversion: 9, -W014, -W033 */
/* eslint-disable new-cap */
'use strict'

module.exports = {
  accNotFound: 'accessory not found',
  alDisabled: 'adaptive lighting disabled due to significant colour change',
  awaiting: 'awaiting (re)connection and will retry in',
  brand: 'Belkin Wemo',
  cantCtl: 'could not update from internal change as',
  cantUpd: 'could not update from external change as',
  cfgDef: 'is not a valid number so using default of',
  cfgIgn: 'is not configured correctly so ignoring',
  cfgIgnItem: 'has an invalid entry which will be ignored',
  cfgItem: 'Config entry',
  cfgLow: 'is set too low so increasing to',
  cfgRmv: 'is unused and can be removed',
  cfgQts: 'should not have quotes around its entry',
  complete: '✓ Setup complete',
  connError: 'connection error',
  curAir: 'current air quality',
  curBright: 'current brightness',
  curCCT: 'current cct',
  curCons: 'current consumption',
  curCont: 'current contact',
  curHumi: 'current humidity',
  curIon: 'current ionizer',
  curOIU: 'current outlet-in-use',
  curMode: 'current mode',
  curState: 'current state',
  curTemp: 'current temperature',
  curTimer: 'current timer',
  detectedNo: 'not detected',
  detectedYes: 'detected',
  devAdd: 'has been added to Homebridge',
  devInitOpts: 'initialising with options',
  devNotAdd: 'could not be added to Homebridge as',
  devNotConf: 'could not be configured as',
  devNotInit: 'could not be initialised as',
  devNotRemove: 'could not be removed from Homebridge as',
  devOffline: 'appears to be offline',
  devRemove: 'has been removed from Homebridge',
  dimmerNoPoll: 'Polling is set up for this device but is most likely not needed',
  dimmerPoll: 'Polling may be needed to update external brightness changes, see config',
  disabled: 'To change this, set disablePlugin to false',
  disabling: 'Disabling plugin',
  errConnRefused: 'the port used may have changed, try restarting Homebridge to fix this',
  errHostUnreach: 'check this device is powered on and connected to your local network',
  hbVersionFail: 'Your version of Homebridge is too low - please update to v1.3',
  identify: 'identify button pressed',
  incFail: 'failed to process incoming message as',
  incKnown: 'incoming notification',
  incUnknown: 'incoming notification from unknown accessory',
  initSer: 'initialised with s/n',
  initMac: 'and ip/port',
  initialised: 'Plugin initialised. Setting up accessories...',
  initialising: 'Initialising plugin',
  insCons: 'consumption',
  insOnTime: 'today ontime',
  insTC: 'total consumption',
  labelAuto: 'auto',
  labelClosed: 'closed',
  labelClosing: 'closing',
  labelEco: 'eco',
  labelExc: 'excellent',
  labelFair: 'fair',
  labelFP: 'frost-protect',
  labelHigh: 'high',
  labelLow: 'low',
  labelMax: 'max',
  labelMed: 'med',
  labelMin: 'min',
  labelPoor: 'poor',
  labelOff: 'off',
  labelOpen: 'open',
  labelOpening: 'opening',
  labelStopped: 'stopped',
  labelWarm: 'warm',
  listenerClosed: 'Listener server gracefully closed',
  listenerError: 'Listener server error',
  listenerPort: 'Listener server port',
  makerClosed: 'is already closed so ignoring command',
  makerClosing: 'is already closing so ignoring command',
  makerNeedMMode: 'must be set to momentary mode to work as a garage door',
  makerOpen: 'is already open so ignoring command',
  makerOpening: 'is already opening so ignoring command',
  makerTrigExt: 'triggered externally',
  modelLED: 'LED Bulb (Via Link)',
  motionNo: 'clear',
  motionSensor: 'motion sensor',
  motionYes: 'motion detected',
  noInterface: 'Unable to find interface',
  noPort: 'could not find correct port for device',
  notConfigured: 'Plugin has not been configured',
  proEr: 'could not be processed as',
  purifyNo: 'not purifying',
  purifyYes: 'purifying',
  rduErr: 'requestDeviceUpdate() error',
  recUpd: 'receiving update',
  repError: 'reported error',
  reportedErr: 'reported error and will retry connection within',
  senUpd: 'sending update',
  ssdpFail: 'SSDP search failed as',
  ssdpStopped: 'SSDP client gracefully stopped',
  sdErr: 'could not request subdevices as',
  servicesNotArray: 'provided service list is not of type array',
  subError: 'subscription error, retrying in 2 seconds',
  subInit: 'initial subscription for service',
  subPending: 'subscription still pending',
  subscribeError: 'could not subscribe as',
  tarHumi: 'target humidity',
  tarState: 'target state',
  tarTemp: 'target temperature',
  timerComplete: 'timer complete',
  timerStarted: 'timer started',
  timerStopped: 'timer stopped',
  unsupported: 'is unsupported but feel free to create a GitHub issue',
  viaAL: 'via adaptive lighting',
  zWelcome: [
    "Don't forget to ☆ this plugin on GitHub if you're finding it useful!",
    'Have a feature request? Visit http://bit.ly/hb-wemo-issues to ask!',
    'Interested in sponsoring this plugin? https://github.com/sponsors/bwp91',
    "Join the plugin's Discord community! https://discord.gg/cMGhNtZ3tW",
    'Thanks for using this plugin, I hope you find it helpful!',
    'This plugin has been made with ♥ by bwp91 from the UK!',
    'Have time to give this plugin a review? http://bit.ly/hb-wemo-review',
    'Want to see this plugin in your own language? Let me know!'
  ]
}