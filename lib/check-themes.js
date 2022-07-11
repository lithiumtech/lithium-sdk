'use strict';

var request = require('request');
var pluginUtils = require('../lib/plugin-utils');
var putils = require('./plugin-utils');
let themesEnabledMap = new Map();
const themesArray = ['theme_base', 'theme_support', 'theme_hermes', 'theme_marketing'];
var themesCount = 0;

module.exports = function (gulp, gutil) {

  function validate(serverUrl, pluginToken, opts, cb, errorCallback) {
    var options = {
      headers: {
        Authorization: 'Bearer ' + pluginToken
      },
      rejectUnauthorized: false
    };
    
    for(const theme of themesArray) {
      var themeEnabledCheckUrl = pluginUtils.urlBldr(serverUrl + '/restapi/ldntool/plugins/checkThemeEnabled?format=json').query("themeId", theme).build();
      if (opts.debugMode) {
        putils.logDebug(gutil, 'making theme enabled check call to ' + themeEnabledCheckUrl);
        putils.logDebug(gutil, 'theme enabled check callOpts: ' + JSON.stringify(options));
      }
      request(themeEnabledCheckUrl, options, function (error, response, body) {
        if (opts.debugMode) {
          putils.logDebug(gutil, 'response from theme enabled check: \n' + body);
        }
        if (error || response.statusCode > 201) {
          process.exitCode = 1;
          putils.logError(gutil, 'got an error when trying to make the call: \n' + error);
          parseResponse(body, opts, errorCallback, theme);
          return;
        }
        try {
          var themeEnabledCheckResponse = parseResponse(body, opts, errorCallback, theme);
          themesCount++;
          
          //On success invoke callback function
          if (themesCount == 4 && typeof cb === 'function') {
            return cb();
          }
        } catch (error) {
          process.exitCode = 1;
          callbackOrThrowError(errorCallback, error.message);
        }

      });
    }
  }

  function process(server, opts, cb, errorCallback) {
    if (server.serverUrl() === undefined) {
      var errMessage = 'A server URL is required in your configuration. ';
      callbackOrThrowError(errorCallback, errMessage);
    }
    validate(server.serverUrl(), server.pluginToken(), opts, cb, errorCallback);
  }

  function callbackOrThrowError(cb, errorMsg) {
    if (typeof cb === 'function') {
      cb(new Error(errorMsg), null);
    } else {
      var error = new Error(errorMsg);
      Error.captureStackTrace(error, callbackOrThrowError);
      throw error;
    }
  }

  function parseResponse(body, opts, errorCallback, themeId) {
    var errorMessage = 'Empty theme enabled check response';
    var badResponseErrMessage = 'Invalid response from server. Check your server url and version.';
    if ( !body ) {
      process.exitCode = 1;
      pluginUtils.logError(gutil, badResponseErrMessage);
      callbackOrThrowError(errorCallback, badResponseErrMessage);
      return;
    }

    var responseBody;
    try {
      responseBody = JSON.parse(body);
    } catch (error) {
      process.exitCode = 1;
      pluginUtils.logError(gutil, badResponseErrMessage);
      callbackOrThrowError(errorCallback, badResponseErrMessage);
      return;
    }
    if (!responseBody.isThemeEnabled) {
      process.exitCode = 1;
      pluginUtils.logError(gutil, errorMessage);
      callbackOrThrowError(errorCallback, errorMessage);
      return;
    }
    var themeEnabledCheckResponse = responseBody;
    if (typeof themeEnabledCheckResponse !== 'undefined' && 'status' in themeEnabledCheckResponse && 'OK' === themeEnabledCheckResponse.status ) {
      themesEnabledMap.set(themeId, themeEnabledCheckResponse.isThemeEnabled);
      return themeEnabledCheckResponse.isThemeEnabled;
    }
    process.exitCode = 1;
    pluginUtils.logError(gutil, errorMessage);
    throw new Error(badResponseErrMessage);
  }

  function getThemeEnabled() {
    return themesEnabledMap;
  }

  return {
    process: function (server, opts, cb, errorCallback) {
      process(server, opts, cb, errorCallback);
    },
    validate: function (serverUrl, pluginToken, opts, cb, errorCallback) {
      validate(serverUrl, pluginToken, opts, cb, errorCallback);
    },
    themesEnabledMap: themesEnabledMap,
    getThemeEnabled: getThemeEnabled
  };
};