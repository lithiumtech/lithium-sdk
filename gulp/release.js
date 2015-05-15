'use strict';

module.exports = function (gulp, gutil) {
  var text;

  gulp.task('text-init', ['clean'], function (cb) {
    text = require('../lib/text.js')(gulp, gutil);
    cb(null);
  });

  gulp.task('release-json', ['text-init'], function () {
    return text.releaseJSON();
  });

  gulp.task('release-li-properties', ['text-init'], function () {
    return text.releaseLiProperties();
  });

  gulp.task('release-text', [
    'release-json',
    'release-li-properties'
  ], function (cb) {
    cb(null);
  });

};
