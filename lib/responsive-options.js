/**
 * Library methods for getting/setting responsive options
 *
 * @author Doug Schroeder
 */

'use strict';

var fs = require('fs');
var path = require('path');
var request = require('request');
var through = require('through2');
var putils = require('./plugin-utils');

module.exports = function (gulp, gutil) {

  function handleRequest(server, opts, cb) {
    putils.logInfoHighlighted(gutil, opts.doPut ? 'POSTing' : 'GETing' + ' responsive options');
    var useVerboseMode = opts.verboseMode || server.verbose();
    opts.pluginType = 'responsive';
    var callOpts = {};
    var pluginApiUrl = putils.getPluginBaseUrl(gutil, server, opts, callOpts, useVerboseMode).build();
    var req;

    if (opts.doPut) {
      callOpts.headers['Content-Type'] = 'application/json';
      var postOpts = {
        headers: callOpts.headers,
        url: pluginApiUrl,
        body: {
          dev_skin: opts.skinOpts
        },
        json: true,
        rejectUnauthorized: callOpts.rejectUnauthorized
      };
      if (opts.debugMode) {
        putils.logDebug(gutil, 'postOpts: ' + JSON.stringify(postOpts));
      }
      req = request.post(postOpts);
    } else {
      var getOpts = {
        headers: callOpts.headers,
        url: pluginApiUrl,
        rejectUnauthorized: callOpts.rejectUnauthorized
      };
      if (opts.debugMode) {
        putils.logDebug(gutil, 'getOpts: ' + JSON.stringify(getOpts));
      }
      req = request.get(getOpts);
    }

    return processResponse(req, opts, cb);
  }

  function processResponse(req, opts, cb) {
    var all = [];
    var dataLen = 0;
    var res;
    var ended = false;

    function onData(chunk, enc, callback) {
      all.push(chunk);
      dataLen += chunk.length;
      return callback(null);
    }

    function onEnd() {
      ended = true;
      var buf = new Buffer(dataLen);
      for (var i=0, len = all.length, pos = 0; i < len; i++) {
        all[i].copy(buf, pos);
        pos += all[i].length;
      }

      if (opts.doPut) {
        return logPostSuccess(res, buf);
      } else {
        return writeResponsiveOptions(res, buf);
      }
    }

    function writeError(serviceResponse, scriptName, cb) {
      putils.logHardFailures(serviceResponse, gutil, scriptName);
      var errorMsg = 'Error making request to ' + (opts.doPut ? 'save' : 'get') + ' responsive options';

      return callbackOrThrowErrorMessage(cb, putils.logError(gutil, errorMsg));
    }

    function getResponse(buf) {
      if (opts.debugMode) {
        putils.logDebug(gutil, 'response: \n' + buf.toString());
      }
      return JSON.parse(buf.toString());
    }

    function handleResponse(res, buf, cb) {
      var respBody = null;
      try {
        respBody = getResponse(buf);
        if (res.statusCode > 201) {
          putils.logErrorResponseStatusCode(gutil, res);
          return writeError(respBody, 'responsive-' + opts.pluginType + '-plugin', cb);
        } else if (respBody.status.toLowerCase() === 'error') {
          return writeError(respBody, 'responsive-' + opts.pluginType + '-plugin', cb);
        } else {
         return cb(null, respBody);
        }
      } catch (err) {
        if (res.statusCode > 201) {
          putils.logErrorResponseStatusCode(gutil, res);
        } else {
          putils.logError(gutil, err.message);
        }

        var errorMsg = opts.pluginType + ' failed. ' + err.message;
        return writeError(respBody, errorMsg, cb);
      }
    }

    function logPostSuccess(res, buf) {
      handleResponse(res, buf, function(err) {
        if (err) return callbackOrThrowError(cb, err);

        var successMsg = 'set resonsive options';
        putils.logSuccess(gutil, successMsg);
        if (typeof cb === 'function') {
          return cb(null, successMsg);
        }
      });
    }

    function writeResponsiveOptions(res, buf) {
      return handleResponse(res, buf, function(err, respBody) {
        if (err) return callbackOrThrowError(cb, err);

        var responsiveConfig = {};
        responsiveConfig.features = respBody.features;
        responsiveConfig.feature = respBody.feature;
        responsiveConfig.skins = respBody.skins;
        responsiveConfig.skin = respBody.skin;
        responsiveConfig.dev_skin = respBody.dev_skin;

        if (!fs.existsSync(opts.configDir)){
          fs.mkdirSync(opts.configDir);
        }

        var responsiveConfigPath = getConfigFilePath(opts);
        if (opts.debugMode) {
          putils.logDebug(gutil, 'writing out responsive options to ' + responsiveConfigPath);
        }
        fs.writeFile(responsiveConfigPath, JSON.stringify(responsiveConfig), function(err) {
          if (err) return callbackOrThrowError(cb, err);

          var successMsg = 'saved ' + responsiveConfigPath;
          putils.logSuccess(gutil, successMsg);
          if (typeof cb === 'function') {
            return cb(null, responsiveConfig, successMsg);
          }
        });
      });
    }

    var stream = through(onData).on('finish', onEnd);
    req.on('response', function (resp) {
      if (resp.statusCode > 201) {
        callbackOrThrowErrorMessage(cb, new Error(putils.logErrorResponseStatusCode(gutil, resp)));
      } else {
        res = resp;
        resp.pipe(stream);
      }
    }).on('error', function(err) {
      var errorMsg = putils.logRequestError(gutil, opts.doPut ? 'save responsive options' : 'get responsive options', err);
      callbackOrThrowErrorMessage(cb, errorMsg);
    });

    return stream;
  }

  function callbackOrThrowErrorMessage(cb, errorMsg) {
    return callbackOrThrowError(cb, new Error(errorMsg));
  }

  function callbackOrThrowError(cb, err) {
    if (typeof cb === 'function') {
      return cb(err, null);
    } else {
      throw err;
    }
  }

  function getConfigFilePath(opts) {
    if (opts.debugMode) {
      putils.logDebug(gutil, 'opts.configDir: ' + opts.configDir);
    }
    if (!fs.existsSync(opts.configDir)){
      fs.mkdirSync(opts.configDir);
    }

    return opts.configDir + '/responsive.conf.json';
  }

  function getConfig(opts) {
    var configFilePath = getConfigFilePath(opts);
    if (fs.existsSync(configFilePath)) {
      var configJson = fs.readFileSync(configFilePath);
      return JSON.parse(configJson);
    }

    throw new Error('no responsive config found at ' + configFilePath);
  }

  function putOptions(server, opts, cb) {
    opts.body = {};
    if (typeof opts.skinOpts != 'undefined') {
      opts.body.dev_skin = opts.skinOpts;
    }
    opts.doPut = true;
    return handleRequest(server, opts, function(err) {
      if (err) return callbackOrThrowError(cb, err)

      opts.noCache = true;
      return getOptions(server, opts, cb);
    });
  }

  function getOptions(server, opts, cb) {
    opts.doPut = false;
    if (typeof opts.noCache == 'undefined') {
      opts.noCache = false;
    }

    var configFilePath = getConfigFilePath(opts);
    if (opts.noCache || !fs.existsSync(configFilePath)) {
     return handleRequest(server, opts, function(err, config, successMsg) {
       if (err) return callbackOrThrowError(cb, err)

        return cb(null, getConfig(opts), successMsg);
      });
    } else {
      return cb(null, getConfig(opts), 'found configs/responsive.conf.json');
    }
  }

  return {
    putOptions: putOptions,
    getOptions: getOptions
  };
};