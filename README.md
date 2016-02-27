# homebridge-vsx

homebrdige-vsx is a plugin for homebrige, wich allows switching on and off your AV Reciever.

# Installation

Beta Software!
Only the On/Off Switching works!

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-vsx
3. Update your configuration file. See sample-config.json in this repository for a sample. 

# Configuration

Configuration sample:

 ```
"accessories": [
        {
            "accessory": "VSX",
            "name": "VSX-921",
            "description": "Reciever",
            "ip": "192.168.178.20"
        }

    ]
```

# To Do:

1. Parse response from telnet server for the ?P Querry and set On/Off Status
2. Volume control
3. Channel control
