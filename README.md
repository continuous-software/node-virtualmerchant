[![Build Status](https://travis-ci.org/continuous-software/node-virtualmerchant.svg?branch=master)](https://travis-ci.org/continuous-software/node-virtualmerchant)

![node-virtualmerchant](http://s28.postimg.org/f1ptqgfot/logo.png)

## Installation ##

[![Greenkeeper badge](https://badges.greenkeeper.io/continuous-software/node-virtualmerchant.svg)](https://greenkeeper.io/)

    $ npm install -s virtualmerchant

## Usage

```javascript
var VirtualMerchant = require('virtualmerchant');
var client = new VirtualMerchant({
    MERCHANT_ID: '<PLACEHOLDER>',
    USER_ID: '<PLACEHOLDER>',
    SSL_PIN: '<PLACEHOLDER>'
});
```

## Gateway API

This SDK is natively compatible with [42-cent](https://github.com/continuous-software/42-cent).  
It implements the [BaseGateway](https://github.com/continuous-software/42-cent-base) API.
