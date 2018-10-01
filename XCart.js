"use strict";

let requestErrors = require("request-promise/errors");
let Channel = require("@nchannel/endpoint-sdk").PromiseChannel;
let nc = require("./util/ncUtils");

class XCart extends Channel {
  constructor(...args) {
    super(...args);

    this.validateChannelProfile();
    this.nc = nc;

    this.request = this.request.defaults({ json: true });

    this.baseUri = `${this.channelProfile.channelSettingsValues.adminUrl}`;
  }

  async extractCustomerAddressesFromCustomer(...args) {
    return require("./functions/extractCustomerAddressesFromCustomer").bind(this)(...args);
  }

  async getProductMatrixById(...args) {
    return require("./functions/getProductMatrixById").bind(this)(...args);
  }

  async getProductMatrixByCreatedTimeRange(...args) {
    return require("./functions/getProductMatrixByCreatedTimeRange").bind(this)(...args);
  }

  async getProductMatrixByModifiedTimeRange(...args) {
    return require("./functions/getProductMatrixByModifiedTimeRange").bind(this)(...args);
  }

  async getSalesOrderById(...args) {
    return require("./functions/getSalesOrderById").bind(this)(...args);
  }

  async getSalesOrderByCreatedTimeRange(...args) {
    return require("./functions/getSalesOrderByCreatedTimeRange").bind(this)(...args);
  }

  async getSalesOrderByModifiedTimeRange(...args) {
    return require("./functions/getSalesOrderByModifiedTimeRange").bind(this)(...args);
  }

  async insertCustomer(...args) {
    return require("./functions/insertCustomer").bind(this)(...args);
  }

  async insertCustomerAddress(...args) {
    return require("./functions/insertCustomerAddress").bind(this)(...args);
  }

  async insertFulfillment(...args) {
    return require("./functions/insertFulfillment").bind(this)(...args);
  }

  async insertProductMatrix(...args) {
    return require("./functions/insertProductMatrix").bind(this)(...args);
  }

  async insertProductSimple(...args) {
    return require("./functions/insertProductSimple").bind(this)(...args);
  }

  async updateCustomer(...args) {
    return require("./functions/updateCustomer").bind(this)(...args);
  }

  async updateCustomerAddress(...args) {
    return require("./functions/updateCustomerAddress").bind(this)(...args);
  }

  async updateFulfillment(...args) {
    return require("./functions/updateFulfillment").bind(this)(...args);
  }

  async updateProductMatrix(...args) {
    return require("./functions/updateProductMatrix").bind(this)(...args);
  }

  async updateProductPricing(...args) {
    return require("./functions/updateProductPricing").bind(this)(...args);
  }

  async updateProductQuantity(...args) {
    return require("./functions/updateProductQuantity").bind(this)(...args);
  }

  async updateProductSimple(...args) {
    return require("./functions/updateProductSimple").bind(this)(...args);
  }

  validateChannelProfile() {
    let errors = [];
    if (!this.channelProfile) errors.push("channelProfile was not provided");
    if (!this.channelProfile.channelSettingsValues)
      errors.push("channelProfile.channelSettingsValues was not provided");
    if (!this.channelProfile.channelSettingsValues.adminUrl)
      errors.push("channelProfile.channelSettingsValues.adminUrl was not provided");
    if (!this.channelProfile.channelAuthValues) errors.push("channelProfile.channelAuthValues was not provided");
    if (!this.channelProfile.channelAuthValues.apiKey)
      errors.push("channelProfile.channelAuthValues.apiKey was not provided");
    if (errors.length > 0) throw new Error(`Channel profile validation failed: ${errors}`);
  }

  handleRejection(reason) {
    if (reason instanceof requestErrors.StatusCodeError) {
      return this.handleStatusCodeError(reason);
    } else if (reason instanceof requestErrors.RequestError) {
      return this.handleRequestError(reason);
    } else {
      return this.handleOtherError(reason);
    }
  }

  handleStatusCodeError(reason) {
    this.error(`The endpoint returned an error status code: ${reason.statusCode} error: ${reason.message}`);

    let out = {
      endpointStatusCode: reason.statusCode,
      errors: [JSON.stringify(reason.message)]
    };

    if (reason.statusCode === 429) {
      out.statusCode = 429;
    } else if (reason.statusCode >= 500) {
      out.statusCode = 500;
    } else if (reason.statusCode === 404) {
      out.statusCode = 404;
    } else if (reason.statusCode === 422) {
      out.statusCode = 400;
    } else {
      out.statusCode = 400;
    }

    return Promise.reject(out);
  }

  handleRequestError(reason) {
    this.error(`The request failed: ${reason.error}`);

    let out = {
      endpointStatusCode: "N/A",
      statusCode: 500,
      errors: [reason.error]
    };

    return Promise.reject(out);
  }

  handleOtherError(reason) {
    if (!reason || !reason.statusCode || !reason.errors) {
      let out = {
        statusCode: 500,
        errors: [reason || "Rejection without reason"]
      };
      return Promise.reject(out);
    } else {
      return Promise.reject(reason);
    }
  }

  formatGetResponse(items, pageSize, endpointStatusCode = "N/A") {
    return {
      endpointStatusCode: endpointStatusCode,
      statusCode: items.length === pageSize ? 206 : items.length > 0 ? 200 : 204,
      payload: items
    };
  }

  queryOrders(...args) {
    return require("./functions/getSalesOrderHelpers").queryOrders.bind(this)(...args);
  }

  queryProducts(...args) {
    return require("./functions/getProductMatrixHelpers").queryProducts.bind(this)(...args);
  }

  insertProductVariant(...args) {
    return require("./functions/insertProductMatrixHelpers").insertProductVariant.bind(this)(...args);
  }

  createAttributeVariantValues(...args) {
    return require("./functions/insertProductMatrixHelpers").createAttributeVariantValues.bind(this)(...args);
  }

  createAttributeValues(...args) {
    return require("./functions/insertProductMatrixHelpers").createAttributeValues.bind(this)(...args);
  }

  updateProductVariant(...args) {
    return require("./functions/updateProductMatrixHelpers").updateProductVariant.bind(this)(...args);
  }

  removeAttributeValues(...args) {
    return require("./functions/updateProductMatrixHelpers").removeAttributeValues.bind(this)(...args);
  }

  createAttributeValues(...args) {
    return require("./functions/updateProductMatrixHelpers").createAttributeValues.bind(this)(...args);
  }
}

module.exports = XCart;
