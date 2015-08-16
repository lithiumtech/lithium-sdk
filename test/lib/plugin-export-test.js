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
var testRoot = path.resolve(__dirname) + '/..';
var gutil = require('gulp-util');
var apiHost = 'https://mycommunity.com:443';

function defined(obj) {
  return typeof obj !== 'undefined';
}

function createExportRequestScope(path, zipFileName) {
  return nock(apiHost)
    .log(console.log)
    .get(path)
    .reply(201, function() {
      return fs.createReadStream(testRoot + '/lib/replies/' + zipFileName + '.zip');
    }, {
      'Content-Type': 'archive/zip',
      'Content-Disposition': 'attachment; filename="' + zipFileName + '.zip"'
    });
}

function createExportErrorResponseScope(path, statusCode, error) {
  return nock(apiHost)
    .log(console.log)
    .get(path)
    .replyWithFile(statusCode, testRoot + '/lib/replies/error_' + error + '.xml');
}

function createClearResponseRequestScope(path, responseFileName) {
  return nock(apiHost)
    .log(console.log)
    .post(path)
    .replyWithFile(200, testRoot + '/lib/replies/' + responseFileName + '.xml');
}

function createErrorRequestScope(path, errMsg, isPost) {
  var scope = nock(apiHost).log(console.log);
  return isPost ? scope.post(path).replyWithError(errMsg) : scope.get(path).replyWithError(errMsg);
}

function createClearErrorResponseScope(path, statusCode, error) {
  return nock(apiHost)
    .log(console.log)
    .post(path)
    .replyWithFile(statusCode, testRoot + '/lib/replies/error_' + error + '.xml');
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
    verbose: false
  }, options);
}

