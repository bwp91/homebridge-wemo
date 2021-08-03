/* jshint node: true,esversion: 9, -W014, -W033 */
/* eslint-disable new-cap */
'use strict'

module.exports = {
  defaultConfig: {
    name: 'Wemo',
    mode: 'auto',
    discoveryInterval: 30,
    disableDeviceLogging: false,
    debug: false,
    debugFakegato: false,
    debugNodeSSDP: false,
    removeByName: '',
    disablePlugin: false,
    wemoClient: {
      listen_interface: '',
      port: 0,
      discover_opts: {
        interfaces: '',
        explicitSocketBind: true
      }
    },
    makerTypes: [],
    wemoInsights: [],
    wemoLights: [],
    wemoMotions: [],
    wemoOthers: [],
    wemoOutlets: [],
    manualDevices: [],
    platform: 'BelkinWeMo'
  },

  defaultValues: {
    adaptiveLightingShift: 0,
    brightnessStep: 1,
    discoveryInterval: 30,
    makerTimer: 20,
    noMotionTimer: 60,
    overrideLogging: 'default',
    pollingInterval: 30,
    port: 0,
    showAs: 'default',
    timeDiff: 1,
    transitionTime: 0,
    wattDiff: 1
  },

  minValues: {
    adaptiveLightingShift: -1,
    discoveryInterval: 15,
    brightnessStep: 1,
    makerTimer: 1,
    noMotionTimer: 0,
    pollingInterval: 15,
    port: 0,
    timeDiff: 1,
    transitionTime: 0,
    wattDiff: 1
  },

  allowed: {
    makerTypes: [
      'label',
      'serialNumber',
      'ignoreDevice',
      'makerType',
      'makerTimer',
      'reversePolarity',
      'manualIP',
      'overrideDisabledLogging'
    ],
    wemoInsights: [
      'label',
      'serialNumber',
      'ignoreDevice',
      'showTodayTC',
      'wattDiff',
      'timeDiff',
      'showAs',
      'manualIP',
      'overrideDisabledLogging'
    ],
    wemoLights: [
      'label',
      'serialNumber',
      'ignoreDevice',
      'adaptiveLightingShift',
      'brightnessStep',
      'pollingInterval',
      'transitionTime',
      'manualIP',
      'overrideDisabledLogging'
    ],
    wemoMotions: [
      'label',
      'serialNumber',
      'ignoreDevice',
      'noMotionTimer',
      'manualIP',
      'overrideDisabledLogging'
    ],
    wemoOthers: ['label', 'serialNumber', 'ignoreDevice', 'manualIP', 'overrideDisabledLogging'],
    wemoOutlets: [
      'label',
      'serialNumber',
      'ignoreDevice',
      'showAs',
      'manualIP',
      'overrideDisabledLogging'
    ],
    showAs: ['default', 'switch', 'purifier'],
    overrideLogging: ['default', 'standard', 'debug', 'disable']
  },

  portsToScan: [49152, 49153, 49154, 49155]
}
