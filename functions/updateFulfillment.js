"use strict";

module.exports = function(flowContext, payload) {
  if (!payload.doc.tracking_id && payload.fulfillmentRemoteID) {
    payload.doc.tracking_id = payload.fulfillmentRemoteID;
  }

  if (!payload.doc.order.order_id) {
    return Promise.reject({
      statusCode: 400,
      errors: ["tracking_id (fulfillmentRemoteID) is a required property for updating an existing tracking number."]
    });
  }

  let options = {
    uri: `${this.baseUri}?target=RESTAPI&_key=${
      this.channelProfile.channelAuthValues.apiKey
    }&_path=ordertrackingnumber/${payload.doc.tracking_id}`,
    method: "PUT",
    body: payload.doc,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options)
    .then(response => {
      return {
        endpointStatusCode: response.statusCode,
        statusCode: 200,
        payload: response.body
      };
    })
    .catch(this.handleRejection.bind(this));
};
