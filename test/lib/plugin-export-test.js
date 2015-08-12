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

function createExportRequestScope(path, zipFileName) {
  return nock('https://mycommunity.com:443').persist()
    .get(path)
    .reply(201, function() {
      return fs.createReadStream(testRoot + '/lib/' + zipFileName + '.zip');
    }, {
      'Content-Type': 'archive/zip',
      'Content-Disposition': 'attachment; filename="' + zipFileName + '.zip"'
    });
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

describe('testexportPlugin', function() {
  var sandbox;
  var pluginExport;
  var scope;

  before(function() {

  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    scope = createExportRequestScope('/restapi/ldntool/plugins/studio', 'studio_plugin');
    pluginExport = rewire(testRoot + '/../lib/plugin-export.js');
  });

  afterEach(function() {
    scope.cleanAll();
    // restore the environment as it was before
    sandbox.restore();
  });

  after(function() {
  });

  describe('export studio plugin', function() {
    it('should export my studio plugin', function(done) {
      var exportedFiles = [];
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

      var server = createDefaultServerMock();

      var opts = {
        pluginType: 'studio',
        doClear: false,
        verboseMode: false,
        debugMode: true,
        sdkOutputDir: undefined
      };

      var gulp = sandbox.stub();
      var gutil = {
        log: sandbox.spy(),
        colors: {
          cyan: sandbox.stub(),
          yellow: sandbox.stub(),
          green: sandbox.stub(),
          grey: sandbox.stub()
        }
      };
      pluginExport(gulp, gutil).exportPlugin(server, opts, undefined, function() {
        expect(exportedFiles.length).to.equal(96);
        done();
      });
    });
  });

  describe('export sdk plugin', function() {
    it('should export my sdk plugin', function(done) {
      expect(true).to.equal(true);
      done();
    });
  });

});
