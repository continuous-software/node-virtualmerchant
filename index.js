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

MyVirtualMerchant.prototype.doPurchase = function (data, callback) {
  this.processRequest({
    ssl_transaction_type: 'ccsale',
    ssl_card_number: data.card_number,
    ssl_avs_address: 7300,
    ssl_avs_zip: 12345,
    ssl_exp_date: data.exp_date,
    ssl_cvv2cvc2: 123,
    ssl_amount: data.amount
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
