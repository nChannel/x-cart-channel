"use strict";

module.exports = function(flowContext, payload) {
  if (!payload.doc.profile) {
    payload.doc.profile = {};
  }

  if (!payload.doc.profile.profile_id && payload.customerRemoteID) {
    payload.doc.profile.profile_id = payload.customerRemoteID;
  }

  if (!payload.doc.profile.profile_id) {
    return Promise.reject({
      statusCode: 400,
      errors: ["profile.profile_id (customerRemoteID) is a required property for inserting a new customer address."]
    });
  }

  let options = {
    uri: `${this.baseUri}?target=RESTAPI&_key=${this.channelProfile.channelAuthValues.apiKey}&_path=address/0`,
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
