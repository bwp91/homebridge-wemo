/* jshint node: true, esversion: 10, -W014, -W033 */
/* eslint-disable new-cap */
'use strict'

module.exports = {
  defaultConfig: {
    name: 'Wemo',
    mode: 'auto',
    debug: false,
    debugFakegato: false,
    debugNodeSSDP: false,
    hideConnectionErrors: false,
    disablePlugin: false,
    discoveryInterval: 30,
    pollingInterval: 30,
    upnpInterval: 300,
    disableUPNP: false,
    disableDeviceLogging: false,
    removeByName: '',
    wemoClient: {
      callback_url: '',
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
    wemoLinks: [],
    wemoMotions: [],
    wemoOthers: [],
    wemoOutlets: [],
    platform: 'Wemo'
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
    upnpInterval: 300,
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
    upnpInterval: 60,
    wattDiff: 1
  },

  allowed: {
    mode: ['auto', 'semi', 'manual'],
    makerTypes: [
      'label',
      'serialNumber',
      'ignoreDevice',
      'makerType',
      'makerTimer',
      'reversePolarity',
      'manualIP',
      'listenerType',
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
      'listenerType',
      'overrideDisabledLogging'
    ],
    wemoLights: [
      'label',
      'serialNumber',
      'ignoreDevice',
      'adaptiveLightingShift',
      'brightnessStep',
      'transitionTime',
      'manualIP',
      'listenerType',
      'overrideDisabledLogging'
    ],
    wemoLinks: ['label', 'serialNumber', 'ignoreDevice', 'manualIP', 'listenerType'],
    wemoMotions: [
      'label',
      'serialNumber',
      'ignoreDevice',
      'noMotionTimer',
      'manualIP',
      'overrideDisabledLogging'
    ],
    wemoOthers: [
      'label',
      'serialNumber',
      'ignoreDevice',
      'manualIP',
      'listenerType',
      'overrideDisabledLogging'
    ],
    wemoOutlets: [
      'label',
      'serialNumber',
      'ignoreDevice',
      'showAs',
      'manualIP',
      'listenerType',
      'overrideDisabledLogging'
    ],
    listenerType: ['default', 'http'],
    showAs: ['default', 'switch', 'purifier'],
    overrideLogging: ['default', 'standard', 'debug', 'disable']
  },

  portsToScan: [49153, 49152, 49154, 49155, 49151, 49156, 49157, 49158, 49159],
  servicesToSubscribe: [
    'urn:Belkin:service:basicevent:1',
    'urn:Belkin:service:insight:1',
    'urn:Belkin:service:bridge:1'
  ]
}
