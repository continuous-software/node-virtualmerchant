var BaseGateway = require('42-cent-base').BaseGateway;
var assert = require('assert');
var util = require('util');
var Promise = require('bluebird');
var GatewayError = require('42-cent-base').GatewayError;
var mapKeys = require('42-cent-util').mapKeys;
var post = Promise.promisify(require('request').post);
var toXml = require('json2xml');
var toJson = require('xml2json').toJson;
var extend = util._extend;

var paymentFieldsSchema = require('./PaymentFields.js');

var transactionSchema = {
  amount: 'ssl_amount',
  creditCardNumber: 'ssl_card_number'
};

var refundSchema = {
  amount: 'ssl_amount',
  customerPhone: 'ssl_phone'
};

/**
 *
 * @param options
 * @constructor
 * @extends BaseGateway
 */
function VirtualMerchantGateway(options) {

  assert(options.MERCHANT_ID, 'MERCHANT_ID must be defined');
  assert(options.USER_ID, 'USER_ID must be defined');
  assert(options.SSL_PIN, 'SSL_PIN must be defined');

  options.merchant_id = options.MERCHANT_ID;
  options.user_id = options.USER_ID;
  options.ssl_pin = options.SSL_PIN;
  options.endpoint = (options.testMode === true)
    ? 'https://demo.myvirtualmerchant.com/VirtualMerchantDemo/processxml.do'
    : 'https://www.myvirtualmerchant.com/VirtualMerchant/processxml.do';

  //will overwrite previously set options
  BaseGateway.call(this, options);
}

function signPayload(payload) {
  payload.ssl_merchant_id = this.merchant_id;
  payload.ssl_user_id = this.user_id;
  payload.ssl_pin = this.ssl_pin;
  return payload;
}

util.inherits(VirtualMerchantGateway, BaseGateway);

/**
 * @inheritsDoc
 */
VirtualMerchantGateway.prototype.submitTransaction = function submitTransaction(order, creditCard, prospect, paymentFields) {
  var payload = {};
  payload.ssl_transaction_type = 'ccsale';
  payload = mapKeys(order || {}, transactionSchema, payload);
  payload = mapKeys(creditCard || {}, transactionSchema, payload);
  payload = mapKeys(creditCard || {}, paymentFieldsSchema, payload);
  payload = mapKeys(prospect || {}, paymentFieldsSchema, payload);
  payload = mapKeys(paymentFields || {}, paymentFieldsSchema, payload);

  if (creditCard.expirationMonth && creditCard.expirationYear) {
    payload.ssl_exp_date = creditCard.expirationMonth + (creditCard.expirationYear.length === 4 ? creditCard.expirationYear.substr(2) : creditCard.expirationYear);
  }
  payload = signPayload.bind(this)(payload);

  if (creditCard.creditCardNumber == '5000300020003003') {
    return Promise.reject('usage of this card has been restricted due to its undocumented behavior');
  }

  return this.query(payload);
};

/**
 * @inheritsDoc
 */
VirtualMerchantGateway.prototype.getSettledBatchList = function getSettledBatchList(from, to) {

  function formatDate(date) {

    var day = date.getUTCDate().toString();
    var month = (date.getUTCMonth() + 1).toString();
    var year = date.getUTCFullYear().toString();

    day = day.length === 1 ? '0' + day : day;
    month = month.length === 1 ? '0' + month : month;

    return [month, day, year].join('/');
  }

  var payload = {
    ssl_transaction_type: 'txnquery',
    ssl_search_start_date: formatDate(new Date(from)),
    ssl_search_end_date: formatDate(to ? new Date(to) : new Date())
  };

  payload = signPayload.bind(this)(payload);
  return this.query(payload).spread(function (response, body) {
    var responseObject = JSON.parse(toJson(body));
    if (responseObject.txnlist) {
      responseObject = responseObject.txnlist;
    } else if (responseObject.txn) {
      throw new GatewayError(responseObject.txn.errorMessage, responseObject.txnlist);
    } else {
      throw new Error('unable to process the gateway response');
    }
    return responseObject.ssl_txn_count > 1
      ? responseObject.txn
      : [responseObject.txn];
    });
};

/**
 * @inheritsDoc
 */
VirtualMerchantGateway.prototype.refundTransaction = function refundTransaction(transId, paymentFields) {

  var payload = extend({});
  payload = mapKeys(paymentFields || {}, paymentFieldsSchema, payload);
  payload = mapKeys(paymentFields || {}, refundSchema, payload);
  payload = signPayload.bind(this)(payload);
  payload.ssl_txn_id = transId;
  payload.ssl_transaction_type = 'ccreturn';

  return post(this.endpoint, {
    form: {
      xmldata: toXml({txn: payload})
    }
  }).spread(function (response, body) {
      var responseObject = JSON.parse(toJson(body));
      if (responseObject.txn && responseObject.txn.errorCode) {
        throw new GatewayError(responseObject.txn.errorMessage, responseObject.txn);
      } else if (!responseObject.txn) {
        throw new Error('unable to process the gateway response');
      }
      return {
        _original: responseObject.txn
      };
    });
};

