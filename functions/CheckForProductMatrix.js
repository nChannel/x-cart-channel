"use strict";

let CheckForProductMatrix = function(ncUtil, channelProfile, flowContext, payload, callback) {
  const request = require("request-promise");
  const jsonata = require("jsonata");
  const _ = require("lodash");
  const nc = require("../util/ncUtils");

  let out = {
    ncStatusCode: null,
    payload: {},
    response: {}
  };

  if (!callback) {
    throw new Error("A callback function was not provided");
  } else if (typeof callback !== "function") {
    throw new TypeError("callback is not a function");
  }

  validateFunction()
    .then(queryProduct)
    .then(buildResponse)
    .catch(handleError)
    .then(() => callback(out))
    .catch(error => {
      logError(`The callback function threw an exception: ${error}`);
      setTimeout(() => {
        throw error;
      });
    });

  function logInfo(msg) {
    let prefix = `${new Date().toISOString()} [info]`;
    console.log(`${prefix} | ${msg}`);
  }

  function logWarn(msg) {
    let prefix = `${new Date().toISOString()} [warn]`;
    console.log(`${prefix} | ${msg}`);
  }

  function logError(msg) {
    let prefix = `${new Date().toISOString()} [error]`;
    console.log(`${prefix} | ${msg}`);
  }

  async function validateFunction() {
    let invalidMsg;

    if (!ncUtil) invalidMsg = "ncUtil was not provided";
    else if (!channelProfile) invalidMsg = "channelProfile was not provided";
    else if (!channelProfile.channelSettingsValues)
      invalidMsg = "channelProfile.channelSettingsValues was not provided";
    else if (!channelProfile.channelAuthValues) invalidMsg = "channelProfile.channelAuthValues was not provided";
    else if (!channelProfile.channelSettingsValues.adminUrl)
      invalidMsg = "channelProfile.channelSettingsValues.adminUrl was not provided";
    else if (!channelProfile.channelAuthValues.apiKey)
      invalidMsg = "channelProfile.channelAuthValues.apiKey was not provided";
    else if (!channelProfile.productBusinessReferences)
      invalidMsg = "channelProfile.productBusinessReferences was not provided";
    else if (!nc.isArray(channelProfile.productBusinessReferences))
      invalidMsg = "channelProfile.productBusinessReferences is not an array";
    else if (!nc.isNonEmptyArray(channelProfile.productBusinessReferences))
      invalidMsg = "channelProfile.productBusinessReferences is empty";
    else if (!payload) invalidMsg = "payload was not provided";
    else if (!payload.doc) invalidMsg = "payload.doc was not provided";

    if (invalidMsg) {
      logError(invalidMsg);
      out.ncStatusCode = 400;
      throw new Error(`Invalid request [${invalidMsg}]`);
    }
    logInfo("Function is valid.");
  }

  async function queryProduct() {
    let filters = {};
    channelProfile.productBusinessReferences.forEach(businessReference => {
      let value = nc.extractBusinessReferences([businessReference], payload.doc);
      filters[`_cnd[${businessReference}]`] = value;
    });

    logInfo("Looking up Product");

    let response = await request
      .get({
        url: `${channelProfile.channelSettingsValues.adminUrl}?target=RESTAPI&_key=${
          channelProfile.channelAuthValues.apiKey
        }&_schema=default&_path=product`,
        qs: filters,
        json: true,
        resolveWithFullResponse: true
      })
      .catch(err => {
        throw err;
      });

    return response;
  }

  async function buildResponse(response) {
    out.response.endpointStatusCode = response.statusCode;
    out.response.endpointStatusMessage = response.statusMessage;

    if (response.statusCode === 200 && response.body) {
      if (response.body && response.body.length == 1) {
        out.ncStatusCode = 200;
        out.payload = {
          productRemoteID: response.body[0].product_id,
          productBusinessReference: nc.extractBusinessReferences(
            channelProfile.productBusinessReferences,
            response.body[0]
          )
        };
      } else if (response.body.length > 1) {
        out.ncStatusCode = 409;
        out.payload.error = response.body;
      } else {
        out.ncStatusCode = 204;
      }
    } else if (response.statusCode == 500) {
      out.ncStatusCode = 500;
      out.payload.error = response.body;
    } else {
      out.ncStatusCode = 400;
      out.payload.error = response.body;
    }
  }

  async function handleError(error) {
    logError(error);
    if (error.name === "StatusCodeError") {
      out.response.endpointStatusCode = error.statusCode;
      out.response.endpointStatusMessage = error.message;
      if (error.statusCode >= 500) {
        out.ncStatusCode = 500;
      } else if (error.statusCode === 429) {
        logWarn("Request was throttled.");
        out.ncStatusCode = 429;
      } else {
        out.ncStatusCode = 400;
      }
    }
    out.payload.error = error;
    out.ncStatusCode = out.ncStatusCode || 500;
  }
};

module.exports.CheckForProductMatrix = CheckForProductMatrix;
