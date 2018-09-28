"use strict";

const moment = require("moment");

module.exports = async function(flowContext, payload) {
  let orders = [];
  let hasMore = false;
  const currentPage = payload.page;
  const currentPageIndex = currentPage - 1;
  const pageSize = payload.pageSize;

  let uri = `${this.baseUri}?target=RESTAPI&_key=${
    this.channelProfile.channelAuthValues.apiKey
  }&_schema=complex&_path=order&${
    this.channelProfile.channelSettingsValues.vendor
      ? "_cnd[vendor]=" + this.channelProfile.channelSettingsValues.vendor + "&"
      : ""
  }_cnd[date][0]=${moment(payload.createdDateRange.startDateGMT).unix()}&_cnd[date][1]=${moment(
    payload.createdDateRange.endDateGMT
  ).unix()}&_cnd[limit][0]=${payload.pageSize * (payload.page - 1)}&_cnd[limit][1]=${payload.pageSize}`;

  const response = await this.queryOrders(uri).bind(this);

  if (this.nc.isNonEmptyArray(response.body)) {
    orders = response.body;
  }
  hasMore = orders.length >= pageSize;

  return {
    endpointStatusCode: 200,
    statusCode: hasMore ? 206 : orders.length > 0 ? 200 : 204,
    payload: orders
  };
};
