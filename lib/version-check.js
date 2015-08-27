'use strict';

var request = require('request');
var pluginUtils = require('../lib/plugin-utils');
var supportedMinVersion = 15.7;
var sdkVersion = '0.0.5';
var parser = require('xml2json');

module.exports = function (gulp, gutil) {

    function validate(serverUrl, pluginToken, cb, errorCallback) {

        var options = {
            headers: {
                Authorization: 'Bearer ' + pluginToken
            }
        };

        var versionCheckUrl = pluginUtils.urlBldr(serverUrl + '/restapi/ldntool/plugins/version').build();
        request(versionCheckUrl, options, function (error, response, body) {
            if (error || response.statusCode > 201) {
                parseResponse(body, errorCallback);
                return;
            }
            try {
                var versionResponse = parseResponse(body, errorCallback);
                var version = versionResponse.version;
                var matches = version.toString().match(/(\d+(\.\d)*)/i);
                if (!matches || matches.length < 1) {
                    callbackOrThrowError(errorCallback, 'Invalid version check response ' + version);
                    return;
                }
                var versionOnServer = matches[1];
                if (versionOnServer < supportedMinVersion) {
                    var errorMessage = 'Supported minimum version on server is ' + supportedMinVersion + '.';
                    pluginUtils.logError(gutil, errorMessage);
                    errorMessage += ' Either contact support to get your stage server upgraded to version '
                        + supportedMinVersion + ' or else downgrade your version of the sdk (Run npm install -g lithium-sdk@' + sdkVersion+')';
                    callbackOrThrowError(errorCallback, errorMessage);
                }

                //On success invoke callback function
                if (typeof cb !== 'undefined') {
                    cb();
                }
            } catch (error) {
                callbackOrThrowError(errorCallback, error.message);
            }

        });
    }

    function process(server, cb, errorCallback) {
        if (server.serverUrl() === undefined) {
            var errMessage = 'A server URL is required in your configuration. ';
            callbackOrThrowError(errorCallback, errMessage);
        }
        validate(server.serverUrl(), server.pluginToken(), cb, errorCallback);
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

    function parseResponse(body, errorCallback) {
        var errorMessage = 'Empty version check response';
        var badResponseErrMessage = 'Invalid response from server. Check your server url and version.';
        if ( !body ) {
            pluginUtils.logError(gutil, badResponseErrMessage);
            callbackOrThrowError(errorCallback, badResponseErrMessage);
        }
        try {
            var responseBody = JSON.parse(parser.toJson(body));
        } catch (error) {
            pluginUtils.logError(gutil, badResponseErrMessage);
            callbackOrThrowError(errorCallback, badResponseErrMessage);
        }
        if (!responseBody['version-response']) {
            errorMessage = responseBody['service-response'] ? responseBody['service-response'].message :
                badResponseErrMessage;
            pluginUtils.logError(gutil, errorMessage);
            callbackOrThrowError(errorCallback, errorMessage);
        }
        var versionResponse = responseBody['version-response'];
        if (typeof versionResponse !== 'undefined' && 'status' in versionResponse && 'OK' === versionResponse.status ) {
            return versionResponse;
        }
        pluginUtils.logError(gutil, errorMessage);
        throw new Error(badResponseErrMessage);
    }

    return {
        process: function (server, cb, errorCallback) {
            process(server, cb, errorCallback);
        },
        validate: function (serverUrl, pluginToken, cb, errorCallback) {
            validate(serverUrl, pluginToken, cb, errorCallback);
        }
    };
}