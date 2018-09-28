"use strict";

module.exports = function(flowContext, payload) {
  payload.doc.profile_id = payload.customerRemoteID;

  let requestBody = JSON.parse(JSON.stringify(payload.doc));
  delete requestBody.addresses;

  let options = {
    uri: `${this.baseUri}?target=RESTAPI&_key=${this.channelProfile.channelAuthValues.apiKey}&_path=profile/${
      payload.doc.profile_id
    }`,
    method: "PUT",
    body: requestBody,
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
