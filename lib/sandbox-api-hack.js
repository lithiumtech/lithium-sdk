'use strict';

var lazyReq = require('lazy-req')(require);
var request = lazyReq('request-promise');
var through = require('through2').obj;
var spawn = require('child_process').spawn;
var path = require('path');
var is = require('is_js');
var del = lazyReq('del');
var minimatch = lazyReq('minimatch');

module.exports = function (gulp, gutil) {
  var ENDPOINT_PATTERN_MAP = {
    'skins/images': ['**/skins/**/images/**'],
    skins: ['**/skins/**'],
    quilts: ['**/quilts/**'],
    layouts: ['**/layouts/**'],
    lang: ['**/lang/**'],
    components: ['**/components/**'],
    scripts: ['**/*.{js,tpl}', '**/sdk.conf.json']
  };

  var server;
  var error = false;
  try {
    server = require('../lib/server.js')(gulp, gutil);
    if (server.serverUrl() === undefined) {
      gutil.log(gutil.colors.red('A server URL is required in your configuration. ' +
        'Please use template.server.conf.json to create server.conf.json.'));
      error = true;
    }
    if (server.sandboxPluginDir() === undefined) {
      gutil.log(gutil.colors.red('A sandboxPluginDir is required in your configuration. ' +
        'Please use template.server.conf.json to create server.conf.json.'));
      error = true;
    }
  } catch (err) {
    gutil.log(gutil.colors.red(err.message));
    error = true;
  }
  if (error) {
    process.exit(1);
  }

  function createReloadQuery(path) {
    var query = {};
    var found = false;

    Object.keys(ENDPOINT_PATTERN_MAP).forEach(function (key) {
      if (found) { return; };
      ENDPOINT_PATTERN_MAP[key].forEach(function (pattern) {
        if (minimatch()(path, pattern)) {
          query[key] = found = true;
        }
      });
    });

    if (!found) {
      query.all = true;
    }

    return query;
  }

  function refreshPlugin(reload) {
    return request()({
      url: server.serverUrl() + server.pluginReloadUrl(),
      qs: reload.all ? { all: true } : reload,
      json: true
    }).then(function (res) {
      if (res.reloaded) {
        gutil.log(gutil.colors.green('Plugin cache cleared for [' + res.reloaded + '] assets, app is READY!'));
      } else {
        gutil.log(gutil.colors.red('Failed to reload plugin. ' + res));
      }
    }).catch(function (e) {
      gutil.log(gutil.colors.red('Failed to reload plugin, please make sure your server.conf.json is configured' +
          'properly, the "phase" config for your community is set to "dev", and your community is started.'));
    });
  }

  function deletePlugin() {
    return del()([server.sandboxPluginDir() + '/res', server.sandboxPluginDir() + '/web'], { force: true });
  }

  function syncPlugin() {
    return new Promise(function (resolve, reject) {
      spawn('rsync', ['-r', 'plugin/', server.sandboxPluginDir()], {
        cwd: './',
        stdio: ['pipe', 'ignore', 'inherit']
      }).on('close', function (code) {
        if (code === 0) {
          resolve();
        } else {
          gutil.log(gutil.colors.red('Failed to upload files'));
          reject();
        }
      });
    });
  }

  return {
    deletePlugin: deletePlugin,
    syncPlugin: syncPlugin,
    refreshPlugin: refreshPlugin,
    createReloadQuery: createReloadQuery
  };
};
