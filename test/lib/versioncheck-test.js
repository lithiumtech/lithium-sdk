'use strict';

var nock = require('nock');
var chai = require('chai');
var expect = chai.expect;
var path = require('path');
var gutil = require('gulp-util');
var apiHost = 'https://mycommunity.com/';
var testRoot = path.resolve(__dirname) + '/..';
var spawn = require('child_process').spawn;
var rewire = require('rewire');
var badErrorRespnse = 'Bad response';
var successVersion = 15.7;
var higherVersion = '15.7.1';
var higherVersion2 = 16.1;
var lowerVersion = 12.1;

describe('test version check', function() {
  this.slow(1000);
  var versionCheckApi = "/status/version";

  function createErrorRequest(errMsg) {
    return nock(apiHost)
        .log(console.log)
        .get(versionCheckApi)
        .replyWithError(errMsg);
  }


  function createResponse(versionNum) {
    return nock(apiHost)
        .log(console.log)
        .get(versionCheckApi)
        .reply(200, '<!doctype html><html><head><title>Lithium InterActive Version</title></head><body>'+versionNum+' (' +
          versionNum + '-release r266968)</body></html>');
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
      serverUrl: 'https://mycommunity.com/',
      strictMode: false,
      verbose: false,
      toolVersion: '1.0.0',
      allowStudioOverrides: false
    });
  }

  describe('version check response', function() {
    var versioncheck;
    var sandbox;
    var server;

    function check(expects, versionNumber, opts) {

      var taskError;
      if (expects.serverError) {
        createErrorRequest(badErrorRespnse);
      } else if (expects.respondSuccess) {
        createResponse(versionNumber);
      }
      var gulp = {
        task: function(name, required, fn) {
        }

      };
      rewire(testRoot + '/../gulp/versioncheck.js')(gulp, gutil).process(server, opts.cb);
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
            expect(err.message).to.equal(badErrorRespnse);
            done();
          }
      });
    });

    it('should return success', function(done) {
      var cb = function(err) {
        expect.fail(true, "Did not expect errors");
      };
      check({ respondSuccess: true }, successVersion, { cb: cb});
      done();
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
          { cb: function(err) {
            expect.fail(true, "Should not return error");
          }
      });
      done();
    });

    it('should return success for higher version with major.min.subminor', function(done) {
      check( { respondSuccess: true }, higherVersion2,
          { cb: function(err) {
            expect.fail(true, "Should not return error");
          }
          });
      done();
    });

  });
});