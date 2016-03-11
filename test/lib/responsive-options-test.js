'use strict';

var rewire = require('rewire');
var nock = require('nock');
var chai = require('chai');
var expect = chai.expect;
var path = require('path');
var gutil = require('gulp-util');
var fs = require('fs');
var through = require('through2');
var testRoot = path.resolve(__dirname) + '/..';
var serverMocks = require('./server-mocks');
var apiHost = 'https://mycommunity.com';
var badErrorRespnse = 'Bad response';

describe('test responsive options', function() {
  var apiPath = "/restapi/ldntool/plugins/responsive?format=json";

  function createErrorRequest(errMsg, requestBody) {
    var n = nock(apiHost).log(console.log);
    n = requestBody ? n.post(apiPath, requestBody) : n.get(apiPath);
    n = n.replyWithError(errMsg);

    return n;
  }

  function createErrorResponse(requestBody) {
    var n = nock(apiHost).log(console.log);
      n = requestBody ? n.post(apiPath, requestBody) : n.get(apiPath);
      n = n.reply(200, '{"status": "error"}');

    return n;
  }

  function createMangledResponse(requestBody) {
    var n = nock(apiHost).log(console.log);
    n = requestBody ? n.post(apiPath, requestBody) : n.get(apiPath);
    n = n.reply(500, '<html><body>NonXMLResponse</body><body>test</body></html>');

    return n;
  }

  function createResponse(config, requestBody) {
    var n = nock(apiHost).log(console.log);
    n = requestBody ? n.post(apiPath, requestBody) : n.get(apiPath);
    n = n.reply(200, JSON.stringify(config));

    return n;
  }
  function createInvalidPluginTokenResponse(requestBody) {
    var n = nock(apiHost).log(console.log);
    n = requestBody ? n.post(apiPath, requestBody) : n.get(apiPath);
    n = n.reply(200, '{"service-response": {"hard-failures": [ ], "message": "Anonymous users cannot view or modify community plugins. Go to Studio > SDK and confirm that your upload token has not expired.' +
      '", "soft-failures":[ ], "status":"UPLOAD_FAIL", "success": false }}');

    return n;
  }

  describe('responsive options put', function() {
    var server;

    function check(done, expects, config, opts) {

      if (!opts.pluginType) {
        opts.pluginType = 'responsive';
      }
      if (!opts.doPut) {
        opts.doPut = false;
      }
      if (!opts.noCache) {
        opts.noCache = true;
      }
      if (!opts.skinOpts) {
        opts.skinOpts = {};
      }
      opts.verboseMode = true;
      opts.debugMode = true;
      opts.configDir = 'configs';

      opts.skinOpts = {
        enabled: true,
        id: 'my_responsive_skin',
        url: 'http://localhost:9000/styles/my_responsive_skin.css',
        anonymous_viewing: true
      };

      if (expects.serverError) {
        createErrorRequest(badErrorRespnse, {
          "dev_skin":{
            "enabled":true,
            "id":"my_responsive_skin",
            "url":"http://localhost:9000/styles/my_responsive_skin.css",
            "anonymous_viewing":true
          }
        });
      } else if (expects.respondSuccess) {
        createResponse(opts.doPut ? { status:'OK', message:''}  : config, {
          "dev_skin":{
            "enabled":true,
            "id":"my_responsive_skin",
            "url":"http://localhost:9000/styles/my_responsive_skin.css",
            "anonymous_viewing":true
          }
        });
        createResponse(config);
      } else if (expects.errorResponse) {
        createErrorResponse({
          "dev_skin":{
            "enabled":true,
            "id":"my_responsive_skin",
            "url":"http://localhost:9000/styles/my_responsive_skin.css",
            "anonymous_viewing":true
          }
        });
      } else if (expects.mangledResponse) {
        createMangledResponse({
          "dev_skin":{
            "enabled":true,
            "id":"my_responsive_skin",
            "url":"http://localhost:9000/styles/my_responsive_skin.css",
            "anonymous_viewing":true
          }
        });
      } else if (expects.invalidPluginTokenResponse) {
        createInvalidPluginTokenResponse({
          "dev_skin":{
            "enabled":true,
            "id":"my_responsive_skin",
            "url":"http://localhost:9000/styles/my_responsive_skin.css",
            "anonymous_viewing":true
          }
        });
      }
      var gulp = {
        task: function(name, required, fn) {
        }

      };
      var fixDir = function(path) {
        if (path == 'configs') {
          path = testRoot + '/lib/' + path;
        }

        return path;
      };

      var configFileValue = null;

      var fsMock = {
        existsSync: function(path) {
          if (path == 'configs/responsive.conf.json') {
            return configFileValue != null;
          }
          return fs.existsSync(fixDir(path));
        },
        readFileSync: function(path) {
          if (path == 'configs/responsive.conf.json') {
            return configFileValue;
          }
          return fs.readFileSync(fixDir(path));
        },
        writeFile: function(path, val, cb) {
          configFileValue = val;
          return cb();
        },
        mkdirSync: function(path) {
          return fs.mkdirSync(fixDir(path));
        }
      };
      var responsiveOptions = rewire(testRoot + '/../lib/responsive-options.js');
      responsiveOptions.__set__({
        fs: fsMock
      });
      var cb = opts.cb ? opts.cb : function(err) {
       done();
      };
      responsiveOptions(gulp, gutil).putOptions(server, opts, cb).pipe(through.obj());;
    }

    before(function() {
      server = serverMocks.createDefaultServerMock();
    });

    beforeEach(function() {
      nock.cleanAll();
    });

    it('should return error response from server', function(done) {
      check(done, { serverError: true }, undefined,
        { cb: function(err) {
          expect(err.message).to.contain('Error making request to save responsive options');
          done();
        }, debugMode: false
        });
    });

    it('should return error for bad response from server', function(done) {
      var cb = function(err) {
        expect(err.message).to.contain('Error making request to save responsive options');
        done();
      };
      check(done, { errorResponse: true }, undefined, { cb: cb, debugMode: false });
    });

    it('should return error for mangled response from server', function(done) {
      var cb = function(err) {
        expect(err.message).to.contain('server returned status code 500');
        done();
      };
      check(done, { mangledResponse: true }, undefined, { cb: cb, debugMode: false });
    });

    it('should return error for bad plugin token response from server', function(done) {
      var cb = function(err) {
        expect(err.message).to.contain('Error making request to save responsive options');
        done();
      };
      check(done, { invalidPluginTokenResponse : true }, undefined, { cb: cb, debugMode: false });
    });

    it('should return success', function(done) {
      var cb = function(err, config, msg) {
        expect(err).to.be.null;
        expect(config).to.not.be.null;
        expect(msg).to.equal('saved configs/responsive.conf.json');
        done();
      };
      check(done, { respondSuccess: true }, {
        status: 'OK',
        features: ['responsivepeak', 'responsivebase'],
        feature: {
          responsivepeak: {
            id: 'responsivepeak',
            version: '1.6',
            path: '/res/feature/responsivepeak/v1.6-lia16.1',
            fq_version: 'v1.6-lia16.1'
          },
          responsivebase:{
            id: 'responsivebase',
            version: '1.6',
            path: '/res/feature/responsivebase/v1.6-lia16.1',
            fq_version: 'v1.6-lia16.1'
          }
        },
        skins: ['responsive_base', 'responsive_peak'],
        skin: {
          responsive_base: {
            id: 'responsive_base',
            feature_id: 'responsivebase'
          },
          responsive_peak: {
            id: 'responsive_peak',
            feature_id: 'responsivepeak'
          }
        },
        dev_skin:{
          enabled: true,
          id: 'my_first_responsive_skin',
          url: 'http://localhost:9000/skins/my_first_responsive_skin',
          anonymous_viewing: true
        }
      }, { cb: cb, debugMode: false, configDir: 'configs' });

    });

  });
});