'use strict';

var lazyReq = require('lazy-req')(require);
var project = lazyReq('../lib/project.js');

module.exports = function (gulp, gutil) {
  var _project;

  function projectLib() {
    return _project || (_project = project()(gulp, gutil));
  }

  /** update the lia instance url and plugin token for a project
   **/
  gulp.task('update', gulp.series('version-check', function (cb) {
    projectLib().update(cb);
  }));

  /** Verifies that a project has the proper files before we turn on angular support.
   **/
  gulp.task('verify-project', function () {
    return projectLib().verify();
  });

  /** Designed to be run inside a customer project.
   * Adds the necessary configuration to write or customize angular components.
   **/
  gulp.task('enable-angular', gulp.series('verify-project', function (cb) {
    projectLib().enableAngular(cb);
  }));

};
