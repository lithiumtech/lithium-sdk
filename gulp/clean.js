'use strict';

var lazyReq = require('lazy-req')(require);
var del = lazyReq('del');

module.exports = function (gulp) {
  gulp.task('clean-tmp', function () {
    return del()('.tmp', { force: true });
  });

  gulp.task('clean-plugin', function () {
    return del()('plugin', { force: true });
  });

  gulp.task('clean-plugin-zip', function () {
    return del()('plugin.lar', { force: true });
  });

  gulp.task('clean', ['clean-tmp', 'clean-plugin', 'clean-plugin-zip']);
};
