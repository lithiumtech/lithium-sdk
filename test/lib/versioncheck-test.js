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
var badErrorRespnse = 'Bad response';
var successVersion = 15.7;
var higherVersion = '15.7.1';
var higherVersion2 = 16.1;
var lowerVersion = 12.1;
var emptyErrorResponse = 'Empty version check response';
var errorResponse = 'Invalid version check response';
var errorResponse2 = 'Invalid response from server';

describe('test version check', function() {
  this.slow(1000);
  var versionCheckApi = "/restapi/ldntool/plugins/version";

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
        .reply(200, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><version-response><status>error</status></version-response>');
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
        .reply(200, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><version-response><status>OK</status><version>BadVersion</version></version-response>');
  }

  function createResponse(versionNum) {
    return nock(apiHost)
        .log(console.log)
        .get(versionCheckApi)
        .reply(200, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><version-response><status>OK</status><version>'+versionNum
         + '</version></version-response>');
  }
  function createInvalidPluginTokenResponse() {
    return nock(apiHost)
        .log(console.log)
        .get(versionCheckApi)
        .reply(200, '<service-response><message>Anonymous users cannot view or modify community plugins. Go to Studio > SDK and confirm that your upload token has not expired.' +
        '</message> <status>UPLOAD_FAIL</status> </service-response>');
  }

  function createServerMock(serverConfig) {
    var serverApi = {};
    Object.keys(serverConfig).forEach(function (key) {
      serverApi[key] = function () {
        return serverConfig[key];
      };
    });

    serverApi['pluginUploadProtocol'] = function() {
      var serverUrl = serverApi['serverUrl']();
      if (serverUrl && serverUrl.indexOf('http://') > -1) {
        return 'http';
      }

      return 'https';
    };

    return serverApi;
  }

  function createDefaultServerMock() {
    return createServerMock({
      //community: '',
      dryRun: false,
      force: false,
      pluginPoints: [],
      pluginToken: 'c95a3357-baed-4f09-9596-86583189b33e',
      serverUrl: apiHost,
      strictMode: false,
      verbose: false,
      toolVersion: '1.0.0',
      allowStudioOverrides: false
    });
  }

  describe('version check response', function() {
    var versioncheck;
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
      rewire(testRoot + '/../lib/version-check.js')(gulp, gutil).process(server, opts.cb);
    }

    before(function() {
      server = createDefaultServerMock();
    });

    beforeEach(function() {
      nock.cleanAll();

    });

    it('should return error response from server', function(done) {
      check( { serverError: true }, 15.7,
          { cb: function(err) {
            expect(err.message).to.equal(emptyErrorResponse);
            done();
          }
      });
    });

    it('should return error response from server with empty version', function(done) {
      var cb = function(err) {
        expect(err.message).to.contains(errorResponse);
        done();
      };
      check({ respondSuccess: true }, ' ', { cb: cb});
    });

    it('should return error for bad response from server', function(done) {
      var cb = function(err) {
        expect(err.message).to.contains(errorResponse2);
        done();
      };
      check({ errorResponse: true }, ' ', { cb: cb});
    });

    it('should return error for mangled response from server', function(done) {
      var cb = function(err) {
        done();
      };
      check({ mangledResponse: true }, ' ', { cb: cb});
    });

    it('should return error for mangled version response from server', function(done) {
      var cb = function(err) {
        expect(err.message).to.contains(errorResponse);
        done();
      };
      check({ mangledVersion: true }, ' ', { cb: cb});
    });

    it('should return error for bad plugin token response from server', function(done) {
      var cb = function(err) {
        expect(err.message).to.contains('Anonymous users cannot view or modify community plugins');
        done();
      };
      check({ invalidPluginTokenResponse : true }, ' ', { cb: cb});
    });

    it('should return success', function(done) {
      var cb = function() {
        done();
      };
      check({ respondSuccess: true }, successVersion, { cb: cb});

    });

    it('should return error for lower version', function(done) {
      check( { respondSuccess: true }, lowerVersion,
          { cb: function(err) {
            expect(err.message).to.contains("Supported minimum version on server is "+successVersion);
            done();
          }
      });
    });

    it('should return success for higher version', function(done) {
      check( { respondSuccess: true }, higherVersion,
          { cb: function() {
            done();
          }
      });

    });

    it('should return success for higher version with major.min.subminor', function(done) {
      check( { respondSuccess: true }, higherVersion2,
          { cb: function() {
            done();
          }
          });

    });

  });
});