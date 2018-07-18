function InsertCustomer(ncUtil, channelProfile, flowContext, payload, callback) {
  const nc = require("../util/ncUtils");
  const referenceLocations = ["customerBusinessReferences"];
  const stub = new nc.Stub("InsertCustomer", referenceLocations, ...arguments);
  const qs = require("qs");

  validateFunction()
    .then(insertProfile)
    .then(buildResponse)
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

  async function insertProfile() {
    if (!stub.payload.doc.login) {
      throw new Error("login (email) is a required property for inserting a new customer.");
    }

    const query = {
      target: "RESTAPI",
      _key: stub.channelProfile.channelAuthValues.apiKey,
      _path: "profile/0"
    };

    let requestBody = JSON.parse(JSON.stringify(stub.payload.doc));
    delete requestBody.addresses;

    logInfo(`Executing query: POST ${stub.getBaseUrl()}?${qs.stringify(query, { encode: false })}`);
    const response = await stub.request.post({
      uri: "",
      qsStringifyOptions: { options: { encode: false } },
      qs: query,
      body: requestBody
    });
    return response;
  }

  async function buildResponse(response) {
    stub.out.response.endpointStatusCode = response.statusCode;
    stub.out.response.endpointStatusMessage = response.message;
    stub.out.ncStatusCode = 201;
    stub.out.payload.customerRemoteID = response.body.profile_id;
    stub.out.payload.customerBusinessReference = nc.extractBusinessReferences(
      stub.channelProfile.customerBusinessReferences,
      response.body
    );
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

module.exports.InsertCustomer = InsertCustomer;
