'use strict';

var lazyReq = require('lazy-req')(require);
var del = lazyReq('del');

module.exports = function (gulp, gutil) {
  gulp.task('clean-tmp', function (cb) {
    return del()('.tmp', { force: true });
  });

  gulp.task('clean-plugin', function (cb) {
    return del()('plugin', { force: true });
  });

  gulp.task('clean-plugin-zip', function (cb) {
    return del()('plugin.lar', { force: true });
  });

  gulp.task('clean', ['clean-tmp', 'clean-plugin', 'clean-plugin-zip']);
};
