'use strict';

var lazyReq = require('lazy-req')(require);
var generate = lazyReq('../lib/generate.js');

module.exports = function (gulp, gutil) {

  /** Generate templates to speed up development
    * Supports the following scaffolds:
    * - directive
    * - service
    * - filter
    **/
  gulp.task('gen', function (cb) {
    generate()(gulp, gutil).scaffold(cb);
  });

  /** Copy existing components from core source for customization
    * TODO for now, we copy files from bower_components
    * TODO future: grab content from github when repo is public
    **/
  gulp.task('clone', function (cb) {
    if (!gutil.env.path) {
      console.log(gutil.colors.cyan('gulp clone - copy existing components for customization'));
      console.log(gutil.colors.cyan('Please provide a source path to clone'));
      console.log(gutil.colors.yellow('Usage:') + ' gulp clone --path <PATH_TO_CLONE>');
      process.exit(1);
    } else {
      generate()(gulp, gutil).clone(cb);
    }
  });

  gulp.task('generate-bootstrap-base-child', function (cb) {
    generate()(gulp, gutil).bootstrapBaseChild(cb);
  });

};
