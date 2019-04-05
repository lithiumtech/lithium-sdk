'use strict';

var lazyReq = require('lazy-req')(require);
var inquirer = lazyReq('inquirer');
var through = lazyReq('through2');
var path = lazyReq('path');
var runSequence = require('run-sequence');
var rsync = lazyReq('../lib/rsync.js');
var extend = lazyReq('node.extend');

module.exports = function (gulp, gutil) {
  var pluginUpload = require('../lib/plugin-upload.js')(gulp, gutil);
  var sandboxApi = require('../lib/sandbox-api-hack.js')(gulp, gutil);
  var plugin = require('../lib/plugin-create.js')(gulp, gutil);
  var gitVersion = require('../lib/git-version.js')();
  var pluginServer = require('../lib/plugin-server.js')(gulp, gutil);

  runSequence = runSequence.use(gulp);

  function handleRsyncError(e) {
    gutil.log(gutil.colors.red('Failed to sync files: ' + e));
  }

  gulp.task('plugin-git-version', function (cb) {
    if (gutil.env.gitStatusVersion) {
      gitVersion.create('plugin', cb);
    } else {
      cb();
    }
  });

  gulp.task('plugin-build-res', function (cb) {
    rsync()('../plugins/res', 'plugin').catch(handleRsyncError).finally(cb);
  });

  gulp.task('plugin-build-web', function (cb) {
    rsync()('../plugins/web', 'plugin').catch(handleRsyncError).finally(cb);
  });

  gulp.task('plugin-copy-files', function (cb) {
    if (Array.isArray(gutil.env.copyFiles)) {
      var promises = [];

      gutil.env.copyFiles
        .filter(i => i.src && i.dest)
        .map(i => promises.push(rsync()(i.src, i.dest)));

      Promise.all(promises).catch(handleRsyncError).finally(cb);
    } else {
      cb();
    }
  });

  /* plugin task */
  gulp.task('plugin-build', function (cb) {
    // HACK: When for local angular, do not clean
    // and include tasks to build scripts and text used
    // by angular based components.
    if (gutil.env.ng) {
      runSequence([
        'plugin-build-res',
        'plugin-build-web',
        'plugin-copy-files',
        'plugin-git-version',
        'scripts',
        'text'],
      cb);
    } else {
      // clean is required for plugin-upload
      runSequence('clean', [
        'plugin-build-res',
        'plugin-build-web',
        'plugin-copy-files',
        'plugin-git-version'],
      cb);
    }
  });

  gulp.task('plugin-verify', ['plugin-build'], function (cb) {
    var originalTask = gutil.env._[0];

    function pluginVerificationSuccess() {
      gutil.log(gutil.colors.green('Done compiling plugin: ' + path().join(process.cwd(), '/plugin')));
    }

    if (gutil.env.verifyPlugin === false && originalTask !== 'plugin-verify') {
      pluginVerificationSuccess();
      cb();
    } else {
      return plugin.verify().on('end', pluginVerificationSuccess);
    }
  });

  gulp.task('plugin-dev-sync', ['plugin-verify'], function () {
    return sandboxApi.syncPlugin();
  });

  gulp.task('plugin-dev-refresh', ['plugin-verify'], function () {
    return sandboxApi.syncPlugin().then(function (filesChanged) {
      var query = {};
      if (filesChanged) {
        filesChanged.forEach(function (filePath) {
          extend()(query, sandboxApi.createReloadQuery(filePath));
        });
      }
      return sandboxApi.refreshPlugin(query);
    });
  });

  gulp.task('plugin-dev-refresh-all', ['plugin-dev-sync'], function () {
    return sandboxApi.refreshPlugin({ all: true });
  });

  gulp.task('plugin-ready', ['plugin-verify'], function (cb) {
    gutil.log(gutil.colors.green('Done compiling plugin: ' +
    path().join(process.cwd(), '/plugin')));
    cb();
  });

  // SDK dev flow - upload
  gulp.task('plugin-upload', ['plugin-ready'], function () {
    var stream = through().obj();
    var server = pluginServer.getServer();
    var uploadCallBack = function() {
      if ((gutil.env.force || server.force()) && !gutil.env.prompt) {
        console.log('forced!');
        pluginUpload.upload(server, {
          debugMode: gutil.env.debug
        }).pipe(stream);
      } else {
        inquirer().prompt({
          name: 'pluginUpload',
          message: 'Would you like to upload plugin to server?',
          type: 'confirm'
        }, function (answers) {
          if (answers.pluginUpload) {
            pluginUpload.upload(server, {
              debugMode: gutil.env.debug
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
  });

  // SDK dev flow - package
  gulp.task('plugin-package', ['plugin-verify']);

  // Core dev flow
  gulp.task('default', [
    'plugin-dev-refresh',
    'watch',
    'local-server',
    'skins'
  ]);

  gulp.task('serve-sass', ['skins-compile', 'watch-res-sass', 'local-server']);
};
