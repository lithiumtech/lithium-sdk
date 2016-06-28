'use strict';

var lazyReq = require('lazy-req')(require);
var livereload = lazyReq('gulp-livereload');
var watch = lazyReq('gulp-debounced-watch');
var prettyTime = lazyReq('pretty-hrtime');
var path = lazyReq('path');
var fs = require('fs-extra');

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

  gulp.task('watch', [
    'watch-scripts',
    'watch-script-tpls',
    'watch-script-deps',
    'watch-text',
    'watch-res',
    'watch-res-sass',
    'watch-web'
  ]);

  gulp.task('watch-scripts', function (cb) {
    watch()([scripts.JS_MAIN_PATTERN, scripts.TPL_DIRECTIVE_PATTERN], watchOpts, function (file) {
      var startTime = process.hrtime();
      gutil.log('Starting script compile');
      var filePath = file.path.replace('.tpl.html', '.js');
      return scripts.processScripts(filePath,
          scripts.PLUGIN_SCRIPTS_PATH + '/' + (file.relative.replace(file.basename, '')),
        [filePath], true, true, true).on('end', function () {
          if (!server.useLocalCompile()) {
            refreshServer(filePath);
          } else {
            livereload().reload(filePath);
          }
          gutil.log('Completed script compile in: ' + gutil.colors.green(prettyTime()(process.hrtime(startTime))));
        });
    });
    cb();
  });

  gulp.task('watch-script-tpls', function (cb) {
    watch()(scripts.TPL_SERVICES_PATTERN, watchOpts, function (file) {
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
    watch()('./sdk.conf.json', watchOpts, function (file) {
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
    watch()(textPropPattern, watchOpts, function (file) {
      return text.processText(textPropPattern, 'plugin/res/lang/feature')
        .on('end', function () { refreshServer(file); });
    });
    cb();
  });

  gulp.task('watch-res', function (cb) {
    watch()(['res/**', '!res/**/*.scss'], watchOpts, function (file) {
      fs.copy(file.path, file.path.replace(process.cwd(), 'plugin'), function () { refreshServer(file); });
    });
    cb();
  });

  gulp.task('watch-res-sass', function (cb) {
    watch()(['res/**/*.scss'].concat(gutil.env.watchResIgnore || []), watchOpts, function (file) {
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
    watch()('web/**', watchOpts, function (file) {
      return fs.copy(file.path, file.path.replace(process.cwd(), 'plugin'), function () { refreshServer(file); });
    });
    cb();
  });
};