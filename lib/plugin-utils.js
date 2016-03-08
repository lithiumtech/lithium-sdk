'use strict';

function logError(gutil, msg) {
  gutil.log(gutil.colors.red(msg));

  return msg
}

function logWarning(gutil, msg) {
  gutil.log(gutil.colors.yellow(msg));

  return msg;
}

function logInfo(gutil, msg) {
  gutil.log(msg);

  return msg;
}

function logInfoHighlighted(gutil, msg) {
  gutil.log(gutil.colors.cyan(msg));

  return msg;
}

function logSuccess(gutil, msg) {
  gutil.log(gutil.colors.green(msg));

  return msg;
}

function logDebug(gutil, msg) {
  gutil.log(gutil.colors.grey(msg));

  return msg;
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

function logRequestError(gutil, action, err) {
  var msg = logError(gutil, 'Error making request to ' + action + ' plugin.');
  if (err.message.toLowerCase().indexOf("ssl")) {
    msg += '\n' + logError(gutil, 'Possible SSL configuration issue, or the site may be down.');
    msg += '\n' + logError(gutil, 'Check to make sure your stage community is up, and that you have the correct serverUrl property' +
    ' set in server.conf.json (should start with https://) and that SSL support has been configured correctly on your stage community.');
  }

  return msg + '\n' + logError(gutil, err);
}

function logErrorResponseStatusCode(gutil, res) {
  var msg = logError(gutil, 'server returned status code ' + res.statusCode);
  if (403 === res.statusCode) {
    msg += '\n' + logError(gutil, 'Either pluginToken is not valid, request is not being made over SSL, or SSL is not configured property on the community.');
    msg += '\n' + logError(gutil, 'Check server.conf.json to make sure the serverUrl property starts with https://.');
  } else if (400 === res.statusCode) {
    msg += '\n' + logError(gutil, 'Check to make sure the protocol in the url set as the value of the serverUrl property '
      + 'starts with https:// (in server.conf.json)');
  }

  return msg;
}

function logHardFailures(serviceResponse, gutil, scriptName) {
  if (serviceResponse.hasOwnProperty('status')) {
    if (serviceResponse.status.indexOf('_FAIL') > -1) {
      var errorMessage = 'Error: [' + serviceResponse.status + '] ';

      if (serviceResponse.hasOwnProperty('message')) {
        errorMessage += htmlDecode(serviceResponse.message);
      }

      if (serviceResponse.hasOwnProperty('hard-failures')) {
        var hardFailures = serviceResponse['hard-failures'];

        if (!Array.isArray(hardFailures)) {
          hardFailures = new Array(hardFailures);
        }

        hardFailures.forEach(function (hardFailure) {
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

      var pluginError = new gutil.PluginError(scriptName, gutil.colors.red(errorMessage), {showStack: false});

      return logWarning(gutil, pluginError);
    }
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

    return logWarning(gutil, warnMessage);
	}
}

function getPluginBaseUrl(gutil, server, opts, callOpts, useVerboseMode) {
  if (opts.debugMode) {
    logDebug(gutil, 'opts: ' + JSON.stringify(opts));
  }
  var endpointUrl;

  callOpts.headers =  {
    Authorization: 'Bearer ' + server.pluginToken()
  };

  callOpts.encoding = null;

  if (server.pluginUploadProtocol() === 'https') {
    if (opts.debugMode) {
      logDebug(gutil, 'adding redjectUnauthorized flag.');
    }
    callOpts.rejectUnauthorized = false;
  }

  endpointUrl = server.serverUrl();

  if (typeof server.community !== 'undefined' && server.community() !== undefined) {
    endpointUrl += '/' + server.community();
  }

  endpointUrl += '/restapi/ldntool/plugins';

  if (opts.pluginType) {
    endpointUrl += '/' + opts.pluginType;
  }
  if (opts.doClear) {
    endpointUrl += '/clear';
  }

  var pluginDownloadUrlBld = urlBldr(endpointUrl)
    .query("format", "json")
    .queryIf(server.strictMode(), 'lar.strict_mode', 'true');

  if (opts.doClear && useVerboseMode) {
    pluginDownloadUrlBld = pluginDownloadUrlBld.query('lar.verbose', true);
  }

  return pluginDownloadUrlBld;
}

function validate(value, regex, allowEmpty) {
  if (value === '') {
    if (allowEmpty) {
      return true;
    } else {
      return 'Please provide a valid value';
    }
  }
  var cases = value.match(regex);

  if (cases === null) {
    return 'Invalid value, please try again.';
  } else {
    return true;
  }
}

module.exports = {
    urlBldr: urlBldr,
    logError: logError,
    logWarning: logWarning,
    logInfo: logInfo,
    logInfoHighlighted: logInfoHighlighted,
    logSuccess: logSuccess,
    logDebug: logDebug,
    logRequestError: logRequestError,
    logErrorResponseStatusCode: logErrorResponseStatusCode,
    logHardFailures: logHardFailures,
    logSoftFailures: logSoftFailures,
    getPluginBaseUrl: getPluginBaseUrl,
    validate:validate
};