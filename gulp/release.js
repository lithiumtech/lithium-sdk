'use strict';

module.exports = function (gulp, gutil) {
  var text;

  gulp.task('text-init', gulp.series('clean', function (cb) {
    text = require('../lib/text.js')(gulp, gutil);
    cb(null);
  }));

  gulp.task('release-json', gulp.series('text-init', function () {
    return text.releaseJSON();
  }));

  gulp.task('release-li-properties', gulp.series('text-init', function () {
    return text.releaseLiProperties();
  }));

  gulp.task('release-text', gulp.series(
    'release-json',
    'release-li-properties',
      function (cb) {
    cb(null);
  }));

};
