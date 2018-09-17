"use strict";

module.exports = function(flowContext, payload) {
  if (!payload.doc.address_id && payload.customerAddressRemoteID) {
    payload.doc.address_id = payload.customerAddressRemoteID;
  }

  if (!payload.doc.address_id) {
    return Promise.reject({
      statusCode: 400,
      errors: ["address_id (customerAddressRemoteID) is a required property for updating an existing customer address."]
    });
  }

  let options = {
    uri: `${this.baseUri}?target=RESTAPI&_key=${this.channelProfile.channelAuthValues.apiKey}&_path=address/${
      payload.doc.address_id
    }`,
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
