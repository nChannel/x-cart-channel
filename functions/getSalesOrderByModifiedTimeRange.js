"use strict";
module.exports = function(flowContext, payload) {
  let out = {
    statusCode: 400,
    query: [],
    errors: ["X-Cart does not support retrieving orders by modified date."]
  };
  return Promise.reject(out);
};
