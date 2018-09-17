"use strict";

module.exports = function(flowContext, payload) {
  if (!payload.doc.order) {
    payload.doc.order = {};
  }

  if (!payload.doc.order.order_id && payload.salesOrderRemoteID) {
    payload.doc.order.order_id = payload.salesOrderRemoteID;
  }

  if (!payload.doc.order.order_id) {
    return Promise.reject({
      statusCode: 400,
      errors: ["order.order_id (salesOrderRemoteID) is a required property for inserting a new tracking number."]
    });
  }

  let options = {
    uri: `${this.baseUri}?target=RESTAPI&_key=${
      this.channelProfile.channelAuthValues.apiKey
    }&_path=ordertrackingnumber/0`,
    method: "POST",
    body: payload.doc,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options)
    .then(response => {
      return {
        endpointStatusCode: response.statusCode,
        statusCode: 201,
        payload: response.body
      };
    })
    .catch(this.handleRejection.bind(this));
};
