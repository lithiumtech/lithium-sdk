'use strict';

var request = require('request');
var pluginUtils = require('../lib/plugin-utils');
var supportedVersionMajor = 15;
var supportedVersionMinor = 7;
var sdkVersion = '0.0.5';
var parser = require('xml2json');
var putils = require('./plugin-utils');

module.exports = function (gulp, gutil) {

    function validate(serverUrl, pluginToken, opts, cb, errorCallback) {

        var options = {
            headers: {
                Authorization: 'Bearer ' + pluginToken
            },
            rejectUnauthorized: false
        };

        var versionCheckUrl = pluginUtils.urlBldr(serverUrl + '/restapi/ldntool/plugins/version').build();
        if (opts.debugMode) {
          putils.logDebug(gutil, 'making version check call to ' + versionCheckUrl);
          putils.logDebug(gutil, 'version check callOpts: ' + JSON.stringify(options));
        }
        request(versionCheckUrl, options, function (error, response, body) {
            if (opts.debugMode) {
              putils.logDebug(gutil, 'response from version check: \n' + body);
            }
            if (error || response.statusCode > 201) {
              putils.logError(gutil, 'got an error when trying to make the call: \n' + error);
              parseResponse(body, opts, errorCallback);
                return;
            }
            try {
                var versionResponse = parseResponse(body, opts, errorCallback);
                var version = versionResponse.version;
                var matches = version.toString().match(/(\d+)\.(\d{0,2})*/i);
                if (!matches || matches.length < 3) {
                    callbackOrThrowError(errorCallback, 'Invalid version check response ' + version);
                    return;
                }
                var versionOnServer = matches[1];
                var minorVersionOnServer = matches[2];
                if (versionOnServer < supportedVersionMajor || (versionOnServer == supportedVersionMajor && minorVersionOnServer < supportedVersionMinor)) {
                    var errorMessage = 'Supported minimum version on server is ' + supportedVersionMajor + '.' + supportedVersionMinor + '.';
                    pluginUtils.logError(gutil, errorMessage);
                    errorMessage += ' Either contact support to get your stage server upgraded to version '
                        + supportedVersionMajor + "." + supportedVersionMinor + ' or else downgrade your version of the sdk (Run npm install -g lithium-sdk@' + sdkVersion+')';
                    callbackOrThrowError(errorCallback, errorMessage);
                }

                //On success invoke callback function
                if (typeof cb !== 'undefined') {
                    return cb();
                }
            } catch (error) {
                callbackOrThrowError(errorCallback, error.message);
            }

        });
    }

    function process(server, opts, cb, errorCallback) {
        if (server.serverUrl() === undefined) {
            var errMessage = 'A server URL is required in your configuration. ';
            callbackOrThrowError(errorCallback, errMessage);
        }
        validate(server.serverUrl(), server.pluginToken(), opts, cb, errorCallback);
    }

    function callbackOrThrowError(cb, errorMsg) {
        if (typeof cb !== 'undefined') {
            cb(new Error(errorMsg), null);
        } else {
            var error = new Error(errorMsg);
            Error.captureStackTrace(error, callbackOrThrowError);
            throw error;
        }
    }

    function parseResponse(body, opts, errorCallback) {
        var errorMessage = 'Empty version check response';
        var badResponseErrMessage = 'Invalid response from server. Check your server url and version.';
        if ( !body ) {
            pluginUtils.logError(gutil, badResponseErrMessage);
            callbackOrThrowError(errorCallback, badResponseErrMessage);
            return;
        }
        var options = { coerce: false};
        try {
            var responseBody = JSON.parse(parser.toJson(body, options));
        } catch (error) {
            pluginUtils.logError(gutil, badResponseErrMessage);
            callbackOrThrowError(errorCallback, badResponseErrMessage);
            return;
        }
        if (!responseBody['version-response']) {
            errorMessage = responseBody['service-response'] ? responseBody['service-response'].message :
                badResponseErrMessage;
            pluginUtils.logError(gutil, errorMessage);
            callbackOrThrowError(errorCallback, errorMessage);
            return;
        }
        var versionResponse = responseBody['version-response'];
        if (typeof versionResponse !== 'undefined' && 'status' in versionResponse && 'OK' === versionResponse.status ) {
            return versionResponse;
        }
        pluginUtils.logError(gutil, errorMessage);
        throw new Error(badResponseErrMessage);
    }

    return {
        process: function (server, opts, cb, errorCallback) {
            process(server, opts, cb, errorCallback);
        },
        validate: function (serverUrl, pluginToken, opts, cb, errorCallback) {
            validate(serverUrl, pluginToken, opts, cb, errorCallback);
        }
    };
}