var VirtualMerchant = require('./lib/VirtualMerchantGateway.js');

module.exports = function factory(config) {
    return new VirtualMerchant(config);
};