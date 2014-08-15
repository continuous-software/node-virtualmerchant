'use strict';

var _ = require('lodash');
var json2xml = require('json2xml');
var xml2json = require('xml2json');
var client = require('request');

module.exports = MyVirtualMerchant;

function MyVirtualMerchant(options) {
  this.merchant_id = options.merchant_id;
  this.user_id = options.user_id;
  this.ssl_pin = options.ssl_pin;
  this.test_mode = options.test_mode || false;
  this.endpoints = this.resolveEndpoints();
}

MyVirtualMerchant.prototype.resolveEndpoints = function () {
  return (this.test_mode) ? {
    process: 'https://demo.myvirtualmerchant.com/VirtualMerchantDemo/process.do',
    process_batch: 'https://demo.myvirtualmerchant.com/VirtualMerchantDemo/processBatch.do',
    process_xml: 'https://demo.myvirtualmerchant.com/VirtualMerchantDemo/processxml.do',
    account_xml: 'https://demo.myvirtualmerchant.com/VirtualMerchantDemo/accountxml.do'
  } : {
    process: 'https://demo.myvirtualmerchant.com/VirtualMerchant/process.do',
    process_batch: 'https://demo.myvirtualmerchant.com/VirtualMerchant/processBatch.do',
    process_xml: 'https://demo.myvirtualmerchant.com/VirtualMerchant/processxml.do',
    account_xml: 'https://demo.myvirtualmerchant.com/VirtualMerchant/accountxml.do'
  };
};

MyVirtualMerchant.prototype.signRequest = function (request) {
  return _.extend(request, {
    ssl_merchant_id: this.merchant_id,
    ssl_user_id: this.user_id,
    ssl_pin: this.ssl_pin
  });
};

MyVirtualMerchant.prototype.processRequest = function (request, callback) {
  client.post(this.endpoints.process_xml, {
    form: {
      xmldata: json2xml({
        txn: this.signRequest(request)
      })
    }
  }, function (error, response, body) {
    try {
      var result = JSON.parse(xml2json.toJson(body)).txn;
      if (result.errorMessage)
        return callback && callback(result);
      return callback && callback(error, result);
    } catch (e) {
      return callback && callback(result);
    }
  });
};

MyVirtualMerchant.prototype.doPurchase = function (order, prospect, creditcard, callback) {
  this.processRequest({
    ssl_transaction_type: 'ccsale',
    ssl_card_number: creditcard.number.trim().replace(/ /g,''),
    ssl_exp_date: creditcard.expiration.split(' / ').join(''),
    ssl_cvv2cvc2_indicator: 1,
    ssl_customer_code: prospect.id,
    ssl_cvv2cvc2: creditcard.cvv2,
    ssl_verify: 'Y',
    ssl_amount: order.converted_amount,
    ssl_first_name: prospect.firstname,
    ssl_last_name: prospect.lastname,
    ssl_avs_address: prospect.billing.address,
    ssl_avs_zip: prospect.billing.zipcode,
    ssl_description: 'React CRM - Prospect #' + prospect.id + ' - Website:' //TODO
  }, callback);
};

MyVirtualMerchant.prototype.doRefund = function (data, callback) {
  this.processRequest({
    ssl_transaction_type: 'ccreturn',
    ssl_txn_id: data.txn_id,
    ssl_amount: data.amount
  }, callback);
};

MyVirtualMerchant.prototype.doVoid = function (data, callback) {
  this.processRequest({
    ssl_transaction_type: 'ccvoid',
    ssl_txn_id: data.txn_id
  }, callback);
};
