"use strict";

module.exports = function(flowContext, payload) {
  let options = {
    uri: `${this.baseUri}?target=RESTAPI&_key=${
      this.channelProfile.channelAuthValues.apiKey
    }&_schema=default&_path=product/${payload.productQuantityRemoteID}`,
    method: "PUT",
    body: payload.doc,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options)
    .then(response => {
      this.info(`Product Updated with ID: ${response.body.product_id}`);
      return {
        endpointStatusCode: response.statusCode,
        statusCode: 200,
        payload: response.body
      };
    })
    .catch(this.handleRejection.bind(this));
};
