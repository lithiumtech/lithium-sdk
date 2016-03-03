/**
 * Library methods for getting/setting responsive options
 *
 * @author Doug Schroeder
 */

'use strict';

var lazyReq = require('lazy-req')(require);
var fs = require('fs');
var readline = require('readline');
var path = require('path');
var request = require('request');
var inquirer = lazyReq('inquirer');
var putils = require('./plugin-utils');
var skinLib = require('./skin')();

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
        json: true
      };
      if (opts.debugMode) {
        putils.logDebug(gutil, 'postOpts: ' + JSON.stringify(postOpts));
      }
      req = request.post(postOpts);
    } else {
      var getOpts = {
        headers: callOpts.headers,
        url: pluginApiUrl
      };
      if (opts.debugMode) {
        putils.logDebug(gutil, 'getOpts: ' + JSON.stringify(getOpts));
      }
      req = request.get(getOpts);
    }

    return processResponse(req, opts, cb);
  }

  function processResponse(req, opts, cb) {
    function writeError(serviceResponse, scriptName) {
      putils.logHardFailures(serviceResponse, gutil, scriptName);
      var errorMsg = opts.pluginType + ' plugin ' + (opts.doPut ? 'post' : 'get') + ' failed';
      putils.logError(gutil, errorMsg);

      callbackOrThrowError(cb, errorMsg);
    }

    function getResponse(buf) {
      if (opts.debugMode) {
        putils.logDebug(gutil, 'response: \n' + buf.toString());
      }
      return JSON.parse(buf.toString());
    }

    function handleResponse(res, buf, fSuccessHandler) {
      try {
        var respBody = getResponse(buf);
        if (res.statusCode > 201) {
          putils.logErrorResponseStatusCode(gutil, res);
          writeError(respBody, 'responsive-' + opts.pluginType + '-plugin');
        } else if (respBody.status === 'ERROR') {
          writeError(respBody, 'responsive-' + opts.pluginType + '-plugin');
        } else {
         fSuccessHandler(respBody);
        }
      } catch (err) {
        if (res.statusCode > 201) {
          putils.logErrorResponseStatusCode(gutil, res);
        } else {
          putils.logError(gutil, err.message);
        }

        var errorMsg = opts.pluginType + ' failed';
        putils.logError(gutil, errorMsg);
        callbackOrThrowError(cb, errorMsg);
      }
    }

    function logPostSuccess(res, buf) {
      handleResponse(res, buf, function() {
        var successMsg = 'set resonsive options';
        putils.logSuccess(gutil, successMsg);
        if (typeof cb !== 'undefined') {
          return cb(null, successMsg);
        }
      });
    }

    function writeResponsiveOptions(res, buf) {
      handleResponse(res, buf, function(respBody) {
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
        fs.writeFile(responsiveConfigPath, JSON.stringify(responsiveConfig), function(err) {
          if (err) {
            return putils.logError(gutil, err.message);
          }
          var successMsg = 'saved ' + responsiveConfigPath;
          putils.logSuccess(gutil, successMsg);
          if (typeof cb !== 'undefined') {
            return cb(responsiveConfig);
          }
        });
      });
    }

    req.on('response', function (res) {
      var data = [], dataLen = 0;
      res.on('data', function(chunk) {
        data.push(chunk);
        dataLen += chunk.length;
      }).on('end', function() {
        var buf = new Buffer(dataLen);
        for (var i=0, len = data.length, pos = 0; i < len; i++) {
          data[i].copy(buf, pos);
          pos += data[i].length;
        }

        if (opts.doPut) {
          logPostSuccess(res, buf);
        } else {
          writeResponsiveOptions(res, buf);
        }
      });
    }).on('error', function(err) {
      var errorMsg = putils.logRequestError(gutil, opts.doPut ? 'post' : 'get', err);
      callbackOrThrowError(cb, errorMsg);
    });
  }

  function callbackOrThrowError(cb, errorMsg) {
    if (typeof cb !== 'undefined') {
      cb(new Error(errorMsg), null);
    } else {
      throw new Error(errorMsg);
    }
  }

  function getConfigFilePath(opts) {
    if (opts.debugMode) {
      putils.logDebug(gutil, 'opts.configDir ' + opts.configDir);
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
    handleRequest(server, opts, function() {
      opts.doPut = false;
      handleRequest(server, opts, cb);
    });
  }

  function getOptions(server, opts, cb) {
    opts.doPut = false;
    if (typeof opts.noCache == 'undefined') {
      opts.noCache = false;
    }

    var configFilePath = getConfigFilePath(opts);
    if (opts.noCache || !fs.existsSync(configFilePath)) {
      handleRequest(server, opts, function() {
        cb(getConfig(opts));
      });
    } else {
      cb(getConfig(opts));
    }
  }

  return {
    handleOptions: function(server, opts, cb) {
      if (opts.doPut) {
        putOptions(server, opts, cb);
      } else {
        getOptions(server, opts, cb);
      }
    },
    putOptions: putOptions,
    getOptions: getOptions,
    handleOptionsWithPrompt: function(server, cb) {
      if ((gutil.env['force'] || server.force()) && !gutil.env['prompt']) {
        var skinId = gutil.env['skin'];
        var port = gutil.env['port'];
        var anon = gutil.env['anon'];

        if (typeof skinId == 'undefined' || typeof port == 'undefined') {
          throw new Error('must pass both --skin and --port parameters when using the --force flag');
        }

        putOptions(server, {
          skinOpts: {
            enabled: true,
            id: skinId,
            url: 'http://localhost:' + port + '/style/' + skinId + '.css',
            anonymous_viewing: (typeof anon != 'undefined')
          },
          verboseMode: gutil.env['verbose'],
          debugMode: gutil.env['debug'],
          configDir: gutil.env['configdir'] || server.configDir()
        }, cb);
      } else {
        getOptions(server, {
          skinOpts: {},
          verboseMode: gutil.env['verbose'],
          debugMode: gutil.env['debug'],
          configDir: gutil.env['configdir'] || server.configDir()
        }, function(config) {
          inquirer().prompt([
            {
              name: 'skinId',
              type: 'list',
              message: 'Select a skin id from the list.',
              choices: skinLib.getResponsiveSkinIds(config),
              default: function () {
                return 'responsive_peak'
              }
            },
            {
              name: 'port',
              type: 'input',
              message: function () {
                return 'Enter the Port you would like to serve the css on, or press enter to use the default';
              },
              validate: function (val) {
                console.log('val: ' + val);
                return putils.validate(val, /^[0-9]+$/);
              },
              default: function () {
                return '9000';
              }
            },
            {
              name: 'anonymous',
              message: 'Do you want to serve your responsive skin from your computer even when not logged into the community??',
              type: 'confirm',
              default: false
            }], function (answers) {
              putOptions(server, {
                skinOpts: {
                  enabled: true,
                  id: answers.skinId,
                  url: 'http://localhost:' + answers.port + '/styles/' + answers.skinId + '.css',
                  anonymous_viewing: answers.anonymous
                },
                verboseMode: gutil.env['verbose'],
                debugMode: gutil.env['debug'],
                configDir: gutil.env['configdir'] || server.configDir()
              }, function() {});
          });
        });
      }
    }
  };
};