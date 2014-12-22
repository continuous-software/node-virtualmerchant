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

var transactionSchema = {
  description: 'ssl_description',
  invoiceNumber: 'ssl_invoice_number',
  amount: 'ssl_amount',
  creditCardNumber: 'ssl_card_number',
  cvv: 'ssl_cvv2cvc2',
  customerFirstName: 'ssl_first_name',
  customerLastName: 'ssl_last_name',
  billingCompany: 'ssl_company',
  billingAddress: 'ssl_avs_address',
  billingAddress2: 'ssl_address2',
  billingCity: 'ssl_city',
  billingState: 'ssl_state',
  billingZip: 'ssl_avs_zip',
  billingCountry: 'ssl_country',
  customerPhone: 'ssl_phone',
  customerEmail: 'ssl_email',
  shippingCompany: 'ssl_ship_to_company',
  shippingFirstName: 'ssl_ship_to_first_name',
  shippingLastName: 'ssl_ship_to_last_name',
  shippingAddress: 'ssl_ship_to_address1',
  shippingAddress2: 'ssl_ship_to_address2',
  shippingCity: 'ssl_ship_to_city',
  shippingState: 'ssl_ship_to_state',
  shippingZip: 'ssl_ship_to_zip',
  shippingCountry: 'ssl_ship_to_country',
  shippingPhone: 'ssl_ship_to_phone'
};

var refundSchema = {
  amount: 'ssl_amount'
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
VirtualMerchantGateway.prototype.submitTransaction = function submitTransaction(order, creditCard, prospect, other) {

  var payload = extend({}, creditCard);
  extend(payload, order);
  extend(payload, prospect);

  payload = mapKeys(payload, transactionSchema);

  if (creditCard.expirationMonth && creditCard.expirationYear) {
    payload.ssl_exp_date = creditCard.expirationMonth + (creditCard.expirationYear.length === 4 ? creditCard.expirationYear.substr(2) : creditCard.expirationYear);
  }
  payload = signPayload.bind(this)(payload);
  payload.ssl_transaction_type = 'ccsale';

  if (creditCard.creditCardNumber == '5000300020003003') {
    return Promise.reject('usage of this card has been restricted due to its undocumented behavior');
  }

  util._extend(payload, other);

  return post(this.endpoint,
    {
      form: {
        xmldata: toXml({txn: payload})
      }
    }).spread(function (response, body) {

      var txn = JSON.parse(toJson(body)).txn;

      if (txn.errorCode) {
        throw new GatewayError(txn.errorMessage, txn);
      }

      return {
        transactionId: txn.ssl_txn_id,
        authCode: txn.ssl_approval_code,
        _original: txn
      };
    });
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

  return post(this.endpoint, {
    form: {
      xmldata: toXml({txn: payload})
    }
  })
    .spread(function (response, body) {
      var responseObject = JSON.parse(toJson(body));

      if (responseObject.txnlist) {
        responseObject = responseObject.txnlist;
      } else if (responseObject.txn) {
        throw new GatewayError(responseObject.txn.errorMessage, responseObject.txn);
      } else {
        throw new Error('unable to process the gateway response');
      }

      return responseObject.ssl_txn_count > 1 ? responseObject.txn : [responseObject.txn];
    });
};

/**
 * @inheritsDoc
 */
VirtualMerchantGateway.prototype.refundTransaction = function refundTransaction(transId, options) {

  var payload = extend({}, options);
  payload = mapKeys(payload, util._extend(transactionSchema, refundSchema));
  payload = signPayload.bind(this)(payload);
  payload.ssl_txn_id = transId;
  payload.ssl_transaction_type = 'ccreturn';
  return post(this.endpoint, {
    form: {
      xmldata: toXml({txn: payload})
    }
  })
    .spread(function (response, body) {
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
VirtualMerchantGateway.prototype.voidTransaction = function voidTransaction(transactionId, options) {
  var payload = extend({}, options);
  payload = mapKeys(payload, transactionSchema);
  payload = signPayload.bind(this)(payload);
  payload.ssl_transaction_type = 'ccvoid';
  payload.ssl_txn_id = transactionId;
  return post(this.endpoint, {
    form: {
      xmldata: toXml({txn: payload})
    }
  })
    .spread(function (response, body) {
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
VirtualMerchantGateway.prototype.authorizeTransaction = function (order, creditCard, prospect, other) {
  other = other || {};
  return this.submitTransaction(order, creditCard, prospect, util._extend(other, {ssl_transaction_type: 'ccauthonly'}));
};

/**
 * @inheritsDoc
 * Note this do not really create a customer profile but authorize a credit card and generate a token to be used in place of the credit card
 */
VirtualMerchantGateway.prototype.createCustomerProfile = function (payment, billing, shipping, other) {
  billing = billing || {};
  shipping = shipping || {};
  other = other || {};
  other = mapKeys(other, transactionSchema);
  return this.submitTransaction({}, payment, util._extend(billing, shipping), util._extend(other, {
    ssl_transaction_type: 'ccgettoken',
    ssl_add_token: 'Y'
  }))
    .then(function (res) {
      return {
        profileId: res._original.ssl_token,
        _original: res._original
      }
    });
};

VirtualMerchantGateway.prototype.settleTransaction = function (transaction, options) {
  return this.submitTransaction({}, {}, {}, {
    ssl_transaction_type: 'settle',
    ssl_txn_id: transaction
  })
    .then(function (res) {
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
  other = mapKeys(other, transactionSchema);
  other.ssl_token = prospect.profileId;
  return this.submitTransaction(order, {}, prospect, other);
};

module.exports = VirtualMerchantGateway;
