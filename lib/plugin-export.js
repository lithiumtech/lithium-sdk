'use strict';

var AdmZip = require('adm-zip');
var request = require('request');
var through = require('through2');
var path = require('path');
var putils = require('./plugin-utils');

module.exports = function (gulp, gutil) {

  function exportPlugin(server, opts, pluginPointAnswers, cb) {
    var useVerboseMode = opts.verboseMode || server.verbose();
    var callOpts = {};
    var pluginDownloadUrlBld = putils.getPluginBaseUrl(gutil, server, opts, callOpts, useVerboseMode);

    if (typeof pluginPointAnswers != 'undefined') {
      pluginPointAnswers.pluginPoints.forEach(function (pluginPoint) {
        pluginDownloadUrlBld = pluginDownloadUrlBld.query('plugin_point', pluginPoint);
      });
    }

    var pluginDownloadUrl = pluginDownloadUrlBld.build();

    if (opts.debugMode) {
      putils.logDebug(gutil, 'making call to ' + pluginDownloadUrl);
      putils.logDebug(gutil, 'callOpts: ' + JSON.stringify(callOpts));
    }

    var req = opts.doClear ? request.post(pluginDownloadUrl, callOpts) : request.get(pluginDownloadUrl, callOpts);

    return processResponse(req, opts, useVerboseMode, cb);
  }

  function processResponse(req, opts, useVerboseMode, cb) {
    var all = [];
    var dataLen = 0;
    var res;

    function onData(chunk, enc, callback) {
      all.push(chunk);
      dataLen += chunk.length;
      return callback(null);
    }

    function onEnd() {
      var buf = new Buffer(dataLen);
      for (var i=0, len = all.length, pos = 0; i < len; i++) {
        all[i].copy(buf, pos);
        pos += all[i].length;
      }

      if (opts.doClear) {
        return clearZip(res, buf);
      } else {
        return writeZip(res, buf);
      }
    }

  	function writeError(serviceResponse, scriptName, cb) {
	    putils.logHardFailures(serviceResponse, gutil, scriptName);
      var errorMsg = opts.pluginType + ' plugin export failed';
      handleErrorCallback(cb, new Error(errorMsg));
    }

    function addOutputDir(dirName, outputToBase) {
      if (typeof dirName !== 'undefined' && dirName.trim().length > 0) {
        return dirName;
      }

      return outputToBase;
    }

    function writeZip(res, buf) {
      try {
        if (res.statusCode > 201) {
          var serviceResponse = getResponse(buf);
          writeError(serviceResponse, 'export-' + opts.pluginType + '-plugin', cb);
        } else {
          var zip = new AdmZip(buf);
          var zipEntries = zip.getEntries();

          var outputToBase = addOutputDir(opts.sdkOutputDir, process.cwd());
          outputToBase = addOutputDir(opts.coreOutputDir, outputToBase);

          if (opts.debugMode) {
            putils.logDebug(gutil, 'writing ' + opts.pluginType + ' plugin out to ' + outputToBase);
          }

          zipEntries.forEach(function (zipEntry) {
            if (zipEntry.name !== 'Manifest.MF') {
              var entryPath = zipEntry.entryName;
              if (entryPath.indexOf('/') === 0) {
                entryPath = entryPath.substring(1, zipEntry.entryName.length);
              }

              entryPath = entryPath.substring(0, entryPath.length - zipEntry.name.length);

              var outputTo = path.join(outputToBase, entryPath);
              if (useVerboseMode) {
                putils.logInfo(gutil, 'downloading ' + zipEntry.entryName + ' > ' + outputTo);
              }
              zip.extractEntryTo(zipEntry.entryName, outputTo, false, true);
            }
          });

          var successMsg = opts.pluginType + ' plugin downloaded successfully';
          putils.logSuccess(gutil, successMsg);
          handleCallback(cb);
        }
      } catch (err) {
        if (res.statusCode > 201) {
          putils.logErrorResponseStatusCode(gutil, res);
        } else {
          logError(err.message);
        }
        handleErrorCallback(cb, new Error(logError(opts.pluginType + ' plugin write failed')));
      }
    }

    function logError(errorMsg) {
      return putils.logError(gutil, errorMsg);
    }

    function handleCallback(cb) {
      if (typeof cb != 'undefined') {
        cb();
      }
    }

    function handleErrorCallback(cb, err) {
      if (typeof cb != 'undefined') {
        cb(err);
      }
    }

    function getResponse(buf) {
      var resp = buf.toString();
      if (opts.debugMode) {
        putils.logDebug(gutil, 'serviceResponse: ' + resp);
      }
      var serviceResponse = JSON.parse(resp);
      if (serviceResponse['service-response']) {
        serviceResponse = serviceResponse['service-response'];
      }

      return serviceResponse;
    }

    function clearZip(res, buf) {
      try {
        var serviceResponse = getResponse(buf);
        if (res.statusCode > 201) {
          putils.logErrorResponseStatusCode(gutil, res);
	        writeError(serviceResponse, 'clear-' + opts.pluginType + '-plugin', cb);
        } else if (serviceResponse.status === 'CLEAR_FAILED') {
	        writeError(serviceResponse, 'clear-' + opts.pluginType + '-plugin', cb);
        } else {
	        putils.logSoftFailures(serviceResponse, gutil);
          var touchedPaths;
          if (useVerboseMode) {
            if (serviceResponse.hasOwnProperty('touchedPaths')) {
              touchedPaths = serviceResponse['touchedPaths'];
            } else if (serviceResponse.hasOwnProperty('touched-paths')) {
              touchedPaths = serviceResponse['touched-paths'];
            }
		        if (!Array.isArray(touchedPaths)) {
              touchedPaths = new Array(touchedPaths);
            }

            touchedPaths.forEach(function(touchedPath) {
              if (typeof touchedPath !== 'undefined') {
                putils.logInfo(gutil, 'cleared ' + touchedPath);
              }
            });
          }

          var successMsg = opts.pluginType + ' Plugin cleared successfully';
          putils.logSuccess(gutil, successMsg);
          if (typeof cb != 'undefined') {
            cb(touchedPaths);
          }
        }
      } catch (err) {
        if (res.statusCode > 201) {
          putils.logErrorResponseStatusCode(gutil, res);
        } else {
          logError(err.message);
        }
        handleErrorCallback(cb, new Error(logError(opts.pluginType + ' plugin clear failed')));
      }
    }

    var stream = through(onData).on('end', onEnd);

    req.on('response', function (resp) {
        res = resp;
        resp.pipe(stream);
    }).on('error', function(err) {
      handleErrorCallback(cb, new Error(putils.logRequestError(gutil, opts.doClear ? 'clear' : 'export', err)));
    });

    return stream;
  }

  return {
    exportPlugin: function (server, opts, answers, cb) {
      putils.logInfoHighlighted(gutil, opts.doClear ? 'Clearing ' : 'Exporting ' + opts.pluginType + ' plugin');
      		
      return exportPlugin(server, opts, answers, cb);
    },
    exportCorePlugin: function(server, opts, answers, cb) {
      opts.pluginType = 'core';

      return exportPlugin(server, opts, answers, cb);
    }
  };
};