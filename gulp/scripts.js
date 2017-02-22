'use strict';

module.exports = function (gulp, gutil) {
  var scripts = require('../lib/scripts.js')(gulp, gutil);

  gulp.task('scripts', ['scripts-main', 'scripts-tpls', 'scripts-deps', 'scripts-deps-metadata', 'scripts-activecast']);

  gulp.task('scripts-main', function (cb) {
    if (gutil.env.ng) {
      return scripts.processScripts(scripts.JS_MAIN_PATTERN, scripts.PLUGIN_SCRIPTS_PATH, undefined, false, true);
    } else {
      cb();
    }
  });

  gulp.task('scripts-tpls', function (cb) {
    if (gutil.env.ng) {
      return scripts.processTpls(scripts.TPL_PATTERN, scripts.PLUGIN_SCRIPTS_PATH, undefined, false);
    } else {
      cb();
    }
  });

  gulp.task('scripts-deps', ['scripts-deps-from-npm'], function (cb) {
    if (gutil.env.ng) {
      return gulp.src(gutil.env.ng.moduleDependencies, {base: './bower_components'})
        .pipe(gulp.dest(scripts.SCRIPTS_DEPS_PATH));
    } else {
      cb();
    }
  });

  gulp.task('scripts-deps-from-npm', function (cb) {
    if (gutil.env.ng) {
      return Promise.all([
        gulp.src('./node_modules/angular2/bundles/*.*').pipe(gulp.dest('./bower_components/angular2/bundles')),
        gulp.src('./node_modules/rxjs/bundles/*.*').pipe(gulp.dest('./bower_components/rxjs/bundles'))
      ]);
    } else {
      cb();
    }
  });

  gulp.task('scripts-deps-metadata', ['scripts-main'], function (cb) {
    if (gutil.env.ng) {
      return scripts.createDepsMetadata(scripts.PLUGIN_SCRIPTS_PATH, scripts.SCRIPTS_DEPS_METADATA_PATH);
    } else {
      cb();
    }
  });

  gulp.task('scripts-activecast', function (cb) {
    var originalTask = this.seq[this.seq.length - 1];
    var useWatch = originalTask === 'default';
    if (gutil.env.ng) {
      return scripts.processActivecast('src/activecast/Main.js', 'plugin/web/html/assets/js/activecast', useWatch, true);
    } else {
      cb();
    }
  });

  gulp.task('jshint', function (cb) {
    if (gutil.env.ng) {
      return gulp.src(scripts.JS_MAIN_PATTERN).pipe(scripts.jshint(true));
    } else {
      cb();
    }
  });

  gulp.task('jscs', function () {
    gulp.src(scripts.JS_MAIN_PATTERN).pipe(scripts.jscs(true));
  });
};