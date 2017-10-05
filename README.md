# homebridge-vsx [![npm version](https://badge.fury.io/js/homebridge-vsx.svg)](https://badge.fury.io/js/homebridge-vsx)

homebridge-vsx is a plugin made for [homebridge](https://github.com/nfarina/homebridge),
which allows switching on and off your Pioneer AV receiver. All AV receivers (VSX and SC),
which work with the iControl AV5 App are supported.

## Installation

1. Install the homebridge framework using `npm install -g homebridge`
2. Install **homebridge-vsx** using `npm install -g homebridge-vsx`
3. Update your configuration file. See `sample-config.json` in this repository for a sample. 

## Accessory configuration example
```json
"accessories": [
	{
		"accessory": "VSX",
		"name": "VSX-921",
		"description": "Receiver",
		"ip": "192.168.178.20",
		"port": 23
	}
]
```

*Notice: Port 23 is the default port for older devices. If port 23 doesn't work for you try port 8102.*

## Roadmap

- [x] Toggling ON/OFF
- [ ] Volume control
- [ ] Channel control
