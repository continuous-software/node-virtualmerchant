'use strict';

var testGatewayResponses = require('../lib/TestGatewayResponses.js');

Object.keys(testGatewayResponses).forEach(function (network) {
  console.log(network + ':');
  var errorCodes = [];
  Object.keys(testGatewayResponses[network]).forEach(function (e) {
    errorCodes = errorCodes.concat(testGatewayResponses[network][e]);
  });
  errorCodes.sort();
  var notCovered = 0;
  for (var i = 0; i < 99; i++) {
    var current = (i < 10) ? '0' + i : i.toString();
    if (current != errorCodes[i - notCovered]) {
      console.log('Response #' + current + ' not covered by unit tests.');
      notCovered++;
    }
  }
});
