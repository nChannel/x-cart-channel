"use strict";

let UpdateProductMatrix = function(ncUtil, channelProfile, flowContext, payload, callback) {
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
    .then(updateProduct)
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
    else if (!payload.productRemoteID) invalidMsg = "payload.productRemoteID was not provided";

    if (invalidMsg) {
      logError(invalidMsg);
      out.ncStatusCode = 400;
      throw new Error(`Invalid request [${invalidMsg}]`);
    }
    logInfo("Function is valid.");
  }

  async function updateProduct() {
    let variants = payload.doc.variants;
    let attributeValues = payload.doc.attributeValues;
    delete payload.doc.variants;
    delete payload.doc.attributeValues;

    let response = await request
      .put({
        url: `${channelProfile.channelSettingsValues.adminUrl}?target=RESTAPI&_key=${
          channelProfile.channelAuthValues.apiKey
        }&_schema=default&_path=product/${payload.productRemoteID}`,
        body: payload.doc,
        json: true,
        resolveWithFullResponse: true
      })
      .catch(err => {
        throw err;
      });

    payload.doc.variants = variants;
    logInfo(`Product Updated with ID: ${response.body.product_id}`);

    payload.doc.product_id = response.body.product_id;

    await Promise.all(variants.map(variant => updateProductVariant(variant, response.body))).catch(err => {
      throw err;
    });

    await removeAttributeValues(response.body.attributeValueT, response.body.attributeValueC);
    await createAttributeValues(attributeValues);

    return response;
  }

  async function updateProductVariant(variant, updatedProduct) {
    logInfo(`Processing Variant`);

    let options = variant.options;
    delete variant.options;
    let found = false;

    for (let i = 0; i < updatedProduct.variants.length; i++) {
      if (updatedProduct.variants[i].sku === variant.sku) {
        found = true;
        let response = await request
          .put({
            url: `${channelProfile.channelSettingsValues.adminUrl}?target=RESTAPI&_key=${
              channelProfile.channelAuthValues.apiKey
            }&_schema=default&_path=xc-productvariants-productvariant/${updatedProduct.variants[i].id}`,
            body: variant,
            json: true,
            resolveWithFullResponse: true
          })
          .catch(err => {
            throw err;
          });

        logInfo(`Variant Updated with ID: ${updatedProduct.variants[i].id}`);
        variant.id = updatedProduct.variants[i].id;
        variant.options = options;

        updateAttributeVariantValues(variant, response.body);
      }
    }

    if (!found) {
      variant.product = {
        product_id: updatedProduct.product_id
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

      createAttributeVariantValues(variant);
    }
  }

  async function removeAttributeValues(aT, aC) {
    logInfo("Removing Attribute Values");
    for (let i = 0; i < aT.length; i++) {
      await request
        .delete({
          url: `${channelProfile.channelSettingsValues.adminUrl}?target=RESTAPI&_key=${
            channelProfile.channelAuthValues.apiKey
          }&_schema=default&_path=attributevalue-attributevaluetext/${aT[i].id}`,
          json: true,
          resolveWithFullResponse: true
        })
        .then(() => {
          logInfo(`Attribute with ID ${aT[i].id} removed`);
        })
        .catch(err => {
          throw err;
        });
    }

    for (let i = 0; i < aC.length; i++) {
      await request
        .delete({
          url: `${channelProfile.channelSettingsValues.adminUrl}?target=RESTAPI&_key=${
            channelProfile.channelAuthValues.apiKey
          }&_schema=default&_path=attributevalue-attributevaluecheckbox/${aC[i].id}`,
          json: true,
          resolveWithFullResponse: true
        })
        .then(() => {
          logInfo(`Attribute with ID ${aC[i].id} removed`);
        })
        .catch(err => {
          throw err;
        });
    }
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

  async function updateAttributeVariantValues(variant, updatedVariant) {
    for (let i = 0; i < updatedVariant.attributeValueS.length; i++) {
      let url = `${channelProfile.channelSettingsValues.adminUrl}?target=RESTAPI&_key=${
        channelProfile.channelAuthValues.apiKey
      }&_schema=default&_path=attributevalue-attributevalueselect/${updatedVariant.attributeValueS[i].id}`;

      let attributeResponse = await request.get({ url: url, json: true, resolveWithFullResponse: true }).catch(err => {
        throw err;
      });

      let attributeValue = {
        variants: [{ id: variant.id }],
        id: attributeResponse.body.id,
        product: {
          product_id: attributeResponse.body.product.product_id
        }
      };

      variant.options.forEach(option => {
        if (
          option.attribute_id === attributeResponse.body.attribute.id &&
          attributeResponse.body.attribute_option.id === option.attribute_option_id
        ) {
          attributeValue.attribute_option = { id: option.attribute_option_id };
          attributeValue.attribute = { id: option.attribute_id };
        }
      });

      let response = await request
        .put({ url: url, body: attributeValue, json: true, resolveWithFullResponse: true })
        .catch(err => {
          throw err;
        });

      logInfo(`Attribute Value Updated with ID: ${response.body.id}`);
    }
  }

  async function createAttributeVariantValues(variant) {
    logInfo(`Processing Attribute Values`);

    variant.options.forEach(async option => {
      let attributeValue = {
        variants: [{ id: variant.id }],
        product: {
          product_id: variant.product.product_id
        },
        attribute_option: { id: option.attribute_option_id },
        attribute: { id: option.attribute_id }
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
    });
  }

  async function buildResponse(response) {
    out.response.endpointStatusCode = response.statusCode;
    out.response.endpointStatusMessage = response.statusMessage;

    if (response.statusCode === 200 && response.body) {
      out.payload = {
        doc: response.body,
        productBusinessReference: nc.extractBusinessReferences(channelProfile.productBusinessReferences, response.body)
      };

      out.ncStatusCode = 200;
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

module.exports.UpdateProductMatrix = UpdateProductMatrix;
