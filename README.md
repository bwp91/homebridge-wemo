# homebridge-wemo

Supports Belkin WeMo devices on HomeBridge Platform

This module does not support the WeMo Bulbs and their Bridge - I am working on homebridge-wemo2 that will.  Initial version should go up soon I hope.

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-wemo
3. Update your configuration file. See sample-config.json in this repository for a sample. 

# Configuration

Configuration sample:

 ```
"accessories": [
        {
            "accessory": "WeMo",
            "name": "Lounge Lamp",
            "description": "The Lamp in the Loungeroom",
            "wemo_name": "Lounge Lamp"
        },
        {
            "accessory": "WeMo",
            "name": "Outside Lights",
            "description": "The Festoon Lights in the Back Yard.",
            "wemo_name": "Festoon Lights"
        },
        {
            "accessory": "WeMo",
            "name": "Bookcase Lamp",
            "description": "The Lamp on the Bookcase.",
            "wemo_name": "Bookcase Lamp"
        }
    ]

```
