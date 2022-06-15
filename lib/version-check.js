'use strict';

var request = require('request');
var pluginUtils = require('../lib/plugin-utils');
var defaultVersion = require('./server-version.json');
var sdkVersion = '1.0.2';
var putils = require('./plugin-utils');
var fs = require('fs');
var path = require('path');

module.exports = function (gulp, gutil) {
  var versionPattern = /(\d+)\.(\d{0,2})*/i;
  var versionResponse;
  var skinsBaseDir = "res/skins";
  var supportedMinVersionForThemeCheck = '22.7';

  function isFile(path) {
    try {
      return fs.statSync(path).isFile();
    } catch (err) {
      return false;
    }
  }

  function validate(serverUrl, pluginToken, opts, cb, errorCallback) {

    var options = {
      headers: {
        Authorization: 'Bearer ' + pluginToken
      },
      rejectUnauthorized: false
    };
    var serverVersion = opts.version === undefined ? defaultVersion : opts.version;

    var versionCheckUrl = pluginUtils.urlBldr(serverUrl + '/restapi/ldntool/plugins/version?format=json').build();
    if (opts.debugMode) {
      putils.logDebug(gutil, 'making version check call to ' + versionCheckUrl);
      putils.logDebug(gutil, 'version check callOpts: ' + JSON.stringify(options));
    }
    request(versionCheckUrl, options, function (error, response, body) {
      if (opts.debugMode) {
        putils.logDebug(gutil, 'response from version check: \n' + body);
      }
      if (error || response.statusCode > 201) {
        process.exitCode = 1;
        putils.logError(gutil, 'got an error when trying to make the call: \n' + error);
        parseResponse(body, opts, errorCallback);
        return;
      }
      try {
        versionResponse = parseResponse(body, opts, errorCallback);
        var version = versionResponse.version;
        var matches = version.toString().match(versionPattern);
        if (!matches || matches.length < 3) {
          process.exitCode = 1;
          return callbackOrThrowError(errorCallback, 'Invalid version check response ' + version);
        }
        var versionOnServer = parseInt(matches[1]);
        var minorVersionOnServer = parseInt(matches[2]);
        if (versionOnServer < serverVersion.supportedVersionMajor ||
          (versionOnServer === serverVersion.supportedVersionMajor &&
          minorVersionOnServer < serverVersion.supportedVersionMinor)) {
          process.exitCode = 1;
          var errorMessage = 'Supported minimum version on server is ' + serverVersion.supportedVersionMajor +
            '.' + serverVersion.supportedVersionMinor + '.';
          pluginUtils.logError(gutil, errorMessage);
          errorMessage += ' Either contact support to get your stage server upgraded to version ' +
            serverVersion.supportedVersionMajor + '.' + serverVersion.supportedVersionMinor +
            ' or else downgrade your version of the sdk (Run npm install -g lithium-sdk@' + sdkVersion+')';
          return callbackOrThrowError(errorCallback, errorMessage);
        }

        //On success invoke callback function
        if (typeof cb === 'function') {
          return cb();
        }
      } catch (error) {
        process.exitCode = 1;
        return callbackOrThrowError(errorCallback, error.message);
      }

    });
  }

  function process(server, opts, cb, errorCallback) {
    if (server.serverUrl() === undefined) {
      var errMessage = 'A server URL is required in your configuration. ';
      callbackOrThrowError(errorCallback, errMessage);
    }
    validate(server.serverUrl(), server.pluginToken(), opts, cb, errorCallback);
  }

  function checkVersionForThemeCheck(server, opts, cb, errorCallback) {
    if (server.serverUrl() === undefined) {
      var errMessage = 'A server URL is required in your configuration. ';
      callbackOrThrowError(errorCallback, errMessage);
    }
    validate(server.serverUrl(), server.pluginToken(), opts, function() {
      var localSkins = fs.readdirSync(skinsBaseDir).forEach(function(file) {
        var skinDir = path.resolve(skinsBaseDir, file);
        var skinPropFilePath = path.resolve(skinDir, "skin.properties");
        if (isFile(skinPropFilePath)) {
          try {
            var fileVal = fs.readFileSync(skinPropFilePath).toString();
            if (fileVal.includes("theme") && versionResponse.version < supportedMinVersionForThemeCheck) {
              process.exitCode = 1;
              var errorMessage = 'Supported minimum version to download theme feature plugins is ' + supportedMinVersionForThemeCheck + '.';
              pluginUtils.logError(gutil, errorMessage);
              errorMessage += ' Either contact support to get your stage server upgraded to version ' +
                supportedMinVersionForThemeCheck +
                ' or else downgrade your version of the sdk (Run npm install -g lithium-sdk@' + sdkVersion+')';
              return callbackOrThrowError(errorCallback, errorMessage);
            }
          } catch (err) {
            return callbackOrThrowError(errorCallback, err);
          }
        }
      });
      if (typeof cb === 'function') {
        return cb();
      }
    }, errorCallback);

  }

  function callbackOrThrowError(cb, errorMsg) {
    if (typeof cb === 'function') {
      return cb(new Error(errorMsg), null);
    } else {
      var error = new Error(errorMsg);
      Error.captureStackTrace(error, callbackOrThrowError);
      throw error;
    }
  }

  function parseResponse(body, opts, errorCallback) {
    var errorMessage = 'Empty version check response';
    var badResponseErrMessage = 'Invalid response from server. Check your server url and version.';
    if ( !body ) {
      process.exitCode = 1;
      pluginUtils.logError(gutil, badResponseErrMessage);
      return callbackOrThrowError(errorCallback, badResponseErrMessage);
    }

    var responseBody;
    try {
      responseBody = JSON.parse(body);
    } catch (error) {
      process.exitCode = 1;
      pluginUtils.logError(gutil, badResponseErrMessage);
      return callbackOrThrowError(errorCallback, badResponseErrMessage);
    }
    if (!responseBody.version) {
      process.exitCode = 1;
      errorMessage = responseBody['service-response'] ? responseBody['service-response'].message :
        badResponseErrMessage;
      pluginUtils.logError(gutil, errorMessage);
      return callbackOrThrowError(errorCallback, errorMessage);
    }
    var versionResponse = responseBody;
    if (typeof versionResponse !== 'undefined' && 'status' in versionResponse && 'OK' === versionResponse.status ) {
      return versionResponse;
    }
    process.exitCode = 1;
    pluginUtils.logError(gutil, errorMessage);
    throw new Error(badResponseErrMessage);
  }

  function createVersion(versionStr) {
    var matches = versionStr.toString().match(versionPattern);
    if (!matches || matches.length < 3) {
      process.exitCode = 9;
      throw new Error('Invalid version=' + versionStr + '. Should be of format <major>.<minor> ');
    }

    var serverVersion = {
      supportedVersionMajor: matches[1],
      supportedVersionMinor: matches[2]
    };
    return serverVersion;
  }

  return {
    process: function (server, opts, cb, errorCallback) {
      process(server, opts, cb, errorCallback);
    },
    checkVersionForThemeCheck: function (server, opts, cb, errorCallback) {
      checkVersionForThemeCheck(server, opts, cb, errorCallback);
    },
    validate: function (serverUrl, pluginToken, opts, cb, errorCallback) {
      validate(serverUrl, pluginToken, opts, cb, errorCallback);
    },
    createVersion: createVersion
  };
};