/**
 * @inheritsDoc
 */
VirtualMerchantGateway.prototype.voidTransaction = function voidTransaction(transactionId, paymentFields) {

  var payload = {};
  payload = mapKeys(paymentFields || {}, paymentFieldsSchema, payload);
  payload.ssl_transaction_type = 'ccvoid',
  payload.ssl_txn_id = transactionId;
  payload = signPayload.bind(this)(payload);

  return post(this.endpoint, {
    form: {
      xmldata: toXml({txn: payload})
    }
  }).spread(function (response, body) {
    var responseObject = JSON.parse(toJson(body));
    if (responseObject.txn && responseObject.txn.errorCode) {
      throw new GatewayError(responseObject.txn.errorMessage, responseObject.txn);
    } else if (!responseObject.txn) {
      throw new Error('unable to process the gateway response');
    }
    return {
      _original: responseObject.txn
    };
  });
};

/**
 * @inheritsDoc
 */
VirtualMerchantGateway.prototype.authorizeTransaction = function (order, creditCard, prospect, paymentFields) {
  var payload = {};
  payload.ssl_transaction_type = 'ccauthonly';
  payload = mapKeys(order || {}, transactionSchema, payload);
  payload = mapKeys(creditCard || {}, transactionSchema, payload);
  payload = mapKeys(creditCard || {}, paymentFieldsSchema, payload);
  payload = mapKeys(prospect || {}, paymentFieldsSchema, payload);
  payload = mapKeys(paymentFields || {}, paymentFieldsSchema, payload);

  if (creditCard.expirationMonth && creditCard.expirationYear) {
    payload.ssl_exp_date = creditCard.expirationMonth + (creditCard.expirationYear.length === 4 ? creditCard.expirationYear.substr(2) : creditCard.expirationYear);
  }
  payload = signPayload.bind(this)(payload);
  return this.query(payload);
};

/**
 * @inheritsDoc
 * Note this do not really create a customer profile but authorize a credit card and generate a token to be used in place of the credit card
 */
VirtualMerchantGateway.prototype.createCustomerProfile = function (creditCard, billing, shipping, paymentFields) {
  var payload = {};
  payload.ssl_transaction_type = 'ccgettoken';
  payload.ssl_add_token = 'Y';
  payload = mapKeys(creditCard || {}, transactionSchema, payload);
  payload = mapKeys(billing || {}, paymentFieldsSchema, payload);
  payload = mapKeys(shipping || {}, paymentFieldsSchema, payload);
  payload = mapKeys(paymentFields || {}, paymentFieldsSchema, payload);
  payload = signPayload.bind(this)(payload);

  if (creditCard.expirationMonth && creditCard.expirationYear) {
    payload.ssl_exp_date = creditCard.expirationMonth + (creditCard.expirationYear.length === 4 ? creditCard.expirationYear.substr(2) : creditCard.expirationYear);
  }

  return this.query(payload)
    .then(function (res) {
      return {
        profileId: res._original.ssl_token,
        _original: res._original
      };
    });
};

VirtualMerchantGateway.prototype.settleTransaction = function (transactionId, paymentFields) {
  var payload = {};
  payload.ssl_transaction_type = 'settle';
  payload.ssl_txn_id = transactionId;
  payload = mapKeys(paymentFields || {}, paymentFieldsSchema, payload);
  payload = signPayload.bind(this)(payload);
  return this.query(payload).then(function (res) {
    return {
      _original: res._original,
      transactionId: res.transactionId
    };
  });
};

/**
 * @inheritsDoc
 */
VirtualMerchantGateway.prototype.chargeCustomer = function chargeCustomer(order, prospect, other) {
  other = other || {};
  other.ssl_token = prospect.profileId;
  return this.submitTransaction(order, {}, prospect, other);
};

VirtualMerchantGateway.prototype.query = function query(payload) {
  return post(this.endpoint, {
    form: {
      xmldata: toXml({
        txn: payload
      })
    }
  }).spread(function (response, body) {
    var txn = JSON.parse(toJson(body)).txn;
    if (txn.ssl_result !== 0 || txn.errorCode) {
      throw new GatewayError(txn.errorMessage || txn.ssl_result_message, txn);
    }
    return {
      transactionId: txn.ssl_txn_id,
      authCode: txn.ssl_approval_code,
      _original: txn
    };
  });
};

module.exports = VirtualMerchantGateway;
