'use strict';

var lazyReq = require('lazy-req')(require);
var livereload = lazyReq('gulp-livereload');
var watch = lazyReq('gulp-debounced-watch');
var prettyTime = lazyReq('pretty-hrtime');
var path = lazyReq('path');
var fs = require('fs-extra');
// var filelog = require('gulp-filelog');

module.exports = function (gulp, gutil) {
  var scripts = require('../lib/scripts.js')(gulp, gutil);
  var text = require('../lib/text.js')(gulp, gutil);
  var server = require('../lib/server.js')(gulp, gutil);
  var skins = require('../lib/skins.js')(gulp, gutil);
  var sandboxApi = require('../lib/sandbox-api-hack.js')(gulp, gutil);

  var watchOpts = { debounceTimeout: 250 };

  function refreshServer(file) {
    gutil.log(gutil.colors.cyan('Staging file for upload: ', file.path));
    sandboxApi.syncPlugin().then(function () {
      var reloadQuery = sandboxApi.createReloadQuery(file.relative);
      return sandboxApi.refreshPlugin(reloadQuery);
    }).then(function () {
      livereload().reload(file);
    });
  }

  function watchSrc(src) {
    src = Array.isArray(src) ? src : [src];
    src = src.concat(gutil.env.watchResIgnore || []);
    // Used for debugging
    // gulp.src(src, { read: false }).pipe(filelog()).pipe(gulp.dest('.tmp/test'));
    return src;
  }

  gulp.task('watch', [
    'watch-scripts',
    'watch-script-tpls',
    'watch-script-deps',
    'watch-text',
    'watch-res',
    'watch-res-sass',
    'watch-web',
    'watch-activecast'
  ]);

  gulp.task('watch-scripts', function (cb) {
    watch()(watchSrc([scripts.JS_MAIN_PATTERN]), watchOpts, function (file) {
      var startTime = process.hrtime();
      gutil.log('Starting script compile');
      return scripts.processScripts(file.path,
          scripts.PLUGIN_SCRIPTS_PATH + '/' + (file.relative.replace(file.basename, '')),
        [file.path], true, true, true).on('end', function () {
          if (!server.useLocalCompile()) {
            refreshServer(file.path);
          } else {
            livereload().reload(file.path);
          }
          gutil.log('Completed script compile in: ' + gutil.colors.green(prettyTime()(process.hrtime(startTime))));
        });
    });
    cb();
  });

  gulp.task('watch-script-tpls', function (cb) {
    watch()(watchSrc(scripts.TPL_PATTERN), watchOpts, function (file) {
      var startTime = process.hrtime();
      gutil.log('Starting script tpl compile');
      return scripts.processTpls(file.path, scripts.PLUGIN_SCRIPTS_PATH,
        [file.path], true).on('end', function () {
          if (!server.useLocalCompile()) {
            refreshServer(file);
          } else {
            livereload().reload(file);
          }
          gutil.log('Completed script tpl compile in: ' + gutil.colors.green(prettyTime()(process.hrtime(startTime))));
        });
    });
    cb();
  });

  gulp.task('watch-script-deps', function (cb) {
    watch()(watchSrc('./sdk.conf.json'), watchOpts, function (file) {
      return scripts.createDepsMetadata(
        scripts.PLUGIN_SCRIPTS_PATH,
        scripts.SCRIPT_DEPENDENCIES_PATH,
        true
      ).on('end', function () { refreshServer(file); });
    });
    cb();
  });

  gulp.task('watch-text', function (cb) {
    var textPropPattern = gutil.env.ng.textProperties.map(function (dir) {
      return path().join(dir, text.FILES_PATTERN);
    });

    // TODO: currently goes through all files -
    // try optimizing this for processing updated file only
    watch()(watchSrc(textPropPattern), watchOpts, function (file) {
      return text.processText(textPropPattern, 'plugin/res/lang/feature')
        .on('end', function () { refreshServer(file); });
    });
    cb();
  });

  gulp.task('watch-res', function (cb) {
    watch()(watchSrc('res/**/*.{js,json,xml}'), watchOpts, function (file) {
      fs.copy(file.path, file.path.replace(process.cwd(), 'plugin'), function () { refreshServer(file); });
    });
    cb();
  });

  gulp.task('watch-res-sass', function (cb) {
    watch()(watchSrc(['res/**/' + server.localSkinCompileVersion() + '/**/*.{scss,properties}']), watchOpts, function (file) {
      if (server.useLocalCompile()) {
        var startTime = process.hrtime();

        skins.compile(false, livereload()).then(function () {
          gutil.log('Completed sass skin compile in: ' + gutil.colors.green(prettyTime()(process.hrtime(startTime))));
        });
      } else {
        fs.copy(file.path, file.path.replace(process.cwd(), 'plugin'));
        refreshServer(file);
      }
    });
    cb();
  });

  gulp.task('watch-web', function (cb) {
    watch()(watchSrc('web/**/*.*'), watchOpts, function (file) {
      return fs.copy(file.path, file.path.replace(process.cwd(), 'plugin'), function () { refreshServer(file); });
    });
    cb();
  });

  gulp.task('watch-activecast', function () {
    watch()('plugin/web/html/assets/js/activecast/activecast.js', watchOpts, function (file) {
      refreshServer(file);
    });

    watch()('plugin/web/html/assets/js/activecast/tracker.js', watchOpts, function (file) {
      refreshServer(file);
    });
  });
};
