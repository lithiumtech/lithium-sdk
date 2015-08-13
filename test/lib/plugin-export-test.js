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
var gutil = require('gulp-util');
var testRoot = path.resolve(__dirname) + '/..';

var apiHost = 'https://mycommunity.com:443';

function createExportRequestScope(path, zipFileName) {
  return nock(apiHost).persist()
    .get(path)
    .reply(201, function() {
      return fs.createReadStream(testRoot + '/lib/replies/' + zipFileName + '.zip');
    }, {
      'Content-Type': 'archive/zip',
      'Content-Disposition': 'attachment; filename="' + zipFileName + '.zip"'
    });
}

function createXmlResponseRequestScope(path, responseFileName) {
  return nock(apiHost).persist()
    .post(path)
    .replyWithFile(200, testRoot + '/lib/replies/' + responseFileName + '.xml');
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
    serverUrl: 'https://mycommunity.com',
    strictMode: false,
    verbose: false
  });
}

describe('test exporting plugin', function() {
  this.slow(500);
  var sandbox;
  var pluginExport;
  var exportedFiles;
  var gulp;
  var server;

  function exportPlugin(pluginType, done, expectedLength) {
    var opts = {
      pluginType: pluginType,
      doClear: false,
      verboseMode: false,
      debugMode: false,
      sdkOutputDir: undefined
    };

    createExportRequestScope('/restapi/ldntool/plugins/' + pluginType, pluginType + '_plugin');

    pluginExport(gulp, gutil).exportPlugin(server, opts, undefined, function() {
      expect(exportedFiles.length).to.equal(expectedLength);
      done();
    });
  }

  function clearPlugin(pluginType, done) {
    var opts = {
      pluginType: pluginType,
      doClear: true,
      verboseMode: false,
      debugMode: false,
      sdkOutputDir: undefined
    };

    createXmlResponseRequestScope('/restapi/ldntool/plugins/' + pluginType + '/clear', pluginType + '_clear');

    pluginExport(gulp, gutil).exportPlugin(server, opts, undefined, function() {

      done();
    });
  }

  before(function() {
    sandbox = sinon.sandbox.create();
    gulp = sandbox.stub();
    server = createDefaultServerMock();
    pluginExport = rewire(testRoot + '/../lib/plugin-export.js');
    pluginExport.__set__("AdmZip", function(input) {
      var admZip = new AdmZip(input);
      return {
        getEntries: function() {
          return admZip.getEntries();
        },
        extractEntryTo: function(entry, targetPath, maintainEntryPath, overwrite) {
          exportedFiles.push(entry);
        }
      };
    });
  });

  beforeEach(function() {
    exportedFiles = [];
  });

  afterEach(function() {
    // restore the environment as it was before
    sandbox.restore();
  });

  after(function() {
  });

  describe('export studio plugin', function() {
    it('should export my studio plugin', function(done) {
      exportPlugin('studio', done, 96);
    });
  });

  describe('export sdk plugin', function() {
    it('should export my sdk plugin', function(done) {
      exportPlugin('sdk', done, 8);
    });
  });

  describe('clear studio plugin', function() {
    it('should clear my studio plugin', function(done) {
      clearPlugin('studio', done);
    });
  });

  describe('clear sdk plugin', function() {
    it('should clear my studio plugin', function(done) {
      clearPlugin('sdk', done);
    });
  });
});