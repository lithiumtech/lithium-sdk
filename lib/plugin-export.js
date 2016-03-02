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

  	function writeError(serviceResponse, scriptName) {
	    putils.logHardFailures(serviceResponse, gutil, scriptName);
      var errorMsg = opts.pluginType + ' plugin export failed';
      putils.logError(gutil, errorMsg);

      callbackOrThrowError(cb, errorMsg);
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
          writeError(serviceResponse, 'export-' + opts.pluginType + '-plugin');
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

          if (typeof cb !== 'undefined') {
           return cb(null, successMsg);
          }
        }
      } catch (err) {
        if (res.statusCode > 201) {
          putils.logErrorResponseStatusCode(gutil, res);
        } else {
          putils.logError(gutil, err.message);
        }
        var errorMsg = opts.pluginType + ' plugin write failed';
        putils.logError(gutil, errorMsg);
        callbackOrThrowError(cb, errorMsg);
      }
    }

    function callbackOrThrowError(cb, errorMsg) {
      if (typeof cb !== 'undefined') {
        cb(new Error(errorMsg), null);
      } else {
        throw new Error(errorMsg);
      }
    }

    function getResponse(buf) {
      var serviceResponse = JSON.parse(buf.toString());
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
	        writeError(serviceResponse, 'clear-' + opts.pluginType + '-plugin');
        } else if (serviceResponse.status === 'CLEAR_FAILED') {
	        writeError(serviceResponse, 'clear-' + opts.pluginType + '-plugin');
        } else {
	        putils.logSoftFailures(serviceResponse, gutil);
          var touchedPaths;
          if (useVerboseMode) {
		        touchedPaths = serviceResponse['touched-paths'];
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

          if (typeof cb !== 'undefined') {
            return cb(touchedPaths);
          }
        }
      } catch (err) {
        if (res.statusCode > 201) {
          putils.logErrorResponseStatusCode(gutil, res);
        } else {
          putils.logError(gutil, err.message);
        }

        var errorMsg = opts.pluginType + ' plugin clear failed';
        putils.logError(gutil, errorMsg);
        callbackOrThrowError(cb, errorMsg);
      }
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

        if (opts.doClear) {
          clearZip(res, buf);
        } else {
          writeZip(res, buf);
        }
      });
    }).on('error', function(err) {
      var errorMsg = putils.logRequestError(gutil, opts.doClear ? 'clear' : 'export', err);
      callbackOrThrowError(cb, errorMsg);
    });
  }

  return {
    exportPlugin: function (server, opts, answers, cb) {
      putils.logInfoHighlighted(gutil, opts.doClear ? 'Clearing' : 'Exporting' + opts.pluginType + ' plugin');
      		
      exportPlugin(server, opts, answers, cb);
    },
    exportCorePlugin: function(server, opts, answers, cb) {
      opts.pluginType = 'core';

      return exportPlugin(server, opts, answers, cb);
    }
  };
};