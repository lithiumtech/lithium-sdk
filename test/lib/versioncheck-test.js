'use strict';

var nock = require('nock');
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var path = require('path');
var gutil = require('gulp-util');
var apiHost = 'https://mycommunity.com:443';
var testRoot = path.resolve(__dirname) + '/..';
var rewire = require('rewire');
var spawn = require('child_process').spawn;
var server;

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

  describe('version check response', function() {
    var versioncheck;
    var sandbox;
    var gulp;

    function check( done, expects, versionNumber) {

      if (expects.serverError) {
        createErrorRequest('Bad response');
      } else if (expects.respondSuccess) {
        createResponse(versionNumber);
      }
      var vs = versioncheck(gulp, gutil);
      console.log(vs);

    }

    before(function() {
      //sinon.mock(gulp);
      //sinon.stub(gulp, "task" , function() { return; } );
      sandbox = sinon.sandbox.create();
      gulp = sinon.mock();
      sinon.
      versioncheck = rewire(testRoot + '/../gulp/versioncheck.js');
      //serverMock.__set__("serverConfigPath", "mock.server.conf.json");
    });

    beforeEach(function() {
      nock.cleanAll();
    });

    afterEach(function() {
    });

    after(function() {
    });


    it('should return error', function(done) {
      check( done,
          { serverError: true },
          15.7 );
      done();
    });
    it('should return success', function(done) {
      check( done,
          { respondSuccess: true },
          15.7 );
      done();
    });
  });
});