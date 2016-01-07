'use strict';

var lazyReq = require('lazy-req')(require);
var inquirer = lazyReq('inquirer');
var through = lazyReq('through2');
var path = lazyReq('path');
var livereload = lazyReq('gulp-livereload');
var watch = lazyReq('gulp-watch');
var fs = require('fs-extra');
var runSequence = require('run-sequence');
var prettyTime = lazyReq('pretty-hrtime');

var PLUGIN_PATHS = {
  SCRIPTS: 'plugin/res/js/angularjs',
  SCRIPT_DEPENDENCIES: 'plugin/res/js/angularjs/metadata',
  TEXT: 'plugin/res/lang/feature'
};

module.exports = function (gulp, gutil) {
  var scripts, sandboxApi, text, plugin, pluginUpload, pluginServer, lrListening, skins, server;

  function getScripts() {
    return scripts ? scripts : scripts = require('../lib/scripts.js')(gulp, gutil);
  }

  function getSandboxApi() {
    return sandboxApi ? sandboxApi : sandboxApi = require('../lib/sandbox-api-hack.js')(gulp, gutil);
  }

  function getText() {
    return text ? text : text = require('../lib/text.js')(gulp, gutil);;
  }

  function getPlugin() {
    return plugin ? plugin : plugin = require('../lib/plugin-create.js')(gulp, gutil);
  }

  function getSkins() {
    return skins ? skins : skins = require('../lib/skins.js')(gulp, gutil);
  }

  function getServer() {
    return server ? server : server = require('../lib/server.js')(gulp, gutil);
  }

  runSequence = runSequence.use(gulp);

  function getPluginServer() {
    if (!pluginServer) {
      pluginServer = require('../lib/plugin-server.js')(gulp, gutil);
    }

    return pluginServer;
  }

  gulp.task('plugin-scripts', function () {
    return getScripts().process(
      [
        getScripts().JS_MAIN_PATTERN,
        getScripts().TPL_MAIN_PATTERN,
        getScripts().DEPENDENCIES
      ],
      PLUGIN_PATHS.SCRIPTS,
      undefined,
      false,
      true
    );
  });

  gulp.task('plugin-script-deps', ['plugin-scripts'], function () {
    return getScripts().createDependencies(
      PLUGIN_PATHS.SCRIPTS,
      PLUGIN_PATHS.SCRIPT_DEPENDENCIES);
  });

  gulp.task('plugin-text', function () {
    var textPropPattern = gutil.env.ng.textProperties.map(function (dir) {
      return path().join(dir, getText().FILES_PATTERN);
    });
    return getText().process(textPropPattern, PLUGIN_PATHS.TEXT);
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
    var originalTask = gutil.env._[0];
    if (gutil.env.verifyPlugin === false && originalTask !== 'plugin-verify') {
      cb();
    } else {
      return getPlugin().verify();
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
    return getSandboxApi().deletePlugin();
  });

  gulp.task('plugin-dev-sync', ['plugin-dev-clean', 'plugin-ready'], function (cb) {
    return getSandboxApi().syncPlugin();
  });

  gulp.task('plugin-dev-refresh', ['plugin-dev-sync'], function (cb) {
    return getSandboxApi().refreshPlugin({ all: true });
  });

  function startLr() {
    if (!lrListening) {
      lrListening = true;
      livereload().listen();
    }
  }

  function addWatch(pattern, callback, cb, usePluginCacheClear) {
    startLr();

    watch()(pattern, function (file) {
      callback(file, function () {
        if (usePluginCacheClear) {
          gutil.log(gutil.colors.cyan('Staging file for upload: ', file.path));
          getSandboxApi().syncPlugin().then(function () {
            var reloadQuery = getSandboxApi().createReloadQuery(file.relative);
            return getSandboxApi().refreshPlugin(reloadQuery);
          }).then(function () {
            livereload().reload(file);
          });
        }
      });
    });
    cb();
  }

  gulp.task('watch-scripts', function (cb) {
    addWatch(
      [getScripts().JS_MAIN_PATTERN, getScripts().TPL_MAIN_PATTERN],
      function (file, done) {
        return getScripts().process(
          [getScripts().JS_MAIN_PATTERN, getScripts().TPL_MAIN_PATTERN],
          PLUGIN_PATHS.SCRIPTS,
          [file.path],
          true,
          true
        ).on('end', done);
      },
      cb,
      true
    );
  });

  gulp.task('watch-script-deps', ['plugin-ready'], function (cb) {
    addWatch(
      './sdk.conf.json',
      function (file, done) {
        return getScripts().createDependencies(
          PLUGIN_PATHS.SCRIPTS,
          PLUGIN_PATHS.SCRIPT_DEPENDENCIES,
          true
        ).on('end', done);
      },
      cb,
      true
    );
  });

  gulp.task('watch-text', function (cb) {
    var textPropPattern = gutil.env.ng.textProperties.map(function (dir) {
      return path().join(dir, getText().FILES_PATTERN);
    });
    // TODO: currently goes through all files -
    // try optimizing this for processing updated file only
    addWatch(
      textPropPattern,
      function (file, done) {
        return getText().process(textPropPattern, PLUGIN_PATHS.TEXT).on('end', done);
      },
      cb,
      true
    );
  });

  gulp.task('watch-res', function (cb) {
    addWatch(
      ['res/**', '!res/**/*.scss'].concat(gutil.env.watchResIgnore || []),
      function (file, done) {
        fs.copy(file.path, file.path.replace(process.cwd(), 'plugin'), done);
      },
      cb,
      true
    );
  });

  gulp.task('watch-res-sass', function (cb) {
    if (getServer().useLocalCompile()) {
      startLr();
      getSkins().compile();
      getSkins().server();
    }

    addWatch(
        ['res/**/*.scss'].concat(gutil.env.watchResIgnore || []),
        function (file, done) {
          if (getServer().useLocalCompile()) {
            var startTime = process.hrtime();
            gutil.log('Starting sass skin compile');
            getSkins().compile(livereload()).on('end', function () {
              gutil.log('Completed sass skin compile in: ' + gutil.colors.green(prettyTime()(process.hrtime(startTime))));
              done();
            });
          } else {
            fs.copy(file.path, file.path.replace(process.cwd(), 'plugin'), done);
          }
        },
        cb,
        !getServer().useLocalCompile()
    );
  });

  gulp.task('watch-web', function (cb) {
    addWatch(
      'web/**',
      function (file, done) {
        fs.copy(file.path, file.path.replace(process.cwd(), 'plugin'), done);
      },
      cb,
      true
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
    'watch-res-sass',
    'watch-web'
  ]);

  gulp.task('default', ['dev']);

};
