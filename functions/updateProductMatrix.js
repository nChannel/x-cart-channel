"use strict";

let _ = require("lodash");

module.exports = function(flowContext, payload) {
  let variants = [];
  let attributeValues = [];

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
      this.info(`Product Updated with ID: ${response.body.product_id}`);
      payload.doc.product_id = response.body.product_id;
      payload.doc.variants = variants;

      return Promise.all(variants.map(variant => this.updateProductVariant(variant, response.body)))
        .then(() => this.removeAttributeValues(response.body.attributeValueT, response.body.attributeValueC))
        .then(() => this.createAttributeValues(attributeValues))
        .then(async () => {
          // Get Updated Product
          options.uri = `${this.baseUri}?target=RESTAPI&_key=${
            this.channelProfile.channelAuthValues.apiKey
          }&_schema=default&_path=product/${payload.productRemoteID}`;
          options.method = "GET";

          this.info(`Requesting [${options.method} ${options.uri}]`);

          let product = await this.request(options).catch(this.handleRejection.bind(this));

          return {
            endpointStatusCode: response.statusCode,
            statusCode: 200,
            payload: product.body
          };
        });
    })
    .catch(this.handleRejection.bind(this));
};
