'use strict';

function createServer(gulp, gutil) {
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

	return server;
}

function urlBldr(url) {
	return {
	  build: function() {
	    return url;
	  },
	  add: function(val) {
	    return urlBldr(url + val);
	  },
	  addIf: function(bool, val) {
	    return bool ? this.add(val) : urlBldr(url);
	  },
	  query: function(nm, val) {
	      return url.indexOf('?') > -1 ? this.add('&' + nm + '=' + val) : this.add('?' + nm + '=' + val);
	  },
	  queryIf: function(bool, nm, val) {
	    return bool ? this.query(nm, val) : urlBldr(url);
	  }
	};
}

function htmlDecode(str) {
	return String(str).replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"').replace(/&#35;/g, '#')
		.replace(/&#40;/g, '(').replace(/&#41;/g, ')');
}

function logHardFailures(serviceResponse, gutil) {
	if (serviceResponse.hasOwnProperty('hard-failures')) {
		var errorMessage = 'Error: [' + serviceResponse.status + '] ' + serviceResponse.message;
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

		var pluginError = new gutil.PluginError('plugin-upload', errorMessage, { showStack: false });
		gutil.log(gutil.colors.yellow(pluginError));
	}
}

function logSoftFailures(serviceResponse, gutil) {
	if (serviceResponse.hasOwnProperty('soft-failures')) {
		var warnMessage = 'Warning: [' + serviceResponse.status + '] ' + serviceResponse.message;
		var softFailures = serviceResponse['soft-failures'];

		if (!Array.isArray(softFailures)) {
			softFailures = new Array(softFailures);
		}

		softFailures.forEach(function(softFailure) {
			warnMessage += '\n' +
			'Warn Code: ' + softFailure.code + '\n' +
			'Warn Rule: ' + softFailure.ruleFailed + '\n' +
			'Warn Message: ' + htmlDecode(softFailure.message) + '\n' +
			'Warn Details: ' + htmlDecode(softFailure.details) + '\n';
			var warnSuggestion = softFailure.suggestion;
			if (typeof warnSuggestion === 'string') {
				warnMessage += 'Suggestion: ' + warnSuggestion + '\n';
			}
		});

		gutil.log(gutil.colors.yellow(warnMessage));
	}
}

module.exports.createServer = createServer;
module.exports.urlBldr = urlBldr;
module.exports.logHardFailures = logHardFailures;
module.exports.logSoftFailures = logSoftFailures;