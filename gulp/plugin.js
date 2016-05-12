'use strict';

var lazyReq = require('lazy-req')(require);
var inquirer = lazyReq('inquirer');
var through = lazyReq('through2');
var path = lazyReq('path');
var runSequence = require('run-sequence');
var rsync = require('../lib/rsync.js');
var _ = require('lodash');
var extend = require('node.extend');

module.exports = function (gulp, gutil) {
  var pluginUpload = require('../lib/plugin-upload.js')(gulp, gutil);
  var sandboxApi = require('../lib/sandbox-api-hack.js')(gulp, gutil);
  var plugin = require('../lib/plugin-create.js')(gulp, gutil);
  var gitVersion = require('../lib/git-version.js')(gulp, gutil);

  runSequence = runSequence.use(gulp);

  function handleRsyncError(cb) {
    gutil.log(gutil.colors.red('Failed to sync files'));
    cb();
  }

  gulp.task('plugin-git-version', function (cb) {
    if (false && gutil.env.gitStatusVersion) {
      return gitVersion.create('plugin');
    } else {
      cb();
    }
  });

  gulp.task('plugin-build-res', function (cb) {
    rsync('res', 'plugin').then(function () { cb(); }, function () { handleRsyncError(cb); });
  });

  gulp.task('plugin-build-web', function (cb) {
    rsync('web', 'plugin').then(function () { cb(); }, function () { handleRsyncError(cb); });
  });

  /* plugin task */
  gulp.task('plugin-build', function (cb) {
    runSequence([
      'plugin-build-res',
      'plugin-build-web',
      'plugin-git-version',
      'scripts',
      'skins',
      'text'],
    cb);
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
          extend(query, sandboxApi.createReloadQuery(filePath));
        });
      }
      return sandboxApi.refreshPlugin(query);
    });
  });

  gulp.task('plugin-dev-refresh-all', ['plugin-dev-sync'], function () {
    return sandboxApi.refreshPlugin({ all: true });
  });

  // SDK dev flow - upload
  gulp.task('plugin-upload', ['plugin-verify'], function () {
    return pluginUpload.upload();
  });

  // SDK dev flow - package
  gulp.task('plugin-package', ['plugin-verify']);

  // Core dev flow
  gulp.task('default', [
    'plugin-dev-refresh',
    'watch',
    'local-server'
  ]);
};
