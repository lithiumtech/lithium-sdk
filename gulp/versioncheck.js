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

        var versionCheckUrl = pluginUtils.urlBldr(server.serverUrl() + 'restapi/ldntool/version').build();
        request(versionCheckUrl, options, function (error, response, body) {
            if (error || response.statusCode > 201) {
                callbackOrThrowError(cb, error.message);
            }
            try {
                var versionResponse = JSON.parse(parser.toJson(body))['version-response'];
                if ('OK' === versionResponse.status) {
                    var version = versionResponse.version;
                    if (!version || !version.toString().trim()) {
                        callbackOrThrowError(cb, 'Empty version check response');
                    }
                    var matches = version.toString().match(/(\d+(\.\d)*)/i);
                    if (!matches || matches.length < 1) {
                        callbackOrThrowError(cb, 'Invalid version check response ' + version);
                    }
                    var versionOnServer = matches[1];
                    if (versionOnServer < supportedMinVersion) {
                        var errorMessage = 'Supported minimum version on server is ' + supportedMinVersion + '.';
                        errorMessage += ' Either contact support to get your stage server upgraded to version '
                            + supportedMinVersion + ' or else downgrade your version of the sdk to ' + sdkVersion;
                        callbackOrThrowError(cb, errorMessage);
                    }
                } else {
                    callbackOrThrowError(cb, 'Invalid version check response ' + versionResponse.status);
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
