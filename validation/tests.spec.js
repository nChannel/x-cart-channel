'use strict';

let expect = require('chai').expect;
let _ = require('lodash');
let fs = require('fs');
let nock = require('nock');
let functionCodes = require('./functions.json');

if (fs.existsSync('/sdk/config/channel-settings.json')) {

  let channel_settings = require('/sdk/config/channel-settings.json');
  let docsFile = require('/sdk/config/docs.json');
  let docs = docsFile.docs;

  let baseChannelProfile = {
    channelSettingsValues: channel_settings.channelSettingsSchema.configDef.configValues,
  };

  let ncUtil = docs.ncUtil;

  // Check if functions exist
  if (fs.existsSync('/sdk/functions')) {

    // Get the functions for the current channel
    function getFunctions(path) {
      return fs.readdirSync(path).filter(function (file) {
        return fs.statSync(path+'/'+file);
      });
    }

    let untestedFunction = false;
    let functions = getFunctions('/sdk/functions');

    // Itereate through each function in the channel
    for (let j = 0; j < functions.length; j++) {

      // Remove file extension
      let tested = false;
      let stubFunction = functions[j].slice(0, -3);

      for (let i = 0; i < docs.length; i++) {

        if (stubFunction == docs[i].functionName && docs[i].tests && functionCodes[stubFunction]) {
          tested = true;
          let functionName = docs[i].functionName;
          let channelProfile = _.merge(docsFile.channelProfile, baseChannelProfile);

          // Require function
          let file = require('/sdk/functions/' + functionName);

          // Evaluate status codes
          let statusCodes = functionCodes[functionName].statusCodes;
          let missingCodes = [];

          for (let s = 0; s < statusCodes.length; s++) {
            let found = false;
            for (let t = 0; t < docs[i].tests.length; t++) {
              if (docs[i].tests[t].ncStatusCode == statusCodes[s]) {
                found = true;
              }
            }

            if (!found) {
              missingCodes.push(statusCodes[s]);
              console.log(`${functionName}: Missing document to cover ncStatusCode: ${statusCodes[s]}`);
            }
          }

          if (missingCodes.length > 0) {
            throw new Error(`${functionName} does not contain enough documents to cover all ncStatusCodes`);
          }

          for (let t = 0; t < docs[i].tests.length; t++) {
            describe(functionName, () => {

              afterEach((done) => {
                if (docsFile.unitTestPackage === 'nock') {
                  nock.cleanAll();
                  done();
                } else {
                  done();
                }
              });

              if (docs[i].tests[t].ncStatusCode == 200) {
                it('It should run a test successfully', (done) => {

                  let scope = executeTest(docsFile.unitTestPackage, docs[i].tests[t]);

                  file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, (response) => {
                    assertPackage(scope);
                    expect(response.ncStatusCode).to.be.equal(200);
                    expect(response.payload).to.be.a('Object');
                    done();
                  });
                });
              }

              if (docs[i].tests[t].ncStatusCode == 201) {
                it('It should run a test successfully', (done) => {

                  let scope = executeTest(docsFile.unitTestPackage, docs[i].tests[t]);

                  file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, (response) => {
                    assertPackage(scope);
                    expect(response.ncStatusCode).to.be.equal(201);
                    expect(response.payload).to.be.a('Object');
                    done();
                  });
                });
              }

              // 204 ncStatusCode test
              if (docs[i].tests[t].ncStatusCode == 204) {
                it('It should run a test and return a 204 status code', (done) => {

                  let scope = executeTest(docsFile.unitTestPackage, docs[i].tests[t]);

                  file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, (response) => {
                    assertPackage(scope);
                    expect(response.ncStatusCode).to.be.equal(204);
                    expect(response.payload).to.be.a('Object');
                    done();
                  });
                });
              }

              // 409 ncStatusCode test
              if (docs[i].tests[t].ncStatusCode == 409) {
                it('It should run a test and return a 409 status code', (done) => {

                  let scope = executeTest(docsFile.unitTestPackage, docs[i].tests[t]);

                  file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, (response) => {
                    assertPackage(scope);
                    expect(response.ncStatusCode).to.be.equal(409);
                    expect(response.payload).to.be.a('Object');
                    done();
                  });
                });
              }

              // 206 ncStatusCode test
              if (docs[i].tests[t].ncStatusCode == 206) {
                it('It should run a test and return a 206 status code', (done) => {

                  let scope = executeTest(docsFile.unitTestPackage, docs[i].tests[t]);

                  file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, (response) => {
                    assertPackage(scope);
                    expect(response.ncStatusCode).to.be.equal(206);
                    expect(response.payload).to.be.a('Object');
                    done();
                  });
                });
              }

              if (docs[i].tests[t].ncStatusCode == 400) {
                it('It should fail with 400 when the endpoint returns a status code other than 200, 204, 400, 409, 429 or 500', (done) => {

                  let scope = executeTest(docsFile.unitTestPackage, docs[i].tests[t], 401);

                  file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, (response) => {
                    assertPackage(scope);
                    expect(response.ncStatusCode).to.be.equal(400);
                    expect(response.payload).to.be.a('Object');
                    done();
                  });
                });
              }

              if (docs[i].tests[t].ncStatusCode == 429) {
                it('It should return 429 our request is denied due to throttling', (done) => {
                  let scope = executeTest(docsFile.unitTestPackage, docs[i].tests[t], 429);

                  file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, (response) => {
                    assertPackage(scope);
                    expect(response.ncStatusCode).to.be.equal(429);
                    expect(response.payload).to.be.a('Object');
                    done();
                  });
                });
              }

              if (docs[i].tests[t].ncStatusCode == 500) {
                it('It should return 500 when the test library returns and error', (done) => {
                  let scope = executeTest(docsFile.unitTestPackage, docs[i].tests[t], 500, true);

                  file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, (response) => {
                    assertPackage(scope);
                    expect(response.ncStatusCode).to.be.equal(500);
                    expect(response.payload).to.be.a('Object');
                    done();
                  });
                });
              }

              if (docs[i].tests[t].ncStatusCode == 500) {
                it('It should return 500 when a server side error occurs', (done) => {
                  let scope = executeTest(docsFile.unitTestPackage, docs[i].tests[t], 500);

                  file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, (response) => {
                    assertPackage(scope);
                    expect(response.ncStatusCode).to.be.equal(500);
                    expect(response.payload).to.be.a('Object');
                    done();
                  });
                });
              }

              it('It should fail with 400 when no docsFile.ncUtil is passed in', (done) => {
                file[functionName](null, channelProfile, null, docs[i].tests[t].payload, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should fail with 400 when no channel profile is passed in', (done) => {
                file[functionName](docsFile.ncUtil, null, null, docs[i].tests[t].payload, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should fail with 400 when no channel settings values are passed in', (done) => {
                let errChannelProfile = {
                  channelAuthValues: channelProfile.channelAuthValues,
                  customerBusinessReferences: channelProfile.customerBusinessReferences
                };
                file[functionName](docsFile.ncUtil, errChannelProfile, null, docs[i].tests[t].payload, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should fail with 400 when no channel settings protocol is passed in', (done) => {
                let errChannelProfile = {
                  channelSettingsValues: {},
                  channelAuthValues: channelProfile.channelAuthValues,
                  customerBusinessReferences: channelProfile.customerBusinessReferences
                };
                file[functionName](docsFile.ncUtil, errChannelProfile, null, docs[i].tests[t].payload, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should fail with 400 when no channel auth values are passed in', (done) => {
                let errChannelProfile = {
                  channelSettingsValues: channelProfile.channelSettingsValues,
                  customerBusinessReferences: channelProfile.customerBusinessReferences
                };
                file[functionName](docsFile.ncUtil, errChannelProfile, null, docs[i].tests[t].payload, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should fail with 400 when no business reference is passed in', (done) => {
                let errChannelProfile = {
                  channelSettingsValues: channelProfile.channelSettingsValues,
                  channelAuthValues: channelProfile.channelAuthValues
                };
                file[functionName](docsFile.ncUtil, errChannelProfile, null, docs[i].tests[t].payload, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should fail with 400 when business references is not an array', (done) => {
                let errChannelProfile = {
                  customerBusinessReferences: {},
                  channelSettingsValues: channelProfile.channelSettingsValues,
                  channelAuthValues: channelProfile.channelAuthValues
                };
                file[functionName](docsFile.ncUtil, errChannelProfile, null, docs[i].tests[t].payload, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should fail with 400 when business references is empty', (done) => {
                let errChannelProfile = {
                  customerBusinessReferences: [],
                  channelSettingsValues: channelProfile.channelSettingsValues,
                  channelAuthValues: channelProfile.channelAuthValues
                };
                file[functionName](docsFile.ncUtil, errChannelProfile, null, docs[i].tests[t].payload, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should fail with 400 when no payload is passed in', (done) => {
                file[functionName](docsFile.ncUtil, channelProfile, null, null, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should fail with 400 because the payload does not contain a customer', (done) => {
                let payload = {};
                file[functionName](docsFile.ncUtil, channelProfile, null, payload, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should throw an exception when no callback is provided', (done) => {
                expect(() => file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, null))
                  .to.throw(Error, 'A callback function was not provided');
                done();
              });

              it('It should throw an exception when the callback is not a function', (done) => {
                expect(() => file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, {}))
                  .to.throw(TypeError, 'callback is not a function');
                done();
              });

            });
          }

          function executeTest (unitTest, test, statusCode, errorTest = false) {
            errorTest = (typeof errorTest === 'boolean') ? errorTest : false;
            if (unitTest === 'nock') {
              let fake = nock(test.baseUri);
              for (let i = 0; i < test.links.length; i++) {
                switch (test.links[i].method.toUpperCase()) {
                  case 'GET':
                    errorTest === false ?
                    fake.get(test.links[i].uri).reply(statusCode != null ? statusCode : test.links[i].statusCode, test.links[i].responsePayload) :
                    fake.get(test.links[i].uri).replyWithError({ message: "Internal Error" });
                    break;
                  case 'POST':
                    errorTest === false ?
                    fake.post(test.links[i].uri, test.payload.doc).reply(statusCode != null ? statusCode : test.links[i].statusCode, test.links[i].responsePayload) :
                    fake.post(test.links[i].uri, test.payload.doc).replyWithError({ message: "Internal Error" });
                    break;
                  case 'PUT':
                    errorTest === false ?
                    fake.put(test.links[i].uri, test.payload.doc).reply(statusCode != null ? statusCode : test.links[i].statusCode, test.links[i].responsePayload) :
                    fake.put(test.links[i].uri, test.payload.doc).replyWithError({ message: "Internal Error" });
                    break;
                  case 'DELETE':
                    errorTest === false ?
                    fake.delete(test.links[i].uri).reply(statusCode != null ? statusCode : test.links[i].statusCode, test.links[i].responsePayload) :
                    fake.delete(test.links[i].uri).replyWithError({ message: "Internal Error" });
                    break;
                }
              }
              return fake;
            } else {
              return null;
            }
          }

          function assertPackage(scope) {
            switch (docsFile.unitTestPackage.toLowerCase()) {
              case 'nock':
                expect(scope.isDone()).to.be.true;
                break;
              default:
                break;
            }
          }
        }
      }

      if (!tested) {
        console.log(`Function ${stubFunction} does not have a test document and could not tested.`);
        untestedFunction = true;
      }
    }
  }
}
