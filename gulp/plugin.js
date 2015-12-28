'use strict';

var lazyReq = require('lazy-req')(require);
var inquirer = lazyReq('inquirer');
var through = lazyReq('through2');
var path = lazyReq('path');
var livereload = lazyReq('gulp-livereload');
var watch = lazyReq('gulp-watch');
var fs = require('fs-extra');
var runSequence = require('run-sequence');

var PLUGIN_PATHS = {
  SCRIPTS: 'plugin/res/js/angularjs',
  SCRIPT_DEPENDENCIES: 'plugin/res/js/angularjs/metadata',
  TEXT: 'plugin/res/lang/feature'
};

module.exports = function (gulp, gutil) {
  var text, plugin, pluginUpload, pluginServer, lrListening;

  var scripts = require('../lib/scripts.js')(gulp, gutil);
  var sandboxApi = require('../lib/sandbox-api-hack.js')(gulp, gutil);
  var text = require('../lib/text.js')(gulp, gutil);
  var plugin = require('../lib/plugin-create.js')(gulp, gutil);

  runSequence = runSequence.use(gulp);

  function getPluginServer() {
    if (!pluginServer) {
      pluginServer = require('../lib/plugin-server.js')(gulp, gutil);
    }

    return pluginServer;
  }

  gulp.task('plugin-scripts', function () {
    return scripts.process(
      [
        scripts.JS_MAIN_PATTERN,
        scripts.TPL_MAIN_PATTERN,
        scripts.DEPENDENCIES
      ],
      PLUGIN_PATHS.SCRIPTS,
      undefined,
      false,
      true
    );
  });

  gulp.task('plugin-script-deps', ['plugin-scripts'], function () {
    return scripts.createDependencies(
      PLUGIN_PATHS.SCRIPTS,
      PLUGIN_PATHS.SCRIPT_DEPENDENCIES);
  });

  gulp.task('plugin-text', function () {
    var textPropPattern = gutil.env.ng.textProperties.map(function (dir) {
      return path().join(dir, text.FILES_PATTERN);
    });
    return text.process(textPropPattern, PLUGIN_PATHS.TEXT);
  });

  gulp.task('plugin-git-version', function (cb) {
    if (gutil.env.gitStatusVersion) {
      var gitVersion = require('../lib/git-version.js')(gulp, gutil);
      return gitVersion.create('plugin');
    } else {
      cb();
      return gutil.noop();
    }
  });

  gulp.task('plugin-ng', [
    'plugin-script-deps',
    'plugin-text'
  ]);

  gulp.task('plugin-res', gutil.env.ng ? ['plugin-ng'] : [], function () {
    return gulp.src(['res/**', '!res/**/README.md', '!res/**/*.example'])
      .pipe(gulp.dest('plugin/res'));
  });

  gulp.task('plugin-web', gutil.env.ng ? ['plugin-ng'] : [], function () {
    return gulp.src(['web/**', '!web/**/README.md', '!web/**/*.example'])
      .pipe(gulp.dest('plugin/web'));
  });

  /* plugin task */
  gulp.task('plugin-build', function (cb) {
    runSequence('clean',
      [
        'plugin-res',
        'plugin-web',
        'plugin-git-version'
      ],
      cb);
  });

  gulp.task('plugin-verify', ['plugin-build'], function (cb) {
    if (gutil.env.verifyPlugin === false) {
      cb();
    } else {
      return plugin.verify();
    }
  });

  gulp.task('plugin-ready', ['plugin-verify'], function (cb) {
    gutil.log(gutil.colors.green('Done compiling plugin: ' +
      path().join(process.cwd(), '/plugin')));
    cb();
  });

  gulp.task('plugin-upload', ['plugin-ready'], function () {
    var stream = through().obj();
    var server = getPluginServer().getServer();
    var uploadCallBack = function() {
      if ((gutil.env['force'] || server.force()) && !gutil.env['prompt']) {
        if (!pluginUpload) {
          pluginUpload = require('../lib/plugin-upload.js')(gulp, gutil);
        }
        pluginUpload.upload(server, {
          debugMode: gutil.env['debug']
        }).pipe(stream);
      } else {
        inquirer().prompt({
          name: 'pluginUpload',
          message: 'Would you like to upload plugin to server?',
          type: 'confirm'
        }, function (answers) {
          if (answers.pluginUpload) {
            if (!pluginUpload) {
              pluginUpload = require('../lib/plugin-upload.js')(gulp, gutil);
            }
            pluginUpload.upload(server, {
              debugMode: gutil.env['debug']
            }).pipe(stream);
          } else {
            stream.end();
          }
        });
      }
      return stream;
    };

    if (!gutil.env['skip-version-check']) {
        var versioncheck = require('../lib/version-check.js')(gulp, gutil);
        versioncheck.validate(server.serverUrl(), server.pluginToken(), server, uploadCallBack);
    } else {
        uploadCallBack();
    }
    return;
  });

  var pluginTaskDependencies = [];

  if (gutil.env['skip-upload']) {
    pluginTaskDependencies.push('plugin-ready');
  } else {
    pluginTaskDependencies.push('plugin-upload');
  }
  gulp.task('plugin', pluginTaskDependencies);

  gulp.task('plugin-dev-clean', function () {
    return sandboxApi.deletePlugin();
  });

  gulp.task('plugin-dev-sync', ['plugin-dev-clean', 'plugin-ready'], function (cb) {
    return sandboxApi.syncPlugin();
  });

  gulp.task('plugin-dev-refresh', ['plugin-dev-sync'], function (cb) {
    return sandboxApi.refreshPlugin({ all: true });
  });

  function addWatch(pattern, callback, cb) {
    if (!lrListening) {
      lrListening = true;
      livereload().listen();
    }

    watch()(pattern, function (file) {
      callback(file, function () {
        gutil.log(gutil.colors.cyan('Staging file for upload: ', file.path));

        sandboxApi.syncPlugin().then(function () {
          var reloadQuery = sandboxApi.createReloadQuery(file.relative);
          return sandboxApi.refreshPlugin(reloadQuery);
        }).then(function () {
          livereload().reload(file);
        });
      });
    });
    cb();
  }

  gulp.task('watch-scripts', function (cb) {
    addWatch(
      [scripts.JS_MAIN_PATTERN, scripts.TPL_MAIN_PATTERN],
      function (file, done) {
        return scripts.process(
          [scripts.JS_MAIN_PATTERN, scripts.TPL_MAIN_PATTERN],
          PLUGIN_PATHS.SCRIPTS,
          [file.path],
          true,
          true
        ).on('end', done);
      },
      cb
    );
  });

  gulp.task('watch-script-deps', ['plugin-ready'], function (cb) {
    addWatch(
      './sdk.conf.json',
      function (file, done) {
        return scripts.createDependencies(
          PLUGIN_PATHS.SCRIPTS,
          PLUGIN_PATHS.SCRIPT_DEPENDENCIES,
          true
        ).on('end', done);
      },
      cb
    );
  });

  gulp.task('watch-text', function (cb) {
    var textPropPattern = gutil.env.ng.textProperties.map(function (dir) {
      return path().join(dir, text.FILES_PATTERN);
    });
    // TODO: currently goes through all files -
    // try optimizing this for processing updated file only
    addWatch(
      textPropPattern,
      function (file, done) {
        return text.process(textPropPattern, PLUGIN_PATHS.TEXT).on('end', done);
      },
      cb
    );
  });

  gulp.task('watch-res', function (cb) {
    addWatch(
      ['res/**'].concat(gutil.env.watchResIgnore || []),
      function (file, done) {
        fs.copy(file.path, file.path.replace(process.cwd(), 'plugin'), done);
      },
      cb
    );
  });

  gulp.task('watch-web', function (cb) {
    addWatch(
      'web/**',
      function (file, done) {
        fs.copy(file.path, file.path.replace(process.cwd(), 'plugin'), done);
      },
      cb
    );
  });

  gulp.task('watch-ng', gutil.env.ng ? [
    'watch-scripts',
    'watch-script-deps',
    'watch-text'
  ] : []);

  gulp.task('dev', [
    'plugin-dev-refresh',
    'plugin-ready',
    'watch-ng',
    'watch-res',
    'watch-web'
  ]);

  gulp.task('default', ['dev']);

};
