"use strict";

let InsertProductMatrix = function(ncUtil, channelProfile, flowContext, payload, callback) {
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
    .then(insertProduct)
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

  async function insertProduct() {
    let variants = payload.doc.variants;
    let attributeValues = payload.doc.attributeValues;
    delete payload.doc.variants;
    delete payload.doc.attributeValues;

    let response = await request
      .post({
        url: `${channelProfile.channelSettingsValues.adminUrl}?target=RESTAPI&_key=${
          channelProfile.channelAuthValues.apiKey
        }&_schema=default&_path=product/0`,
        body: payload.doc,
        json: true,
        resolveWithFullResponse: true
      })
      .catch(err => {
        throw err;
      });

    logInfo(`Product Inserted with ID: ${response.body.product_id}`);

    payload.doc.product_id = response.body.product_id;

    await Promise.all(variants.map(insertProductVariant))
      .then(() => createAttributeVariantValues(variants))
      .then(() => createAttributeValues(attributeValues))
      .catch(err => {
        throw err;
      });

    return response;
  }

  async function insertProductVariant(variant) {
    logInfo(`Processing Variant`);

    let options = variant.options;
    delete variant.options;

    variant.product = {
      product_id: payload.doc.product_id
    };

    let response = await request
      .post({
        url: `${channelProfile.channelSettingsValues.adminUrl}?target=RESTAPI&_key=${
          channelProfile.channelAuthValues.apiKey
        }&_schema=default&_path=xc-productvariants-productvariant/0`,
        body: variant,
        json: true,
        resolveWithFullResponse: true
      })
      .catch(err => {
        throw err;
      });

    logInfo(`Variant Inserted with ID: ${response.body.id}`);
    variant.id = response.body.id;
    variant.options = options;
  }

  async function createAttributeValues(attributeValues) {
    for (let i = 0; i < attributeValues.length; i++) {
      let attributeValue = {
        product: {
          product_id: payload.doc.product_id
        },
        attribute: {
          id: attributeValues[i].attribute_id
        }
      };

      let attributeUrl = `${channelProfile.channelSettingsValues.adminUrl}?target=RESTAPI&_key=${
        channelProfile.channelAuthValues.apiKey
      }&_schema=default&_path=`;

      switch (attributeValues[i].type) {
        case "S":
          attributeUrl = `${attributeUrl}attributevalue-attributevalueselect/0`;
          attributeValue.attribute_option_id = attributeValues[i].attribute_option_id;
          break;

        case "C":
          attributeUrl = `${attributeUrl}attributevalue-attributevaluecheckbox/0`;
          attributeValue.value = attributeValues[i].value;
          break;

        case "T":
          attributeUrl = `${attributeUrl}attributevalue-attributevaluetext/0`;
          attributeValue.translations = attributeValues[i].translations;
          break;

        default:
          throw new Error(`An Attribute Value under the Product does not have a 'type' field.`);
      }

      let response = await request
        .post({
          url: attributeUrl,
          body: attributeValue,
          json: true,
          resolveWithFullResponse: true
        })
        .catch(err => {
          throw err;
        });

      logInfo(`Attribute of type '${attributeValues[i].type}' Value Inserted with ID: ${response.body.id}`);
    }
  }

  async function createAttributeVariantValues(variants) {
    logInfo(`Processing Attribute Values`);
    let attributes = [];

    variants.forEach(variant => {
      variant.options.forEach(option => {
        attributes.push(option);
      });
    });

    attributes = _.uniqWith(attributes, _.isEqual);

    for (let i = 0; i < attributes.length; i++) {
      let vars = [];
      variants.forEach(variant => {
        variant.options.forEach(option => {
          if (
            attributes[i].attribute_id === option.attribute_id &&
            attributes[i].attribute_option_id === option.attribute_option_id
          ) {
            vars.push({ id: variant.id });
          }
        });
      });

      let attributeValue = {
        variants: vars,
        attribute_option: {
          id: attributes[i].attribute_option_id
        },
        product: {
          product_id: payload.doc.product_id
        },
        attribute: {
          id: attributes[i].attribute_id
        }
      };

      let response = await request
        .post({
          url: `${channelProfile.channelSettingsValues.adminUrl}?target=RESTAPI&_key=${
            channelProfile.channelAuthValues.apiKey
          }&_schema=default&_path=attributevalue-attributevalueselect/0`,
          body: attributeValue,
          json: true,
          resolveWithFullResponse: true
        })
        .catch(err => {
          throw err;
        });

      logInfo(`Attribute Value Inserted with ID: ${response.body.id}`);
    }
  }

  async function buildResponse(response) {
    out.response.endpointStatusCode = response.statusCode;
    out.response.endpointStatusMessage = response.statusMessage;

    if (response.statusCode === 200 && response.body) {
      out.payload = {
        doc: response.body,
        productRemoteID: response.body.product_id,
        productBusinessReference: nc.extractBusinessReferences(channelProfile.productBusinessReferences, response.body)
      };

      out.ncStatusCode = 201;
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

module.exports.InsertProductMatrix = InsertProductMatrix;
