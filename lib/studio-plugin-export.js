'use strict';

var fs = require('fs');
var AdmZip = require('adm-zip');
var request = require('request');
var through = require('through2');
var parser = require('xml2json');
var streamSync = require('./stream-sync');
var pluginUtils = require('./plugin-utils');

module.exports = function (gulp, gutil) {
	var server = pluginUtils.createServer(gulp, gutil);

  	function exportPlugin(doClear, verboseMode, pluginPointAnswers) {
  		var options = {
	      headers: {
	        Authorization: 'Bearer ' + server.pluginToken()
	      },
	      encoding: null
	    };

	    var pluginDownloadUrl;

	    if (server.pluginUploadProtocol() === 'https') {
	    	options.rejectUnauthorized = false;
      		pluginDownloadUrl = server.serverUrlSecure();
    	} else {
    		pluginDownloadUrl = server.serverUrl();
    	}
    	if (server.community() !== undefined) {
    		pluginDownloadUrl = pluginDownloadUrl + server.community();
    	}
    	var basePath = '/restapi/ldntool/plugins/studio';
    	if (doClear) {
    		basePath = basePath + '/clear';
    	}
    	var pluginDownloadUrlBld = pluginUtils.urlBldr(pluginDownloadUrl + basePath)
			.queryIf(server.strictMode(), 'lar.strict_mode', 'true');

		if (typeof pluginPointAnswers != 'undefined') {
			pluginPointAnswers.pluginPoints.forEach(function(pluginPoint) {
				pluginDownloadUrlBld = pluginDownloadUrlBld.query('plugin_point', pluginPoint);
			});
		}

		pluginDownloadUrl = pluginDownloadUrlBld.build();

		var req = doClear ? request.post(pluginDownloadUrl, options) : request.get(pluginDownloadUrl, options);

		return processResponse(req, doClear, verboseMode);
  	}

  	function processResponse(req, doClear, verboseMode) {

  		function writeError(data) {
	    	var serviceResponse = JSON.parse(parser.toJson(data))['service-response'];
			pluginUtils.logHardFailures(serviceResponse, gutil);
			gutil.log(gutil.colors.red('Studio Plugin export failed'));
			process.exit(1);
		}

		function writeZip(res, buf) {
    		if (res.statusCode > 201) {
        		gutil.log(gutil.colors.red('server returned status code ' + res.statusCode));
        		writeError(buf.toString());
        	} else {
        		var zip = new AdmZip(buf);
				var zipEntries = zip.getEntries();

				zipEntries.forEach(function(zipEntry) {
					if (verboseMode) {
						gutil.log('downloading ' + zipEntry.entryName);
					}
					var outputTo = process.cwd() + "/" + zipEntry.entryName.substring(1, zipEntry.entryName.length - zipEntry.name.length);
					zip.extractEntryTo(zipEntry.entryName, outputTo, false, true);
				});

				var successMsg = 'Studio Plugin downloaded successfully';
				gutil.log(gutil.colors.green(successMsg));

				process.exit(1);
        	}
		}

		function clearZip(res, buf) {
			if (res.statusCode > 201) {
        		gutil.log(gutil.colors.red('server returned status code ' + res.statusCode));
        		writeError(buf.toString());
        	} else {
        		var serviceResponse = buf.toString();
        		pluginUtils.logSoftFailures(serviceResponse, gutil);
				var successMsg = 'Studio Plugin cleared successfully';
				gutil.log(gutil.colors.green(successMsg));
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

				if (doClear) {
					clearZip(res, buf);
				} else {
					writeZip(res, buf);
				}
			});
		});
  	}

  	return {
    	exportPlugin: function (clear, verbose, answers) {
      		gutil.log(gutil.colors.cyan((clear ? 'Clearing' : 'Exporting') + ' plugin'));
      		
      		exportPlugin(clear, verbose, answers);
    	}
  	};
};