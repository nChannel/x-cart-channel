"use strict";

module.exports = {
  queryOrders
};

let options = {
  method: "GET",
  resolveWithFullResponse: true
};

function queryOrders(uri) {
  options.uri = uri;
  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options).catch(this.handleRejection.bind(this));
}
