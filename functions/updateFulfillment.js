"use strict";

module.exports = function(flowContext, payload) {
  payload.doc.tracking_id = payload.fulfillmentRemoteID;

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
