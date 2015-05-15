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

};
