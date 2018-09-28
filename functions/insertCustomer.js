"use strict";

module.exports = function(flowContext, payload) {
  let requestBody = JSON.parse(JSON.stringify(payload.doc));
  delete requestBody.addresses;

  let options = {
    uri: `${this.baseUri}?target=RESTAPI&_key=${this.channelProfile.channelAuthValues.apiKey}&_path=profile/0`,
    method: "POST",
    body: requestBody,
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
