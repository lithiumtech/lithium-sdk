'use strict';

var request = require('request');
var pluginUtils = require('../lib/plugin-utils');
var putils = require('./plugin-utils');

module.exports = function (gulp, gutil) {
  function checkThemeEnabled(serverUrl, pluginToken, opts, cb) {
    let options = {
      headers: {
        Authorization: 'Bearer ' + pluginToken
      },
      rejectUnauthorized: false,
      themeId: opts.themeId
    };

    const checkThemeEnabledUrl = pluginUtils.urlBldr(serverUrl + '/restapi/ldntool/plugins/checkThemeEnabled?format=json').query("themeId", opts.themeId).build();
    if (opts.debugMode) {
      putils.logDebug(gutil, 'making theme enabled check call to ' + checkThemeEnabledUrl);
      putils.logDebug(gutil, 'theme enabled check callOpts: ' + JSON.stringify(options));
    }
    request(checkThemeEnabledUrl, options, function (error, response, body) {
      if (opts.debugMode) {
        putils.logDebug(gutil, 'response from check theme enabled for themeId ' + opts.themeId + ': \n' + body);
      }
      if (error || response.statusCode > 201) {
        process.exitCode = 1;
        putils.logError(gutil, 'got an error when trying to make the call: \n' + error);
        parseResponse(body, opts, cb);
        return;
      }
      return parseResponse(body, opts, cb);
    });
  }

  function callbackOrThrowError(cb, errorMsg) {
    if (typeof cb === 'function') {
      cb(new Error(errorMsg), null);
    }
  }

  function parseResponse(body, opts, cb) {
    const badResponseErrMessage = "error during api call";
    if ( !body ) {
      process.exitCode = 1;
      pluginUtils.logError(gutil, badResponseErrMessage);
      callbackOrThrowError(cb, badResponseErrMessage);
      return;
    }

    var responseBody;
    try {
      responseBody = JSON.parse(body);
    } catch (error) {
      process.exitCode = 1;
      putils.logError(gutil, badResponseErrMessage);
      callbackOrThrowError(cb, badResponseErrMessage);
      return;
    }
    let checkThemeEnabledResponse = responseBody;
    if (typeof checkThemeEnabledResponse !== 'undefined' && 'status' in checkThemeEnabledResponse && 'OK' === checkThemeEnabledResponse.status ) {
      return cb(null, checkThemeEnabledResponse.isThemeEnabled, "success!");
    }
    process.exitCode = 1;
    pluginUtils.logError(gutil, badResponseErrMessage);
    throw new Error(badResponseErrMessage);
  }

  return {
    checkThemeEnabled: function (serverUrl, pluginToken, opts, cb) {
      checkThemeEnabled(serverUrl, pluginToken, opts, cb);
    }
  };
};