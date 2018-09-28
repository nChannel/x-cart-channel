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
    }&_schema=default&_path=product/0`,
    method: "POST",
    body: payload.doc,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options)
    .then(response => {
      this.info(`Product Inserted with ID: ${response.body.product_id}`);
      payload.doc.product_id = response.body.product_id;

      variants.forEach(variant => {
        variant.product = {
          product_id: response.body.product_id
        };
      });

      attributeValues.forEach(attributeValue => {
        attributeValue.product = {
          product_id: response.body.product_id
        };
      });

      return Promise.all(variants.map(this.insertProductVariant.bind(this)))
        .then(() => this.createAttributeVariantValues(variants, payload))
        .then(() => this.createAttributeValues(attributeValues, payload))
        .then(async () => {
          // Get Updated Product
          options.uri = `${this.baseUri}?target=RESTAPI&_key=${
            this.channelProfile.channelAuthValues.apiKey
          }&_schema=default&_path=product/${response.body.product_id}`;
          options.method = "GET";

          this.info(`Requesting [${options.method} ${options.uri}]`);

          let product = await this.request(options).catch(this.handleRejection.bind(this));

          return {
            endpointStatusCode: response.statusCode,
            statusCode: 201,
            payload: product.body
          };
        });
    })
    .catch(this.handleRejection.bind(this));
};
