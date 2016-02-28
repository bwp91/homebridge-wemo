# homebridge-vsx

homebrdige-vsx is a plugin made homebrige, wich allows switching on and off your Pioneer AV Reciever. All AV Recievers, wich work with the iControl AV5 App are supported.

# Installation


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

1. Volume control
2. Channel control
