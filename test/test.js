'use strict';

var VirtualMerchant = require('../index.js').gateway;
var TestGatewayHelper = require('../index.js').testGatewayHelper;
var GatewayError = require('42-cent-base').GatewayError;
var CreditCard = require('42-cent-model').CreditCard;
var Prospect = require('42-cent-model').Prospect;
var assert = require('assert');
var casual = require('casual');

var extraPaymentFields = {
  description: 'continuous-software/node-virtualmerchant - npm test'
};

var prospect = new Prospect()
  .withBillingFirstName(casual.first_name)
  .withBillingLastName(casual.last_name)
  .withBillingEmailAddress(casual.email)
  .withBillingPhone(casual.phone)
  .withBillingAddress1(casual.address1)
  .withBillingAddress2(casual.address2)
  .withBillingCity(casual.city)
  .withBillingState(casual.state)
  .withBillingPostalCode('3212')
  .withBillingCountry(casual.country_code)
  .withShippingFirstName(casual.first_name)
  .withShippingLastName(casual.last_name)
  .withShippingAddress1(casual.address1)
  .withShippingAddress2(casual.address2)
  .withShippingCity(casual.city)
  .withShippingState(casual.state)
  .withShippingPostalCode('3212')
  .withShippingCountry(casual.country_code);

var creditCards = {
  visa: new CreditCard()
    .withCreditCardNumber('4111111111111111')
    .withExpirationMonth('12')
    .withExpirationYear('2017')
    .withCvv2('123'),
  mastercard: new CreditCard()
    .withCreditCardNumber(casual.card_number('MasterCard'))
    .withExpirationMonth('12')
    .withExpirationYear('2017')
    .withCvv2('123'),
  amex: new CreditCard()
    .withCreditCardNumber(casual.card_number('American Express'))
    .withExpirationMonth('12')
    .withExpirationYear('2017')
    .withCvv2('123'),
  discover: new CreditCard()
    .withCreditCardNumber(casual.card_number('Discover Card'))
    .withExpirationMonth('12')
    .withExpirationYear('2017')
    .withCvv2('123'),
  forbidden: new CreditCard()
    .withCreditCardNumber('5000300020003003')
    .withExpirationMonth('12')
    .withExpirationYear('2017')
    .withCvv2('123')
};

var defaultExpectedServiceError = 'DECLINED';

