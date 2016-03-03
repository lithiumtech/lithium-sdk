'use strict';

var nock = require('nock');
var chai = require('chai');
var expect = chai.expect;
var path = require('path');
var gutil = require('gulp-util');
var apiHost = 'https://mycommunity.com';
var testRoot = path.resolve(__dirname) + '/..';
var spawn = require('child_process').spawn;
var rewire = require('rewire');
var serverMocks = require('./server-mocks');
var badErrorRespnse = 'Bad response';
var successVersion = 16.2;
var higherVersion = '16.4';
var higherVersion2 = '16.3.1';
var higherVersion3 = '16.3';
var lowerVersion = 12.1;
var lowerVersion1 = 15.4;
var errorResponse = 'Invalid version check response';
var errorResponse2 = 'Invalid response from server';

describe('test version check', function() {
  this.slow(1000);
  var versionCheckApi = "/restapi/ldntool/plugins/version?format=json";

  function createErrorRequest(errMsg) {
    return nock(apiHost)
        .log(console.log)
        .get(versionCheckApi)
        .replyWithError(errMsg);
  }

  function createErrorResponse() {
    return nock(apiHost)
        .log(console.log)
        .get(versionCheckApi)
        .reply(200, '{"status": "error"}');
  }

  function createMangledResponse() {
    return nock(apiHost)
        .log(console.log)
        .get(versionCheckApi)
        .reply(500, '<html><body>NonXMLResponse</body><body>test</body></html>');
  }

  function createMangledVersionResponse() {
    return nock(apiHost)
        .log(console.log)
        .get(versionCheckApi)
        .reply(200, '{"status":"OK", "version": "BadVersion"}');
  }

  function createResponse(versionNum) {
    return nock(apiHost)
        .log(console.log)
        .get(versionCheckApi)
        .reply(200, '{"status":"OK", "version": "' + versionNum + '"}');
  }
  function createInvalidPluginTokenResponse() {
    return nock(apiHost)
        .log(console.log)
        .get(versionCheckApi)
        .reply(200, '{"service-response": {"hard-failures": [ ], "message": "Anonymous users cannot view or modify community plugins. Go to Studio > SDK and confirm that your upload token has not expired.' +
        '", "soft-failures":[ ], "status":"UPLOAD_FAIL", "success": false }}');
  }

  describe('version check response', function() {
    var server;

    function check(expects, versionNumber, opts) {

      if (expects.serverError) {
        createErrorRequest(badErrorRespnse);
      } else if (expects.respondSuccess) {
        createResponse(versionNumber);
      } else if (expects.errorResponse) {
        createErrorResponse();
      } else if (expects.mangledVersion) {
        createMangledVersionResponse();
      } else if (expects.mangledResponse) {
        createMangledResponse();
      } else if (expects.invalidPluginTokenResponse) {
        createInvalidPluginTokenResponse();
      }
      var gulp = {
        task: function(name, required, fn) {
        }

      };
      rewire(testRoot + '/../lib/version-check.js')(gulp, gutil).process(server, opts, opts.cb, opts.errorCallback);
    }

    before(function() {
      server = serverMocks.createDefaultServerMock();
    });

    beforeEach(function() {
      nock.cleanAll();
    });

    it('should return error response from server', function(done) {
      check( { serverError: true }, 15.7,
          { errorCallback: function(err) {
            expect(err.message).to.contains(errorResponse2);
            done();
          }, debugMode: false
      });
    });

    it('should return error response from server with empty version', function(done) {
      var cb = function(err) {
        expect(err.message).to.contains(errorResponse);
        done();
      };
      check({ respondSuccess: true }, ' ', { errorCallback: cb, debugMode: false });
    });

    it('should return error for bad response from server', function(done) {
      var cb = function(err) {
        expect(err.message).to.contains(errorResponse2);
        done();
      };
      check({ errorResponse: true }, ' ', { errorCallback: cb, debugMode: false });
    });

    it('should return error for mangled response from server', function(done) {
      var cb = function(err) {
        done();
      };
      check({ mangledResponse: true }, ' ', { errorCallback: cb, debugMode: false });
    });

    it('should return error for mangled version response from server', function(done) {
      var cb = function(err) {
        expect(err.message).to.contains(errorResponse);
        done();
      };
      check({ mangledVersion: true }, ' ', { errorCallback: cb, debugMode: false });
    });

    it('should return error for bad plugin token response from server', function(done) {
      var cb = function(err) {
        expect(err.message).to.contains('Anonymous users cannot view or modify community plugins');
        done();
      };
      check({ invalidPluginTokenResponse : true }, ' ', { errorCallback: cb, debugMode: false });
    });

    it('should return success', function(done) {
      var cb = function() {
        done();
      };
      check({ respondSuccess: true }, successVersion, { cb: cb, debugMode: false });

    });

    it('should return error for lower version', function(done) {
      check( { respondSuccess: true }, lowerVersion,
          { errorCallback: function(err) {
            expect(err.message).to.contains("Supported minimum version on server is "+successVersion);
            done();
          }, debugMode: false
          });
    });

    it('should return error for lower version2', function(done) {
      check( { respondSuccess: true }, lowerVersion1,
          { errorCallback: function(err) {
            expect(err.message).to.contains("Supported minimum version on server is "+successVersion);
            done();
          }, debugMode: false
          });
    });

    it('should return success for higher version', function(done) {
      check( { respondSuccess: true }, higherVersion,
          { cb: function() {
            done();
          }, debugMode: false
      });

    });

    it('should return success for higher version with major.min.subminor', function(done) {
      check( { respondSuccess: true }, higherVersion2,
          { cb: function() {
            done();
          }, debugMode: false
          });

    });

    it('should return success for higher version with higher version 2', function(done) {
      check( { respondSuccess: true }, higherVersion3,
          { cb: function() {
            done();
          }, debugMode: false
          });

    });

  });
});