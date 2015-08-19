'use strict';

var request = require('request');
var pluginUtils = require('../lib/plugin-utils');
var supportedMinVersion = 15.7;
var sdkVersion = '0.0.5';

module.exports = function (gulp, gutil) {

    function process(server, cb) {
        try {
            if (server.serverUrl() === undefined) {
                var errMessage = 'A server URL is required in your configuration. ';
                callbackOrThrowError(cb, errMessage);
            }
            var options = {
                headers: {
                    Authorization: 'Bearer ' + server.pluginToken()
                }
            };

            var versionCheckUrl = pluginUtils.urlBldr(server.serverUrl() + 'status/version').build();
            request(versionCheckUrl, options, function (error, response, body) {
                if (error || response.statusCode > 201) {
                    callbackOrThrowError(cb, error.message);
                } else {
                    var matches = body.match(/<body>(\d+(\.\d)*)/i);
                    if (matches) {
                        var versionOnServer = matches[1];
                        if (versionOnServer < supportedMinVersion) {
                            var errorMessage = 'Supported minimum version on server is ' + supportedMinVersion+'.';
                            errorMessage +=  ' Either contact support to get your stage server upgraded to version '
                                + supportedMinVersion + 'or else downgrade your version of the sdk to ' + sdkVersion;
                            callbackOrThrowError(cb, errorMessage);
                        }
                    } else {
                        callbackOrThrowError(cb, 'Invalid version check response from server');
                    }
                }
            });
        } catch (err) {
            callbackOrThrowError(cb, err.message);
        }

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
