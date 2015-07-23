'use strict';

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

function logRequestError(gutil, action, err) {
    gutil.log(gutil.colors.red('Error making request to ' + action + ' plugin.'));
    if (err.message.toLowerCase().indexOf("ssl")) {
        gutil.log(gutil.colors.red('Possible SSL configuration issue.'));
        gutil.log(gutil.colors.red('Check to make sure you have the correct serverUrl and pluginUploadProtocol' +
        ' properties set in server.conf.json and that SSL support has been configured correctly on your community.'));
    }

    gutil.log(gutil.colors.red(err));
}

function logErrorResponseStatusCode(gutil, res) {
    gutil.log(gutil.colors.red('server returned status code ' + res.statusCode));
    if (403 === res.statusCode) {
        gutil.log(gutil.colors.red('Either request is not being made over SSL or SSL is not configured property on the community.'));
        gutil.log(gutil.colors.red('Check server.conf.json to make sure pluginUploadProtocol is set to https.'));
    } else if (400 === res.statusCode) {
        gutil.log(gutil.colors.red('Check to make sure the protocol in the url set as the value of the serverUrl property '
        + 'matches set as the value of the pluginUploadProtocol property (in server.conf.json)'));
    }
}

function logHardFailures(serviceResponse, gutil, scriptName) {
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

		var pluginError = new gutil.PluginError(scriptName, errorMessage, { showStack: false });
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

module.exports.urlBldr = urlBldr;
module.exports.logRequestError = logRequestError;
module.exports.logErrorResponseStatusCode = logErrorResponseStatusCode;
module.exports.logHardFailures = logHardFailures;
module.exports.logSoftFailures = logSoftFailures;