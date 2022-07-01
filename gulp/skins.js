'use strict';

module.exports = function (gulp, gutil) {
  var skins = require('../lib/skins.js')(gulp, gutil);

  gulp.task('skins', ['skins-vars-template', 'skins-compile']);

  gulp.task('skins-version-check', function () {
  	return skins.checkVersionForThemeSupport();
  });

  gulp.task('skins-compile', function (cb) {
    skins.compile().then(cb);
  });

  gulp.task('skins-vars-template', function () {
    return skins.createVarsTemplate();
  });
};