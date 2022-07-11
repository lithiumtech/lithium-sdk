'use strict';

module.exports = function (gulp, gutil) {
  /**
   * Checks if a theme skin is enabled
   */

  var supportedMinVersionForThemeCheck = '22.7';
  gulp.task('check-themes', ['version-check'], function(cb, errorCallback) {
    var server = require('../lib/server.js')(gulp, gutil);
    var version = require('../lib/version-check')(gulp, gutil).getVersion();
    if (version >= supportedMinVersionForThemeCheck) {
    	require('../lib/check-themes.js')(gulp, gutil).process(server, {
	      debugMode: gutil.env.debug
	    }, cb, errorCallback);
    } else {
    	return cb();
    }
  });
};
