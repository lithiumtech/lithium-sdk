'use strict';

module.exports = function (gulp, gutil) {
  /**
   * Checks if a theme skin is enabled
   */

  gulp.task('check-themes', gulp.series('version-check', function(cb, errorCallback) {
    var server = require('../lib/server.js')(gulp, gutil);
    if (server.useLocalCompile()) {
        var version = require('../lib/version-check')(gulp, gutil).getVersion();
        var serverVersionThemeCheck = require('../lib/server-version-theme-check.json');
        var versionPattern = /(\d+)\.(\d{0,2})*/i;
        var matches = version.toString().match(versionPattern);
        var versionOnServer = parseInt(matches[1]);
        var minorVersionOnServer = parseInt(matches[2]);
        if (versionOnServer >= serverVersionThemeCheck.supportedVersionMajor ||
            (versionOnServer == serverVersionThemeCheck.supportedVersionMajor &&
            minorVersionOnServer >= serverVersionThemeCheck.supportedVersionMinor)) {
            require('../lib/check-themes.js')(gulp, gutil).process(server, {
              debugMode: gutil.env.debug
            }, cb, errorCallback);
        } else {
            return cb();
        }
    }
  }));
};
