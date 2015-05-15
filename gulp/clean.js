'use strict';

var lazyReq = require('lazy-req')(require);
var clean = lazyReq('gulp-rimraf');

module.exports = function (gulp) {
  gulp.task('clean-tmp', function () {
    return gulp.src('.tmp').pipe(clean()({ force: true }));
  });

  gulp.task('clean-plugin', function () {
    return gulp.src('plugin').pipe(clean()({ force: true }));
  });

  gulp.task('clean-plugin-zip', function () {
    return gulp.src('plugin.lar').pipe(clean()({ force: true }));
  });

  gulp.task('clean', ['clean-tmp', 'clean-plugin', 'clean-plugin-zip']);
};
