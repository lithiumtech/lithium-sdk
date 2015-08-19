'use strict';

var request = require('request');
var pluginUtils = require('../lib/plugin-utils');
var supportedMinVersion = 15.7;


module.exports = function (gulp, gutil) {

    function process(server) {
        try {
            if (server.serverUrl() === undefined) {
                var errMessage = 'A server URL is required in your configuration. ';
                gutil.log(gutil.colors.red(errMessage));
                throw(new Error(errMessage));
            }
            var versionCheckUrl = pluginUtils.urlBldr(server.serverUrl() + '/status/version').build();
            request(versionCheckUrl, function (error, response, body) {
                if (error || response.statusCode > 201) {
                    gutil.log(gutil.colors.red(error.message));
                    throw(error);
                } else {
                    var matches = body.match(/<body>(\d+(\.\d)*)/i);
                    if (matches) {
                        var versionOnServer = matches[1];
                        if (versionOnServer < supportedMinVersion) {
                            var errorMessage = "Supported minimum version on server is " + supportedMinVersion;
                            gutil.log(gutil.colors.red(errorMessage));
                            throw(new Error(errorMessage));
                        }
                    }
                }
            });
        } catch (err) {
            gutil.log(gutil.colors.red(err.message));
            throw(err);
        }
    };

    gulp.task('version-check', function() {
        var server = require('../lib/server.js')(gulp, gutil);
        process(server);
    });


};