describe('test exporting plugin', function() {
  this.slow(500);
  var sandbox;
  var pluginExport;
  var exportedFiles;
  var clearedFiles;
  var gulp;
  var server;
  var answers;
  var path;
  var returnFileName;
  var opts;

  function processOptions(doClear, options) {
    if (defined(options)) {
      if (defined(options.doRecord) && options.doRecord) {
        nock.recorder.rec();
      }

      if (doClear && defined(options.verboseMode) && options.verboseMode) {
        path = path + (path.indexOf('?') > -1 ? '&' : '?') + 'lar.verbose=true';
      }

      if (defined(options.fileNameSuffix)) {
        returnFileName = returnFileName + '_' + options.fileNameSuffix;
        var pointsStr = options.fileNameSuffix.replace(/_/g, ',');
        var points = pointsStr.split(',');
        answers = {pluginPoints: points};
        server = createServerMock({
          //community: '',
          dryRun: false,
          force: false,
          pluginPoints: points,
          pluginToken: 'c95a3357-baed-4f09-9596-86583189b33e',
          serverUrl: 'https://mycommunity.com',
          strictMode: false,
          verbose: false
        }, options);
        points.forEach(function (pluginPoint) {
          path = path + (path.indexOf('?') > -1 ? '&' : '?') + 'plugin_point=' + pluginPoint;
        });
      }

      Object.keys(options).forEach(function(key) {
        opts[key] = options[key];
      });
    }
  }

  function exportPlugin(pluginType, done, expects, options) {
    opts = {
      pluginType: pluginType,
      doClear: false,
      verboseMode: false,
      debugMode: false,
      sdkOutputDir: undefined
    };

    path = '/restapi/ldntool/plugins/' + pluginType;
    returnFileName = pluginType + '_plugin';

    processOptions(false, options);

    if (expects.requestError) {
      createErrorRequestScope(path, 'something bad happened', false);
    } else if (expects.anonymous) {
      createExportErrorResponseScope(path, 403, 'export_anonymous_user');
    } else if (expects.hardfailures) {
      createExportErrorResponseScope(path, 403, 'export_hardfailures');
    } else {
      createExportRequestScope(path, returnFileName);
    }

    var cb = defined(opts.cb) ? opts.cb : function() {
      expect(exportedFiles.length).to.equal(expects.itemCount);
      done();
    };

    pluginExport(gulp, gutil).exportPlugin(server, opts, answers, cb);
  }

  function clearPlugin(pluginType, done, expects, options) {
    opts = {
      pluginType: pluginType,
      doClear: true,
      verboseMode: false,
      debugMode: false,
      sdkOutputDir: undefined
    };

    path = '/restapi/ldntool/plugins/' + pluginType + '/clear';
    returnFileName = pluginType + '_clear';

    processOptions(true, options);
    if (expects.requestError) {
      createErrorRequestScope(path, 'something bad happened', true);
    } else if (expects.anonymous) {
      createClearErrorResponseScope(path, 403, 'clear_anonymous_user');
    } else if (expects.hardfailures) {
      createClearErrorResponseScope(path, 403, 'clear_hardfailures');
    } else {
      createClearResponseRequestScope(path, returnFileName);
    }

    var cb = defined(opts.cb) ? opts.cb : function(touchedPaths) {
      if (opts.verboseMode) {
        expect(touchedPaths.length).to.equal(expects.itemCount);
      }
      done();
    };

    pluginExport(gulp, gutil).exportPlugin(server, opts, answers, cb);
  }

  before(function() {
    sandbox = sinon.sandbox.create();
    gulp = sandbox.stub();
    pluginExport = rewire(testRoot + '/../lib/plugin-export.js');
    pluginExport.__set__("AdmZip", function(input) {
      var admZip = new AdmZip(input);
      return {
        getEntries: function() {
          return admZip.getEntries();
        },
        extractEntryTo: function(entry) {
          exportedFiles.push(entry);
        }
      };
    });
  });

  beforeEach(function() {
    nock.cleanAll();
    clearedFiles = [];
    exportedFiles = [];
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
  });

  describe('errors during export', function() {
    it('should return anonymous user error', function(done) {
      exportPlugin('studio', done,
        { anonymous: true },
        {
          cb: function(err) {
            //console.log(err);
            expect(err.message).to.equal('studio plugin write failed');
            done();
          }
        });
    });

    it('should return hardfailures', function(done) {
      exportPlugin('studio', done,
        { hardfailures: true },
        {
          cb: function(err) {
            //console.log(err);
            expect(err.message).to.equal('studio plugin write failed');
            done();
          }
        });
    });
  });

  describe('errors during clear', function() {
    it('should return anonymous user error', function(done) {
      clearPlugin('studio', done,
        { anonymous: true },
        {
          cb: function(err) {
            //console.log(err);
            expect(err.message).to.equal('studio plugin clear failed');
            done();
          }
        });
    });

    it('should return hardfailures', function(done) {
      clearPlugin('studio', done,
        { hardfailures: true },
        {
          cb: function(err) {
            //console.log(err);
            expect(err.message).to.equal('studio plugin clear failed');
            done();
          }
        });
    });
  });

  describe('request errors', function() {
    it ('should return request error during export', function(done) {
      exportPlugin('studio', done,
        { requestError: true },
        {
          cb: function(err) {
            //console.log(err);
            expect(err.message).to.contain('Possible SSL configuration issue, or the site may be down');
            done();
          }
        });
    });

    it ('should return request error during clear', function(done) {
      clearPlugin('studio', done,
        { requestError: true },
        {
          cb: function(err) {
            //console.log(err);
            expect(err.message).to.contain('Possible SSL configuration issue, or the site may be down');
            done();
          }
        });
    });
  });

  describe('export studio plugin', function() {
    it('should export my studio plugin', function(done) {
      exportPlugin('studio', done,
        { itemCount: 96 });
    });

    it('should export my studio plugin verbosely', function(done) {
      exportPlugin('studio', done,
        { itemCount: 96 },
        { verboseMode: true, debugMode: true});
    });
  });

  describe('export partial studio plugin', function() {
    it('should export my studio plugin', function(done) {
      exportPlugin('studio', done,
        { itemCount: 23 },
        { fileNameSuffix: 'asset_component_quilt', doRecord: false });
    });

    it('should export my studio plugin verbosely', function(done) {
      exportPlugin('studio', done,
        { itemCount: 23 },
        { fileNameSuffix: 'asset_component_quilt', doRecord: false, verboseMode: true, debugMode: true });
    });
  });

  describe('export sdk plugin', function() {
    it('should export my sdk plugin', function(done) {
      exportPlugin('sdk', done,
        { itemCount: 8 });
    });

    it('should export my sdk plugin verbosely', function(done) {
      exportPlugin('sdk', done,
        { itemCount: 8 },
        { verboseMode: true, debugMode: true});
    });
  });

  describe('clear studio plugin', function() {
    it('should clear my studio plugin', function(done) {
      clearPlugin('studio', done,
        { itemCount: 0 });
    });

    it('should clear my studio plugin verbosely', function(done) {
      clearPlugin('studio', done,
        { itemCount: 4 },
        { verboseMode: true, debugMode: true});
    });
  });

  describe('clear partial studio plugin', function() {
    it('should clear my studio plugin', function(done) {
      clearPlugin('studio', done,
        { itemCount: 0 },
        { fileNameSuffix: 'asset_component_quilt', doRecord: false });
    });

    it('should clear my studio plugin verbosely', function(done) {
      clearPlugin('studio', done,
        { itemCount: 23 },
        { fileNameSuffix: 'asset_component_quilt', doRecord: false, verboseMode: true, debugMode: true });
    });
  });

  describe('clear sdk plugin', function() {
    it('should clear my sdk plugin', function(done) {
      clearPlugin('sdk', done,
        { itemCount: 0 });
    });

    it('should clear my sdk plugin verbosely', function(done) {
      clearPlugin('sdk', done,
        { itemCount: 1 },
        { verboseMode: true, debugMode: true});
    });
  });
});