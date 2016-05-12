'use strict';

var lazyReq = require('lazy-req')(require);
var jscs = lazyReq('gulp-jscs');
var test = lazyReq('../lib/test.js');

module.exports = function (gulp, gutil) {
  var scripts = require('../lib/scripts.js')(gulp, gutil);

  gulp.task('scripts', ['scripts-main', 'scripts-tpls', 'scripts-deps', 'scripts-deps-metadata']);

  gulp.task('scripts-main', function () {
    return scripts.processScripts(scripts.JS_MAIN_PATTERN, scripts.PLUGIN_SCRIPTS_PATH, undefined, false, true);
  });

  gulp.task('scripts-tpls', function () {
    return scripts.processTpls(scripts.TPL_MAIN_PATTERN, scripts.PLUGIN_SCRIPTS_PATH, undefined, false);
  });

  gulp.task('scripts-deps', function () {
    return gulp.src(gutil.env.ng.moduleDependencies, { base: './bower_components' })
      .pipe(gulp.dest(scripts.SCRIPTS_DEPS_PATH));
  });

  gulp.task('scripts-deps-metadata', ['scripts-main'], function () {
    return scripts.createDepsMetadata(scripts.PLUGIN_SCRIPTS_PATH, scripts.SCRIPTS_DEPS_METADATA_PATH);
  });

  gulp.task('jshint', function () {
    return gulp.src(scripts.JS_MAIN_PATTERN).pipe(scripts.jshint(true));
  });

  gulp.task('jscs', function () {
    gulp.src(scripts.JS_MAIN_PATTERN).pipe(scripts.jscs(true));
  });
};