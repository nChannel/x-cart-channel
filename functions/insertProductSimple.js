"use strict";

module.exports = function(flowContext, payload) {
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
      return {
        endpointStatusCode: response.statusCode,
        statusCode: 201,
        payload: response.body
      };
    })
    .catch(this.handleRejection.bind(this));
};
