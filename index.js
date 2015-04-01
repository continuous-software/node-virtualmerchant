var VirtualMerchant = require('./lib/VirtualMerchantGateway.js');
var TestGatewayHelper = require('./lib/TestGatewayHelper.js');

module.exports = {
  testGatewayHelper: TestGatewayHelper,
  gateway: function factory(config) {
    return new VirtualMerchant(config);
  }
};
