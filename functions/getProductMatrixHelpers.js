"use strict";

module.exports = {
  queryProducts
};

let options = {
  method: "GET",
  resolveWithFullResponse: true
};

function queryProducts(uri) {
  options.uri = uri;
  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options).catch(this.handleRejection.bind(this));
}
