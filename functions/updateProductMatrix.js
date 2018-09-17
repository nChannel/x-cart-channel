"use strict";

let _ = require("lodash");

module.exports = function(flowContext, payload) {
  let variants = [];
  let attributeValues = [];

  if (!payload.productRemoteID) {
    return Promise.reject({
      statusCode: 400,
      errors: ["productRemoteID is missing and is required for updating the product."]
    });
  }

  if (payload.doc.variants) {
    variants = JSON.parse(JSON.stringify(payload.doc.variants));
    delete payload.doc.variants;
  }

  if (payload.doc.attributeValues) {
    let attributeValues = JSON.parse(JSON.stringify(payload.doc.attributeValues));
    delete payload.doc.attributeValues;
  }

  let options = {
    uri: `${this.baseUri}?target=RESTAPI&_key=${
      this.channelProfile.channelAuthValues.apiKey
    }&_schema=default&_path=product/${payload.productRemoteID}`,
    method: "PUT",
    body: payload.doc,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options)
    .then(response => {
      this.info(`Product Inserted with ID: ${response.body.product_id}`);
      payload.doc.product_id = response.body.product_id;
      payload.doc.variants = variants;

      return Promise.all(variants.map(variant => this.updateProductVariant(variant, response.body)))
        .then(() => this.removeAttributeValues(response.body.attributeValueT, response.body.attributeValueC))
        .then(() => this.createAttributeValues(attributeValues))
        .then(() => {
          return {
            endpointStatusCode: response.statusCode,
            statusCode: 200,
            payload: response.body
          };
        });
    })
    .catch(this.handleRejection.bind(this));
};
