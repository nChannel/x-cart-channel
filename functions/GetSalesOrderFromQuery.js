function GetSalesOrderFromQuery(ncUtil, channelProfile, flowContext, payload, callback) {
  const nc = require("../util/ncUtil");
  const referenceLocations = ["salesOrderBusinessReferences"];
  const stub = new nc.Stub("GetSalesOrderFromQuery", referenceLocations, ...arguments);
  const qs = require("qs");

  validateFunction()
    .then(buildQuery)
    .then(searchForOrders)
    .catch(handleError)
    .then(() => callback(stub.out))
    .catch(error => {
      logError(`The callback function threw an exception: ${error}`);
      setTimeout(() => {
        throw error;
      });
    });

  async function validateFunction() {
    if (stub.messages.length > 0) {
      stub.messages.forEach(msg => logError(msg));
      stub.out.ncStatusCode = 400;
      throw new Error(`Invalid request [${stub.messages.join(" ")}]`);
    }
    logInfo("Function is valid.");
  }

  async function buildQuery() {
    let query = {};
    const queries = [];

    switch (stub.queryType) {
      case "remoteIDs":
        stub.payload.doc.remoteIDs.forEach(id => {
          queries.push({
            target: "RESTAPI",
            _key: stub.channelProfile.channelAuthValues.apiKey,
            _schema: "complex",
            _path: `order/${id}`
          });
        });
        break;

      case "createdDateRange":
        query = {
          target: "RESTAPI",
          _key: stub.channelProfile.channelAuthValues.apiKey,
          _schema: "complex",
          _path: "order",
          _cnd: {
            date: [
              nc.moment(stub.payload.doc.createdDateRange.startDateGMT).unix(),
              nc.moment(stub.payload.doc.createdDateRange.endDateGMT).unix()
            ],
            limit: [stub.payload.doc.page_size * (stub.payload.doc.page - 1), stub.payload.doc.page_size]
          }
        };

        break;

      default:
        throw new Error(`Unknown query type: '${stub.queryType}'`);
    }

    return nc.isNonEmptyArray(queries) ? queries : query;
  }

  async function searchForOrders(query) {
    let orders = [];
    const currentPage = stub.payload.doc.page;
    const currentPageIndex = currentPage - 1;
    const pageSize = stub.payload.doc.page_size;
    let totalCount;

    if (nc.isArray(query)) {
      const queries = query.slice(currentPageIndex * pageSize, currentPage * pageSize);

      const responses = await Promise.all(queries.map(executeQuery));
      orders = responses.map(res => res.body);

      totalCount = query.length;
    } else {
      const response = await executeQuery(query);

      if (nc.isNonEmptyArray(response.body)) {
        orders = response.body;
      }

      totalCount = Number(response.headers["X-Result-Count"]);
    }

    const totalPages = Math.ceil(totalCount / pageSize);
    const hasMore = currentPage < totalPages;

    logInfo(`Found ${totalCount} total orders.`);
    if (totalCount > 0) {
      logInfo(`Returning ${orders.length} orders from page ${currentPage} of ${totalPages}.`);
    }

    stub.out.payload = [];

    orders.forEach(order => {
      stub.out.payload.push({
        doc: order,
        salesOrderRemoteID: order.orderId,
        salesOrderBusinessReference: nc.extractBusinessReferences(
          stub.channelProfile.salesOrderBusinessReferences,
          order
        )
      });
    });

    if (orders.length === 0) {
      stub.out.ncStatusCode = 204;
    } else if (hasMore) {
      stub.out.ncStatusCode = 206;
    } else {
      stub.out.ncStatusCode = 200;
    }
  }

  async function executeQuery(query) {
    logInfo(`Executing query: GET ${stub.request.baseUrl}?${qs.stringify(query, { encode: false })}`);
    const response = await stub.request.get({ qsStringifyOptions: { options: { encode: false } }, qs: query });
    stub.out.response.endpointStatusCode = response.statusCode;
    stub.out.response.endpointStatusMessage = response.message;
    return response;
  }

  async function handleError(error) {
    logError(error);
    if (error.name === "StatusCodeError") {
      stub.out.response.endpointStatusCode = error.statusCode;
      stub.out.response.endpointStatusMessage = error.message;
      if (error.statusCode >= 500) {
        stub.out.ncStatusCode = 500;
      } else if (error.statusCode === 429) {
        logWarn("Request was throttled.");
        stub.out.ncStatusCode = 429;
      } else {
        stub.out.ncStatusCode = 400;
      }
    }
    stub.out.payload.error = error;
    stub.out.ncStatusCode = stub.out.ncStatusCode || 500;
  }

  function logInfo(msg) {
    stub.log(msg, "info");
  }

  function logWarn(msg) {
    stub.log(msg, "warn");
  }

  function logError(msg) {
    stub.log(msg, "error");
  }
}

module.exports.GetSalesOrderFromQuery = GetSalesOrderFromQuery;
