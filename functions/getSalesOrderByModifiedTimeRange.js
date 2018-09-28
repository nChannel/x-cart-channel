"use strict";
module.exports = function(flowContext, payload) {
  let query = JSON.parse(JSON.stringify(payload));
  query.createdDateRange = query.modifiedDateRange;
  return this.getSalesOrderByCreatedTimeRange(flowContext, query);
};
