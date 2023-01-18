'use strict';

var lazyReq = require('lazy-req')(require);
var replace = lazyReq('gulp-replace');
var convert = lazyReq('convert-source-map');

module.exports = function (gulp, gutil) {
  const scripts = require('../lib/scripts.js')(gulp, gutil);
  const ComponentDepedencies = require('../lib/component-dependencies');

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

  gulp.task('scripts-deps-npm', function (cb) {
    var ignorePaths = gutil.env.newStructure ? ['!angular-li/bower_components/**'] : ['!bower_components/**'];
    if (gutil.env.ng) {
      return gulp.src(gutil.env.ng.moduleDependencies.concat(ignorePaths), { base: 'node_modules' })
          .pipe(replace()(convert().mapFileCommentRegex, ''))
          .pipe(gulp.dest(scripts.SCRIPTS_DEPS_PATH));
    } else {
      cb();
    }
  });

  gulp.task('scripts-deps', gulp.series('scripts-deps-npm', function (cb) {
    var basePath = gutil.env.newStructure ? 'angular-li/bower_components' : 'bower_components';
    if (gutil.env.ng) {
      return gulp.src(gutil.env.ng.moduleDependencies.concat(['!node_modules/**']), { base: basePath })
        .pipe(replace()(convert().mapFileCommentRegex, ''))
        .pipe(gulp.dest(scripts.SCRIPTS_DEPS_PATH));
    } else {
      cb();
    }
  }));

  gulp.task('scripts-deps-metadata', gulp.series('scripts-main', function (cb) {
    if (gutil.env.ng) {
      return scripts.createDepsMetadata(scripts.PLUGIN_SCRIPTS_PATH, scripts.SCRIPTS_DEPS_METADATA_PATH);
    } else {
      cb();
    }
  }));

  gulp.task('scripts-deps-limuirs', function (cb) {
    // TODO: refactor "ng" flag name to be more general and include anything done in angular-li project
    if (gutil.env.ng) {
      new ComponentDepedencies( scripts.COMPONENT_DEPS_SRC_PATH, scripts.COMPONENT_DEPS_DEST_PATH,
        scripts.LIMUIRS_COMPONENT_PATH).createDepFile().then(cb);
    } else {
      cb();
    }
  });

  gulp.task('scripts-activecast', function (cb) {
    var originalTask = this.seq[this.seq.length - 1];
    var useWatch = originalTask === 'default';
    if (gutil.env.ng) {
      var pattern = gutil.env.newStructure ? 'activecast/ActivecastMain.js' : 'src/activecast/ActivecastMain.js';
      var destPath = gutil.env.newStructure ? 'dist/plugin/web/html/assets/js/activecast' : 'plugin/web/html/assets/js/activecast';
      return scripts.processBundle(pattern, destPath, 'widget.js', useWatch, true);
    } else {
      cb();
    }
  });

  gulp.task('scripts-activecast-tracker', function (cb) {
    var originalTask = this.seq[this.seq.length - 1];
    var useWatch = originalTask === 'default';
    if (gutil.env.ng) {
      var pattern = gutil.env.newStructure ? 'activecast/TrackerMain.js' : 'src/activecast/TrackerMain.js';
      var destPath = gutil.env.newStructure ? 'dist/plugin/web/html/assets/js/activecast' : 'plugin/web/html/assets/js/activecast';
      return scripts.processBundle(pattern, destPath, 'tracker.js', useWatch, true);
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

  gulp.task('scripts', gulp.series('scripts-main', 'scripts-tpls', 'scripts-deps', 'scripts-deps-metadata',
      'scripts-activecast', 'scripts-activecast-tracker', 'scripts-deps-limuirs'));

};