describe('VirtualMerchant SDK', function () {

  var service;

  beforeEach(function () {
    service = VirtualMerchant({
      MERCHANT_ID: '000078',
      USER_ID: 'webpage',
      SSL_PIN: 'ZKN0S1',
      testMode: true
    });
  });

  describe('Service', function () {

    it('should submit a transaction', function (done) {
      service.submitTransaction({
        amount: TestGatewayHelper.adjustAmount(casual.integer(0, 99), 'visa', 'APPROVAL')
      }, creditCards.visa, prospect, extraPaymentFields).then(function (transaction) {
        assert(transaction.transactionId, 'transactionId should be defined');
        assert(transaction._original, 'original should be defined');
        done();
      }, function (err) {
        done(err);
      });
    });

    it('should authorize a transaction', function (done) {

      service.authorizeTransaction({
        amount: TestGatewayHelper.adjustAmount(casual.integer(0, 99), 'visa', 'APPROVAL')
      }, creditCards.visa, prospect).then(function (transaction) {
        assert(transaction.transactionId, 'transactionId should be defined');
        assert(transaction._original, 'original should be defined');
        done();
      }, function (err) {
        done(err);
      });
    });

    it('should settle a transaction', function (done) {
      var transactionId;
      service.submitTransaction({
        amount: TestGatewayHelper.adjustAmount(casual.integer(0, 99), 'visa', 'APPROVAL')
      }, creditCards.visa, prospect, extraPaymentFields).then(function (transaction) {
        transactionId = transaction.transactionId;
        assert(transaction.transactionId, 'transactionId should be defined');
        assert(transaction._original, 'original should be defined');
        return service.settleTransaction(transactionId, prospect);
      }).then(function (res) {
        assert.equal(res.transactionId, transactionId);
        done();
      }).catch(function (err) {
        done(err);
      });
    });

    it('should get batch statistics', function (done) {
      service.getSettledBatchList(new Date(Date.now() - 1000 * 3600 * 24 * 7))
        .then(function (result) {
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });

    it('should refund a transaction', function (done) {

      service.getSettledBatchList(new Date(Date.now() - 1000 * 3600 * 24 * 7))
        .then(function (result) {
          return result.filter(function (val) {
            return val.ssl_trans_status === 'STL';
          });
        })
        .then(function (settled) {
          if (settled.length === 0) {
            return done();
          }
          return service.refundTransaction(settled[0].ssl_txn_id, prospect);
        })
        .then(function (result) {
          //something is wrong for with the done('no settled...')
          if (result) {
            assert.equal(result._original.ssl_result_message, 'APPROVAL');
            done();
          }
        })
        .catch(function (err) {
          done(err);
        });
    });

    it('should void a transaction', function (done) {
      service.submitTransaction({
        amount: TestGatewayHelper.adjustAmount(casual.integer(0, 99), 'visa', 'APPROVAL')
      }, creditCards.visa, prospect, extraPaymentFields).then(function (transaction) {
        return service.voidTransaction(transaction.transactionId, prospect);
      }).then(function (result) {
        assert(result._original, '_original should be defined');
        done();
      }).catch(function (err) {
        done(err);
      });
    });

    it('should create a customer profile', function (done) {
      service.createCustomerProfile(creditCards.visa, prospect)
        .then(function (result) {
          assert(result.profileId, ' profileId Should be defined');
          assert(result._original, '_original should be defined');
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });

    it('should charge a existing customer', function (done) {
      var random = Math.floor(Math.random() * 1000);
      prospect.customerEmail = 'something@else.fr';
      service.createCustomerProfile(creditCards.visa, prospect)
        .then(function (result) {
          assert(result.profileId, ' profileId Should be defined');
          assert(result._original, '_original should be defined');
          prospect.profileId = result.profileId;
          return service.chargeCustomer({
            amount: TestGatewayHelper.adjustAmount(casual.integer(0, 99), 'visa', 'APPROVAL')
          }, prospect);
        })
        .then(function (res) {
          assert.equal(res.transactionId, res._original.ssl_txn_id);
          assert(res._original, '_original should be defined');
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });

  });

  describe('Promise API error handler', function () {

    describe('should reject the promise when internal rules returns an error on', function () {

      it('submitTransaction transaction using credit card 5000300020003003', function (done) {
        service.submitTransaction({
          amount: TestGatewayHelper.adjustAmount(casual.integer(0, 99), 'mastercard', 'APPROVAL')
        }, creditCards.forbidden, prospect, extraPaymentFields).then(function () {
          throw new Error('should not get here');
        }, function (rejection) {
          assert.equal(rejection, 'usage of this card has been restricted due to its undocumented behavior');
          done();
        });
      });

    });

    describe('should reject the promise when service returns an error on', function () {

      it('rejected submitTransaction', function (done) {
        service.submitTransaction({
          amount: TestGatewayHelper.adjustAmount(casual.integer(0, 99), 'visa', defaultExpectedServiceError)
        }, creditCards.visa, prospect, extraPaymentFields).then(function () {
          throw new Error('should not get here');
        }, function (rejection) {
          assert.equal(rejection.message, defaultExpectedServiceError);
          assert(rejection._original, 'should have the original error from sdk/gateway');
          done();
        });
      });

      it('authorizeTransaction', function (done) {
        service.authorizeTransaction({
          amount: TestGatewayHelper.adjustAmount(casual.integer(0, 99), 'visa', defaultExpectedServiceError)
        }, creditCards.visa, prospect).then(function () {
          throw new Error('should not get here');
        }, function (rejection) {
          assert.equal(rejection.message, defaultExpectedServiceError);
          assert(rejection._original, 'should have the original error from sdk/gateway');
          done();
        });
      });

      it('voidTransaction', function (done) {
        service.voidTransaction(666, prospect)
          .then(function (res) {
            throw new Error('it should not get here');
          }, function (err) {
            assert(err instanceof GatewayError, 'err should be an instance of GatewayError');
            assert.equal(err.message, 'The transaction ID is invalid for this transaction type');
            assert(err._original, 'original should be defined');
            done();
          });
      });

      it('refundTransaction', function (done) {
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

      it('getSettledBatchList', function (done) {
        service.getSettledBatchList(new Date(), new Date(Date.now() - 24 * 1000 * 3600))
          .then(function (result) {
            throw new Error('should not get here');
          }).catch(function (err) {
            assert.equal(err.message, 'Search dates must be formatted as MM/DD/YYYY, the end date must be greater than the start date and the range cannot be greater than 31 days.', 'it should have the gateway error message');
            assert(err._original, '_original should be defined');
            done();
          });
      });

      it('createCustomerProfile', function (done) {
        service.createCustomerProfile({}, prospect)
          .then(function (result) {
            throw new Error('it should not get here');
          }, function (err) {
            assert(err._original, '_original should be defined');
            assert.equal(err.message, 'The Credit Card Number supplied in the authorization request appears to be invalid.');
            done();
          });
      });

      xit('chargeCustomer', function (done) {
        return service.chargeCustomer({
          amount: TestGatewayHelper.adjustAmount(casual.integer(0, 99), 'visa', 'APPROVED')
        }, {
          profileId: '1234'
        }).then(function () {
          throw new Error('should not get here');
        }, function (err) {
          assert(err._original, '_original should be defined');
          assert.equal(err.message, 'The token supplied in the authorization request appears to be invalid');
          done();
        });
      });

    });

  });

  xdescribe('Test Service', function () {

    Object.keys(TestGatewayHelper.responses).forEach(function (network) {

      describe('with ' + network.toUpperCase() + ' credit card', function () {

        Object.keys(TestGatewayHelper.responses[network]).forEach(function (expectedResponse) {
          it('returns ' + expectedResponse, function (done) {
            var expected = expectedResponse.replace(/_/g, ' ');
            service.submitTransaction({
              amount: TestGatewayHelper.adjustAmount(casual.integer(0, 99), network, expectedResponse)
            }, creditCards[network], prospect, extraPaymentFields).then(function (transaction) {
              assert(transaction.transactionId, 'transactionId should be defined');
              assert(transaction._original, 'original should be defined');
              assert((transaction._original.ssl_result_message === expected), 'should get ' + expected);
              done();
            }, function (transaction) {
              assert(transaction._original, 'original should be defined');
              assert((transaction._original.ssl_result_message === expected), 'should get ' + expected);
              done();
            });
          });
        });

      });

    });

  });

});