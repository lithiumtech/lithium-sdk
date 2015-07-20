'use strict';

var fs = require('fs');
var decompress = require('gulp-decompress');
var AdmZip = require('adm-zip');
var request = require('request');
var through = require('through2');
var parser = require('xml2json');
var streamSync = require('./stream-sync');
var pluginUtils = require('./plugin-utils');

module.exports = function (gulp, gutil) {
	var server;
	var error = false;

 	try {
		server = require('../lib/server.js')(gulp, gutil);
		if (server.serverUrl() === undefined) {
			gutil.log(gutil.colors.red('A server URL is required in your configuration. ' +
			'Please use template.server.conf.json to create server.conf.json.'));
			error = true;
		}
		if (server.pluginToken() === undefined) {
			gutil.log(gutil.colors.red('A plugin token is required in your configuration. ' +
			'Please use template.server.conf.json to create server.conf.json.'));
			error = true;
		}
	} catch (err) {
		gutil.log(gutil.colors.red(err.message));
		error = true;
	}

	if (error) {
		process.exit(1);
	}

	function unzipPlugin() {
	    return gulp.src(["./studio_plugin.zip"])
	      .pipe(decompress({ strip: 1 }))
	      .pipe(gulp.dest('.'))
  	}

  	function exportPlugin(pluginPointAnswers) {
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
    	var pluginDownloadUrlBld = pluginUtils.urlBldr(pluginDownloadUrl + '/restapi/ldntool/plugins/studio')
			.queryIf(server.strictMode(), 'lar.strict_mode', 'true');

		if (typeof pluginPointAnswers != 'undefined') {
			pluginPointAnswers.pluginPoints.forEach(function(pluginPoint) {
				pluginDownloadUrlBld.query('plugin_point', pluginPoint);
			});
		}

		pluginDownloadUrl = pluginDownloadUrlBld.build();

		var req = request.get(pluginDownloadUrl, options);

		return processResponse(req);
  	}

  	function processResponse(req) {

  		function writeError(data, callback) {
	    	var serviceResponse = JSON.parse(parser.toJson(data))['service-response'];
	    	if (['UPLOAD_SUCCESS', 'DRY_RUN_SUCCESS'].indexOf(serviceResponse.status) <= -1) {
				var errorMessage = 'Error: [' + serviceResponse.status + '] ' + serviceResponse.message;
				if (serviceResponse.hasOwnProperty('hard-failures')) {

					var hardFailures = serviceResponse['hard-failures'];

					if (!Array.isArray(hardFailures)) {
						hardFailures = new Array(hardFailures);
					}

					hardFailures.forEach(function(hardFailure) {
						errorMessage = errorMessage + '\n' +
						'Failure Code: ' + hardFailure.code + '\n' +
						'Failure Rule: ' + hardFailure.ruleFailed + '\n' +
						'Failure Message: ' + htmlDecode(hardFailure.message) + '\n' +
						'Failure Details: ' + htmlDecode(hardFailure.details) + '\n';
						var errorSuggestion = hardFailure.suggestion;
						if (typeof errorSuggestion === 'string') {
							errorMessage += 'Suggestion: ' + errorSuggestion + '\n';
						}
					});
				}
				var pluginError = new gutil.PluginError('plugin-upload', errorMessage, 
					{ showStack: false });
				gutil.log(gutil.colors.yellow(pluginError));
				gutil.log(gutil.colors.red('Plugin upload failed'));
				callback(null);
				process.exit(1);
			}
		}

	    req.on('response', function (res) {
	      if (res.statusCode > 201) {
	        gutil.log(gutil.colors.red('server returned status code ' + res.statusCode));
	        // Continuously update stream with data
			var body = '';
			res.on('data', function(d) {
				body += d;
			});
			res.on('end', function() {
				writeError(body, new function(arg) {
					process.exit(1);
				});
			});
	      } else {
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

				var zip = new AdmZip(buf);
				var zipEntries = zip.getEntries();
				// console.log(zipEntries.length);

				zipEntries.forEach(function(zipEntry) {
					// console.log(zipEntry.toString()); // outputs zip entries information 
					//console.log(zipEntry.data.toString('utf8'));
					var outputTo = process.cwd() + "/" + zipEntry.entryName.substring(1, zipEntry.entryName.length - zipEntry.name.length);
					// console.log(outputTo);
					zip.extractEntryTo(zipEntry.entryName, outputTo, false, true);
				});

				process.exit(1);
	        });
	      }
	    });
  	}

  	return {
    	exportPlugin: function (answers) {
      		gutil.log(gutil.colors.cyan('Exporting plugin'));
      		
      		exportPlugin(answers);
    	}
  	};
};