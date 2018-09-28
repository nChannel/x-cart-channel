"use strict";
module.exports = function(flowContext, payload) {
  let out = {
    statusCode: 400,
    query: [],
    errors: ["X-Cart does not support retrieving products by created date."]
  };
  return Promise.reject(out);
};
