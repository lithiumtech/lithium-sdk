'use strict';

var lazyReq = require('lazy-req')(require);
var coveralls = lazyReq('gulp-coveralls');
var jscs = lazyReq('gulp-jscs');
var plumber = lazyReq('gulp-plumber');
var test = lazyReq('../lib/test.js');
var scripts = lazyReq('../lib/scripts.js');

module.exports = function (gulp, gutil) {
  var testLib = test()(gulp, gutil);

  gulp.task('test', ['test-karma']);

  gulp.task('test-karma', ['scripts', 'jshint', 'jscs'], testLib.karma);

  gulp.task('coveralls', function () {
    return gulp.src('coverage/**/lcov.info').pipe(coveralls()());
  });
};
