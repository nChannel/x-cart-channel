function ExtractCustomerAddressesFromCustomer(ncUtil, channelProfile, flowContext, payload, callback) {
  const nc = require("../util/ncUtils");
  const referenceLocations = ["customerBusinessReferences"];
  const stub = new nc.Stub("ExtractCustomerAddressesFromCustomer", referenceLocations, ...arguments);
  const qs = require("qs");

  validateFunction()
    .then(extractAddresses)
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

  async function extractAddresses() {
    if (nc.isNonEmptyArray(stub.payload.doc.addresses)) {
      stub.out.ncStatusCode = 200;
      logInfo(`Found ${stub.payload.doc.addresses.length} addresses on customer document.`);
      stub.out.payload = [];
      stub.payload.doc.addresses.forEach(address => {
        if (!address.profile) {
          address.profile = {};
        }

        if (!address.profile.profile_id && stub.payload.customerRemoteID) {
          address.profile.profile_id = stub.payload.customerRemoteID;
        }

        stub.out.payload.push({
          doc: address,
          customerRemoteID: stub.payload.customerRemoteID,
          customerBusinessReference: stub.payload.customerBusinessReference
        });
      });
    } else {
      stub.out.ncStatusCode = 204;
      logInfo("No addresses found on customer document.");
    }
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

module.exports.ExtractCustomerAddressesFromCustomer = ExtractCustomerAddressesFromCustomer;
