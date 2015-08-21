'use strict';

var request = require('request');
var pluginUtils = require('../lib/plugin-utils');
var supportedMinVersion = 15.7;
var sdkVersion = '0.0.5';
var parser = require('xml2json');

module.exports = function (gulp, gutil) {

    function process(server, cb) {

        if (server.serverUrl() === undefined) {
            var errMessage = 'A server URL is required in your configuration. ';
            callbackOrThrowError(cb, errMessage);
        }
        var options = {
            headers: {
                Authorization: 'Bearer ' + server.pluginToken()
            }
        };

        var versionCheckUrl = pluginUtils.urlBldr(server.serverUrl() + '/restapi/ldntool/plugins/version').build();
        request(versionCheckUrl, options, function (error, response, body) {
            if (error || response.statusCode > 201) {
                parseResponse(cb, body);
                return;
            }
            try {
                var versionResponse = parseResponse(cb, body);
                var version = versionResponse.version;
                var matches = version.toString().match(/(\d+(\.\d)*)/i);
                if (!matches || matches.length < 1) {
                    callbackOrThrowError(cb, 'Invalid version check response ' + version);
                    return;
                }
                var versionOnServer = matches[1];
                if (versionOnServer < supportedMinVersion) {
                    var errorMessage = 'Supported minimum version on server is ' + supportedMinVersion + '.';
                    errorMessage += ' Either contact support to get your stage server upgraded to version '
                        + supportedMinVersion + ' or else downgrade your version of the sdk to ' + sdkVersion;
                    callbackOrThrowError(cb, errorMessage);
                }
            } catch (error) {
                callbackOrThrowError(cb, error.message);
            }
        });
    }

    function callbackOrThrowError(cb, errorMsg) {
        pluginUtils.logError(gutil, errorMsg);
        if (typeof cb !== 'undefined') {
            cb(new Error(errorMsg), null);
        } else {
            throw new Error(errorMsg);
        }
    }

    function parseResponse(cb, body) {
        if ( !body ) {
            callbackOrThrowError(cb, 'Empty version check response');
            return;
        }
        var responseBody = JSON.parse(parser.toJson(body));
        if (!responseBody['version-response']) {
            var errorMessage = responseBody['service-response'] ? responseBody['service-response'].message :
                'Invalid response from server';
            throw new Error(errorMessage);
        }
        var versionResponse = responseBody['version-response'];
        if ('status' in versionResponse && 'OK' === versionResponse.status ) {
            return versionResponse;
        }
        if ( !('version' in versionResponse) || !versionResponse.version.toString().trim()) {
            throw new Error('Empty version check response');
        }
        throw new Error(versionResponse);
    }

    gulp.task('version-check', function() {
        var server = require('../lib/server.js')(gulp, gutil);
        process(server);
    });

    return {
        process: function (server, cb) {
            process(server, cb);
        }
    };
};
