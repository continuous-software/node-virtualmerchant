'use strict';

var testGatewayResponses = require('./TestGatewayResponses.js');

module.exports = {
  adjustAmount: function (amount, creditCardNetwork, expectedResponse) {
    if (!testGatewayResponses[creditCardNetwork])
      throw "unknown credit card network '" + creditCardNetwork + "'";
    else if (!testGatewayResponses[creditCardNetwork][expectedResponse])
      throw "unknown expected response '" + expectedResponse + "'";
    else {
      var getRandom = function (min, max) {
        return Math.floor(Math.random() * (--max - min + 1)) + min;
      };
      var expectedCents = testGatewayResponses[creditCardNetwork][expectedResponse];
      var amountCents = expectedCents[getRandom(0, expectedCents.length)];
      var adjustedAmount = parseFloat(parseInt(amount) + '.' + amountCents).toFixed(2);
      return adjustedAmount;
    }
  }
};
