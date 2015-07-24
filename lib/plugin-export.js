'use strict';

var AdmZip = require('adm-zip');
var request = require('request');
var through = require('through2');
var parser = require('xml2json');
var path = require('path');
var putils = require('./plugin-utils');

module.exports = function (gulp, gutil) {

  	function exportPlugin(server, opts, pluginPointAnswers) {
        var useVerboseMode = opts.verboseMode || server.verbose();
        if (opts.debugMode) {
            putils.logDebug(gutil, 'opts: ' + JSON.stringify(opts));
        }
        var callOpts = {
            headers: {
                Authorization: 'Bearer ' + server.pluginToken()
            },
            encoding: null
        };

        var pluginDownloadUrl;

        if (server.pluginUploadProtocol() === 'https') {
            callOpts.rejectUnauthorized = false;
            pluginDownloadUrl = server.serverUrlSecure();
        } else {
            pluginDownloadUrl = server.serverUrl();
        }
        if (server.community() !== undefined) {
            pluginDownloadUrl = pluginDownloadUrl + server.community();
        }
        var basePath = '/restapi/ldntool/plugins';
        if (opts.pluginType === 'sdk') {
            basePath = basePath + '/sdk';
        } else {
            basePath = basePath + '/studio';
        }
        if (opts.doClear) {
            basePath = basePath + '/clear';
        }
        var pluginDownloadUrlBld = putils.urlBldr(pluginDownloadUrl + basePath)
            .queryIf(server.strictMode(), 'lar.strict_mode', 'true');

        if (opts.doClear && useVerboseMode) {
            pluginDownloadUrlBld = pluginDownloadUrlBld.query('lar.verbose', true);
        }

        if (typeof pluginPointAnswers != 'undefined') {
            pluginPointAnswers.pluginPoints.forEach(function (pluginPoint) {
                pluginDownloadUrlBld = pluginDownloadUrlBld.query('plugin_point', pluginPoint);
            });
        }

        pluginDownloadUrl = pluginDownloadUrlBld.build();

        if (opts.debugMode) {
            putils.logDebug(gutil, 'making call to ' + pluginDownloadUrl);
            putils.logDebug(gutil, 'callOpts: ' + JSON.stringify(callOpts));
        }

        var req = opts.doClear ? request.post(pluginDownloadUrl, callOpts) : request.get(pluginDownloadUrl, callOpts);

        return processResponse(req, opts, useVerboseMode);
  	}

  	function processResponse(req, opts, useVerboseMode) {

  		function writeError(serviceResponse, scriptName) {
	    	putils.logHardFailures(serviceResponse, gutil, scriptName);
			putils.logError(gutil, 'Studio Plugin export failed');
			process.exit(1);
		}

		function writeZip(res, buf) {
    		try {
                if (res.statusCode > 201) {
                    var serviceResponse = JSON.parse(parser.toJson(buf.toString()))['service-response'];
                    writeError(serviceResponse, 'export-' + opts.pluginType + '-plugin');
                } else {
                    var zip = new AdmZip(buf);
                    var zipEntries = zip.getEntries();

                    var outputToBase = process.cwd();
                    if (typeof opts.sdkOutputDir !== 'undefined' && opts.sdkOutputDir.trim().length > 0) {
                        outputToBase = opts.sdkOutputDir;
                    }

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

                    var successMsg = 'Studio Plugin downloaded successfully';
                    putils.logSuccess(gutil, successMsg);

                    process.exit(1);
                }
            } catch (err) {
                if (res.statusCode > 201) {
                    putils.logErrorResponseStatusCode(gutil, res);
                } else {
                    putils.logError(gutil, err.message);
                }

                putils.logError(gutil, opts.pluginType + ' plugin write failed');

                process.exit(1);
            }
		}

		function clearZip(res, buf) {
			try {
				var serviceResponse = JSON.parse(parser.toJson(buf.toString()))['service-response'];
				if (res.statusCode > 201) {
                    putils.logErrorResponseStatusCode(gutil, res);
	        		writeError(serviceResponse, 'clear-' + opts.pluginType + '-plugin');
	        	} else if (serviceResponse.status === 'CLEAR_FAILED') {
	        		writeError(serviceResponse, 'clear-' + opts.pluginType + '-plugin');
	        	} else {
	        		putils.logSoftFailures(serviceResponse, gutil);
	        		if (useVerboseMode) {
		        		var touchedPaths = serviceResponse['touched-paths'];
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
				}
			} catch (err) {
				if (res.statusCode > 201) {
                    putils.logErrorResponseStatusCode(gutil, res);
                } else {
                    putils.logError(gutil, err.message);
	        	}

	        	putils.logError(gutil, opts.pluginType + ' plugin clear failed');

	        	process.exit(1);
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
            putils.logRequestError(gutil, opts.doClear ? 'clear' : 'export', err);
            process.exit(1);
        });
  	}

  	return {
    	exportPlugin: function (server, opts, answers) {
      		putils.logInfoHighlighted(gutil, opts.doClear ? 'Clearing' : 'Exporting' + ' plugin');
      		
      		exportPlugin(server, opts, answers);
    	}
  	};
};