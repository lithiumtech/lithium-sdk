'use strict';

var lazyReq = require('lazy-req')(require);
var coveralls = lazyReq('gulp-coveralls');
var jscs = lazyReq('gulp-jscs');
var plumber = lazyReq('gulp-plumber');
var test = lazyReq('../lib/test.js');
var scripts = lazyReq('../lib/scripts.js');

module.exports = function (gulp, gutil) {
  var _test, _scripts;

  function testLib() {
    return _test || (_test = test()(gulp, gutil));
  }

  function scriptsLib() {
    return _scripts || (_scripts = scripts()(gulp, gutil));
  }

  gulp.task('test-scripts', ['clean-tmp'], function () {
    return scriptsLib().process([
      scriptsLib().TPL_MAIN_PATTERN
    ], '.tmp');
  });

  gulp.task('test-jshint', ['test-scripts'], function () {
    return gulp.src(['src/**/!(*.demo|*.spec|*.mock).js']).pipe(testLib().jshint(false));
  });

  gulp.task('test-jscs', ['test-scripts'], function () {
    // inline until gulp-jscs adds a fail reporter
    var fail = gutil.env['lint-fail'];
    return gulp.src(['src/**/!(*.demo|*.spec|*.mock).js'])
      .pipe(!fail ? plumber()({
        errorHandler: function (err) {
          console.log(err.message);
        }
      }) : gutil.noop())
      .pipe(jscs()({ configPath: '.jscsrc' }))
      .pipe(!fail ? plumber().stop() : gutil.noop());
  });

  gulp.task('test-karma', ['test-jshint', 'test-jscs'], function (cb) {
    testLib().karma(cb);
  });

  gulp.task('test', ['test-karma']);

  gulp.task('coveralls', function () {
    return gulp.src('coverage/**/lcov.info')
        .pipe(coveralls()());
  });
};
