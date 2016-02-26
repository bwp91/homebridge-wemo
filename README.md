# homebridge-vsx

Planned to controll pioneer av recievers

# I need your help!

if you want to contribute to this plugin here are some ressources:

http://raymondjulin.com/2012/07/15/remote-control-your-pioneer-vsx-receiver-over-telnet/
http://www.pioneerelectronics.com/StaticFiles/PUSA/Files/Home%20Custom%20Install/VSX-1120-K-RS232.PDF

# Installation

!Dont install this is WIP!

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-pioneer_vsx
3. Update your configuration file. See sample-config.json in this repository for a sample. 

# Configuration

Configuration sample:

 ```
"accessories": [
        {
            "accessory": "VSX",
            "name": "My Reciever",
            "description": "Reciever",
            "ip": "127.0.0.1"
        }

    ]
```
