'use strict';

var AdmZip = require('adm-zip');
var rewire = require('rewire');
var nock = require('nock');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = chai.expect;
chai.use(sinonChai);

var fs = require('fs');
var path = require('path');
var Stream = require('stream').Stream;
var through = require('through2');
var gs = require('glob-stream');
var gutil = require('gulp-util');
var testRoot = path.resolve(__dirname) + '/..';
var apiHost = 'https://mycommunity.com:443';

function defined(obj) {
  return typeof obj !== 'undefined';
}

function createRequestErrorResponseScope(path, errMsg) {
  return nock(apiHost)
    .log(console.log)
    .post(path)
    .replyWithError(errMsg);
}

function createUploadErrorResponseScope(path, statusCode, error) {
  return nock(apiHost)
    .log(console.log)
    .post(path)
    .replyWithFile(statusCode, testRoot + '/lib/replies/error_' + error + '.json');
}

function createUploadResponseScope(path, responseFileName) {
  return nock(apiHost)
    .log(console.log)
    .post(path)
    .replyWithFile(200, testRoot + '/lib/replies/' + responseFileName + '.json');
}

function createServerMock(serverConfig, options) {
  var serverApi = {};
  Object.keys(serverConfig).forEach(function (key) {
    serverApi[key] = function () {
      return serverConfig[key];
    };
  });

  if (defined(options)) {
    Object.keys(options).forEach(function (key) {
      serverApi[key] = function () {
        return options[key];
      };
    });
  }

  serverApi['pluginUploadProtocol'] = function() {
    var serverUrl = serverApi['serverUrl']();
    if (serverUrl && serverUrl.indexOf('http://') > -1) {
      return 'http';
    }

    return 'https';
  };

  return serverApi;
}

function createDefaultServerMock(options) {
  return createServerMock({
    //community: '',
    dryRun: false,
    force: false,
    pluginPoints: [],
    pluginToken: 'c95a3357-baed-4f09-9596-86583189b33e',
    serverUrl: 'https://mycommunity.com',
    strictMode: false,
    verbose: false,
    toolVersion: '1.0.0',
    allowStudioOverrides: false,
    skipTemplateValidation: false
  }, options);
}

describe('test uploading plugin', function() {
  this.slow(500);
  var sandbox;
  var gulp;
  var pluginUpload;
  var server;
  var answers;
  var path;
  var returnFileName;
  var opts;

  function processOptions(options) {
    if (defined(options)) {
      if (defined(options.doRecord) && options.doRecord) {
        nock.recorder.rec();
      }

      server = createServerMock({
        //community: '',
        dryRun: defined(options.dryRun) ? options.dryRun : false,
        force: false,
        pluginPoints: [],
        pluginToken: 'c95a3357-baed-4f09-9596-86583189b33e',
        serverUrl: 'https://mycommunity.com',
        strictMode: defined(options.strictMode) ? options.strictMode : false,
        verbose: false,
        allowStudioOverrides: defined(options.allowStudioOverrides) ? options.allowStudioOverrides : false,
        toolVersion: '1.0.0',
        skipTemplateValidation: false
      }, options);

      if (!defined(opts)) {
        opts = options;
      } else {
        Object.keys(options).forEach(function(key) {
          opts[key] = options[key];
        });
      }
    }
  }

  function uploadPlugin(done, expects, options) {
    processOptions(options);

    path = '/restapi/ldntool/larservice/submit-lar?format=json';
    if (defined(options) && defined(options.strictMode) && options.strictMode) {
      path = path + (path.indexOf('?') > -1 ? '&' : '?') + 'lar.strict_mode=true';
    }
    if (defined(options) && defined(options.dryRun) && options.dryRun) {
      path = path + (path.indexOf('?') > -1 ? '&' : '?') + 'lar.dry_run=true';
    }
    if (defined(options) && defined(options.allowStudioOverrides) && options.allowStudioOverrides) {
      path = path + (path.indexOf('?') > -1 ? '&' : '?') + 'lar.allow_studio_overrides=true';
    }
    returnFileName = 'upload_sdk_plugin';

    if (expects.requestError) {
      createRequestErrorResponseScope(path, 'something bad happened', false);
    } else if (expects.anonymous) {
      createUploadErrorResponseScope(path, 403, 'upload_anonymous_user');
    } else if (expects.hardfailures) {
      createUploadErrorResponseScope(path, 200, 'upload_hardfailures');
    } else {
      createUploadResponseScope(path, returnFileName);
    }

    var cb = defined(opts) && defined(opts.cb) ? opts.cb : function(result) {
      if (defined(expects.callResult)) {
        expect(result).to.equal(expects.callResult);
        done();
      }
      else{
        done();
      }
    };

    var fsMock = {
      createReadStream: function () {
        return '';
      },
      existsSync: fs.existsSync,
      writeFileSync: fs.writeFileSync
    };

    pluginUpload = rewire(testRoot + '/../lib/plugin-upload.js');
    pluginUpload.__set__({
      pluginDir: testRoot + '/lib/uploadplugin',
      doZipPlugin: function(gulp) {
        var pluginDir = testRoot + '/lib/uploadplugin';
        var pass = through.obj();
        var globStream = gs.create([pluginDir + '/**', '!' + pluginDir + '/**/README.md', '!' + pluginDir + '/**/*.example']);

        return globStream.pipe(pass);
      },
      fs: fsMock
    });

    pluginUpload(gulp, gutil).upload(server, { debugMode: true }, cb);
  }

  before(function() {
    sandbox = sinon.sandbox.create();
    gulp = sandbox.stub();
  });

  beforeEach(function() {
    nock.cleanAll();
    server = createDefaultServerMock();
  });

  afterEach(function() {
    opts = undefined;
    server = undefined;
    answers = undefined;
    path = undefined;
    returnFileName = undefined;
    // restore the environment as it was before
    sandbox.restore();
  });

  after(function() {
    fs.unlinkSync(testRoot + '/lib/uploadplugin/Manifest.MF');
  });

  describe('errors during upload', function() {
    it('should return anonymous user error', function(done) {
      uploadPlugin(done,
        { anonymous: true },
        {
          cb: function(err) {
            //console.log(err);
            expect(err.message).to.contain('server returned status code 403');
            done();
          }
        });
    });

    it('should return hardfailures', function(done) {
      uploadPlugin(done,
        { hardfailures: true },
        {
          cb: function(err) {
            //console.log(err);
            expect(err.message).to.equal('Plugin upload failed');
            done();
          }
        });
    });
  });

  describe('upload sdk plugin', function() {
    it('should upload my sdk plugin', function(done) {
      uploadPlugin(done,
        { callResult: 'Plugin uploaded successfully' });
    });

    it('should upload my sdk plugin verbosely', function(done) {
      uploadPlugin(done,
        { callResult: 'Plugin uploaded successfully' },
        { debugMode: true, allowStudioOverrides: true});
    });

    it('should upload my sdk plugin strictly', function(done) {
      uploadPlugin(done,
        { callResult: 'Plugin uploaded successfully' },
        { strictMode: true, allowStudioOverrides: false });
    });

    it('dry run', function(done) {
      uploadPlugin(done,
        { callResult: 'Plugin uploaded successfully' },
        { dryRun: true, allowStudioOverrides: true, strictMode:true });
    });
  });

});