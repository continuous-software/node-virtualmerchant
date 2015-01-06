'use strict';

var VirtualMerchant = require('../index.js');
var GatewayError = require('42-cent-base').GatewayError;
var CreditCard = require('42-cent-model').CreditCard;
var Prospect = require('42-cent-model').Prospect;
var assert = require('assert');

describe('Virtual merchant service', function () {

  var service;
  var testcc = 4111111111111111;

  //to avoid duplicate transaction we change the amoung
  function randomAmount() {
    return Math.ceil(Math.random() * 100);
  }

  beforeEach(function () {
    service = VirtualMerchant({
      MERCHANT_ID: '000078',
      USER_ID: 'webpage',
      SSL_PIN: 'ZKN0S1',
      testMode: true
    });
  });

  describe('submit transaction', function () {

    it('should submit transaction request', function (done) {
      var cc = {
        creditCardNumber: testcc,
        expirationYear: '2017',
        expirationMonth: '01',
        cvv: '666'
      };
      service.submitTransaction({amount: randomAmount()}, cc).then(function (transaction) {
        assert(transaction.transactionId, 'transactionId should be defined');
        assert(transaction._original, 'original should be defined');
        done();
      }, function (err) {
        console.log(err);
      });
    });

    it('should reject the promise when using credit card 5000 3000 2000 3003', function (done) {
      var cc = {
        creditCardNumber: 5000300020003003,
        expirationMonth: 2016,
        expirationYear: 10,
        cvv: 666
      };

      service.submitTransaction({amount: randomAmount()}, cc).then(function () {
        throw new Error('should not get here');
      }, function (rejection) {
        assert.equal(rejection, 'usage of this card has been restricted due to its undocumented behavior');
        done();
      });
    });


    it('should submit a transaction with prospect information', function (done) {
      var cc = {
        creditCardNumber: testcc,
        expirationYear: '2017',
        expirationMonth: '01',
        cvv: '666'
      };

      var prospect = {
        customerFirstName: 'bob',
        customerLastName: 'Leponge',
        billingAddress: '123, yen phu',
        billingZip: '49389'
      };
      service.submitTransaction({amount: randomAmount()}, cc, prospect).then(function (transaction) {
        assert(transaction.transactionId, 'transactionId should be defined');
        assert(transaction._original, 'original should be defined');
        done();
      }, function (err) {
        console.log(err);
      });
    });

    it('should reject the promise when web service send an error code', function (done) {
      var cc = {
        creditCardNumber: 234234,
        expirationMonth: 2016,
        expirationYear: 10,
        cvv: 666
      };

      service.submitTransaction({amount: randomAmount()}, cc).then(function () {
        throw new Error('should not get here');
      }, function (rejection) {
        assert.equal(rejection.message, 'The Credit Card Number supplied in the authorization request appears to be invalid.');
        assert(rejection._original, 'should have the original error from sdk/gateway');
        done();
      });
    });
  });

  describe('authorize transaction', function () {

    it('should authorize transaction request', function (done) {
      var cc = {
        creditCardNumber: testcc,
        expirationYear: '2017',
        expirationMonth: '01',
        cvv: '666'
      };
      service.authorizeTransaction({amount: randomAmount()}, cc).then(function (transaction) {
        assert(transaction.transactionId, 'transactionId should be defined');
        assert(transaction._original, 'original should be defined');
        done();
      }, function (err) {
        console.log(err);
      });
    });

    it('should authorize a transaction with prospect information', function (done) {
      var cc = {
        creditCardNumber: testcc,
        expirationYear: '2017',
        expirationMonth: '01',
        cvv: '666'
      };

      var prospect = {
        customerFirstName: 'bob',
        customerLastName: 'Leponge',
        billingAddress: '123, yen phu',
        billingZip: '49389'
      };
      service.authorizeTransaction({amount: randomAmount()}, cc, prospect).then(function (transaction) {
        assert(transaction.transactionId, 'transactionId should be defined');
        assert(transaction._original, 'original should be defined');
        done();
      }, function (err) {
        console.log(err);
      });
    });

    it('should reject the promise when web service send an error code', function (done) {
      var cc = {
        creditCardNumber: 234234,
        expirationMonth: 2016,
        expirationYear: 10,
        cvv: 666
      };

      service.authorizeTransaction({amount: randomAmount()}, cc).then(function () {
        throw new Error('should not get here');
      }, function (rejection) {
        assert.equal(rejection.message, 'The Credit Card Number supplied in the authorization request appears to be invalid.');
        assert(rejection._original, 'should have the original error from sdk/gateway');
        done();
      });
    });
  });

  describe('settle a transaction', function () {

    it('should settle a transaction', function (done) {
      var cc = {
        creditCardNumber: testcc,
        expirationYear: '2017',
        expirationMonth: '01',
        cvv: '666'
      };

      var txnId;

      service.submitTransaction({amount: randomAmount()}, cc).then(function (transaction) {
        txnId = transaction.transactionId;
        assert(transaction.transactionId, 'transactionId should be defined');
        assert(transaction._original, 'original should be defined');
      })
        .then(function () {
          return service.settleTransaction(txnId);
        })
        .then(function (res) {
          assert.equal(res.transactionId, txnId);
          done();
        })
        .catch(function (err) {
          console.log(err);
        });
    });
  });

  describe('get batch statistics', function () {

    var service;

    beforeEach(function () {
      service = VirtualMerchant({
        MERCHANT_ID: '000078',
        USER_ID: 'webpage',
        SSL_PIN: 'ZKN0S1',
        testMode: true
      });
    });

    it('should get batch statistics', function (done) {
      service.getSettledBatchList(new Date(Date.now() - 1000 * 3600 * 24 * 7))
        .then(function (result) {
          console.log(result.map(function (val) {
            return {
              status: val.ssl_trans_status,
              result: val.ssl_result_message
            };
          }));
          done();
        })
        .catch(function (err) {
          console.log(err);
        });
    });

    it('should reject the promise when web service returns an error', function (done) {
      service.getSettledBatchList(new Date(), new Date(Date.now() - 24 * 1000 * 3600)).then(function (result) {
        throw new Error('should not get here');
      }).catch(function (err) {
        assert.equal(err.message, 'Search dates must be formatted as MM/DD/YYYY, the end date must be greater than the start date and the range cannot be greater than 31 days.', 'it should have the gateway error message');
        assert(err._original, '_original should be defined');
        done();
      });


      it('should reject the promise when web service send an error code', function (done) {
        var cc = {
          creditCardNumber: 234234,
          expirationMonth: 2016,
          expirationYear: 10,
          cvv: 666
        };

        service.submitTransaction({amount: randomAmount()}, cc).then(function () {
          throw new Error('should not get here');
        }, function (rejection) {
          assert.equal(rejection.message, 'The Credit Card Number supplied in the authorization request appears to be invalid.');
          assert(rejection._original, 'should have the original error from sdk/gateway');
          done();
        });
      });

      it('should reject the promise when using credit card 5000 3000 2000 3003', function (done) {
        var cc = {
          creditCardNumber: 5000300020003003,
          expirationMonth: 2016,
          expirationYear: 10,
          cvv: 666
        };

        service.submitTransaction({amount: randomAmount()}, cc).then(function () {
          throw new Error('should not get here');
        }, function (rejection) {
          assert.equal(rejection, 'usage of this card has been restricted due to its undocumented behavior');
          done();
        });
      });
    });


  });

  describe('refund a transaction', function () {

    it('should refund a transaction', function (done) {

      service.getSettledBatchList(new Date(Date.now() - 1000 * 3600 * 24 * 7))
        .then(function (result) {
          return result.filter(function (val) {
            return val.ssl_trans_status === 'STL';
          });
        })
        .then(function (settled) {
          if (settled.length === 0) {
            console.log('we need to have settled transaction to test ');
            done();
          }
          return service.refundTransaction(settled[0].ssl_txn_id);
        })
        .then(function (result) {
          assert.equal(result._original.ssl_result_message, 'APPROVAL');
          done();
        })
        .catch(function (err) {
          console.log('some error: ' + err);
        });
    });

    it('should reject the promise when web service return an error', function (done) {
      service.refundTransaction('-666')
        .then(function () {
          throw new Error('should not get here');
        })
        .catch(function (err) {
          assert(err instanceof GatewayError, 'err should be an instance of GatewayError');
          assert.equal(err.message, 'The transaction ID is invalid for this transaction type');
          assert(err._original, 'original should be defined');
          done();
        });
    });

  });

  describe('void a transaction', function () {

    it('should void a transaction', function (done) {

      var cc = {
        creditCardNumber: testcc,
        expirationYear: '2017',
        expirationMonth: '01',
        cvv: '666'
      };

      var transId;

      service.submitTransaction({amount: randomAmount()}, cc).then(function (transaction) {
        transId = transaction.transactionId;
        return service.voidTransaction(transId);
      })
        .then(function (result) {
          assert(result._original, '_original should be defined');
          done();
        })
        .catch(function (err) {
          console.log(err);
        });
    });

    it('should reject the promise when the gateway returns error', function (done) {
      service.voidTransaction(666)
        .then(function (res) {
          throw new Error('it should not get here');
        }, function (err) {
          assert(err instanceof GatewayError, 'err should be an instance of GatewayError');
          assert.equal(err.message, 'The transaction ID is invalid for this transaction type');
          assert(err._original, 'original should be defined');
          done();
        });
    });
  });

  describe('create customer profile', function () {

    it('should create a customer profile', function (done) {

      var cc = new CreditCard()
        .withCreditCardNumber('4111111111111111')
        .withExpirationMonth('12')
        .withExpirationYear('2017')
        .withCvv('123');

      var billing = {
        customerFirstName: 'bob',
        customerLastName: 'leponge',
        email: 'bob@eponge.com'
      };

      service.createCustomerProfile(cc, billing)
        .then(function (result) {
          assert(result.profileId, ' profileId Should be defined');
          assert(result._original, '_original should be defined');
          done();
        })
        .catch(function (err) {
          console.log(err);
        });
    });

    it('should reject the promise when the gateway return an error', function (done) {
      var cc = new CreditCard()
        .withCreditCardNumber('41111')
        .withExpirationMonth('12')
        .withExpirationYear('2010')
        .withCvv('123');

      var billing = {
        customerFirstName: 'bob',
        customerLastName: 'leponge',
        email: 'bob@eponge.com'
      };

      service.createCustomerProfile(cc, billing)
        .then(function (result) {
          throw new Error('it should not get here');
        }, function (err) {
          assert(err._original, '_original should be defined');
          assert.equal(err.message, 'The Credit Card Number supplied in the authorization request appears to be invalid.');
          done();
        });
    });
  });

  describe('charge customer profile', function () {

    it('should charge a existing customer', function (done) {

      var random = Math.floor(Math.random() * 1000);


      var cc = new CreditCard()
        .withCreditCardNumber('4111111111111111')
        .withExpirationMonth('12')
        .withExpirationYear('2017')
        .withCvv('123');

      var billing = {
        customerFirstName: 'bob',
        customerLastName: 'leponge',
        email: random + 'bob@eponge.com'
      };

      service.createCustomerProfile(cc, billing)
        .then(function (result) {
          var randomAmount = Math.floor(Math.random() * 300);
          assert(result.profileId, ' profileId Should be defined');
          assert(result._original, '_original should be defined');

          return service.chargeCustomer({amount: randomAmount}, {profileId: result.profileId});
        })
        .then(function (res) {
          assert.equal(res.transactionId, res._original.ssl_txn_id);
          assert(res._original, '_original should be defined');
          done();
        })
        .catch(function (err) {
          console.log(err);
        });
    });

    it('should reject the promise when the gateway return an error', function (done) {
      return service.chargeCustomer({amount: 234}, {profileId: '1234'})
        .then(function () {
          throw new Error('should not get here');
        }, function (err) {
          assert(err._original, '_original should be defined');
          assert.equal(err.message, 'The token supplied in the authorization request appears to be invalid');
          done();
        }
      );
    });
  });
});


