"use strict";
module.exports = function(flowContext, payload) {
  payload.createdDateRange = payload.modifiedDateRange;
  return this.getSalesOrderByCreatedTimeRange(flowContext, payload);
};
