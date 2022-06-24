'use strict';

var pluginUtils = require('../lib/plugin-utils');
var putils = require('./plugin-utils');
let themesVersionMap = new Map();
var srequest = require('sync-request');

module.exports = function (gulp, gutil) {
  function checkThemeEnabled(serverUrl, pluginToken, opts, cb) {
    let options = {
      headers: {
        Authorization: 'Bearer ' + pluginToken
      },
      rejectUnauthorized: false,
      themeId: opts.themeId
    };
    if (themesVersionMap.has(opts.themeId)) {
      return cb(null, themesVersionMap.get(opts.themeId), "success!");
    }
    const checkThemeEnabledUrl = pluginUtils.urlBldr(serverUrl + '/restapi/ldntool/plugins/checkThemeEnabled?format=json').query("themeId", opts.themeId).build();
    if (opts.debugMode) {
      putils.logDebug(gutil, 'making theme enabled check call to ' + checkThemeEnabledUrl);
      putils.logDebug(gutil, 'theme enabled check callOpts: ' + JSON.stringify(options));
    }
    var response = srequest('GET', checkThemeEnabledUrl, options);
    var body = response.getBody();
    return parseResponse(body, opts, cb);
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
    if (opts.debugMode) {
      putils.logDebug(gutil, 'response from api call: {"isThemeEnabled": "' + responseBody.isThemeEnabled + '", "status": "' + responseBody.status + '"}');
    }
    let checkThemeEnabledResponse = responseBody;
    if (typeof checkThemeEnabledResponse !== 'undefined' && 'status' in checkThemeEnabledResponse && 'OK' === checkThemeEnabledResponse.status ) {
      themesVersionMap.set(opts.themeId, checkThemeEnabledResponse.isThemeEnabled);
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