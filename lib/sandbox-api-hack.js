'use strict';

var lazyReq = require('lazy-req')(require);
var request = lazyReq('request-promise');
var minimatch = lazyReq('minimatch');
var rsync = lazyReq('./rsync');

module.exports = function(gulp, gutil) {
  var ENDPOINT_PATTERN_MAP = {
    'skins/images': ['**/skins/**/images/**'],
    skins: ['**/skins/**'],
    quilts: ['**/quilts/**'],
    layouts: ['**/layouts/**'],
    orders: ['**/orders/**'],
    'components.definition': ['**/feature/component-definition.xml'],
    features: ['**/feature/feature-definition.xml', '**/feature/feature.xml'],
    forms: ['**/forms/**'],
    lang: ['**/lang/**', '**/*.text.*.json', '**/text.*.json'],
    components: ['**/components/**'],
    scripts: ['**/*.{js,tpl.html}', '**/sdk.conf.json', '**/dependencies.json'],
    'components.dependencies': ['**/component-dependencies.json'],
    prefetch: ['**/prefetch/**']
  };

  var server;

  function getServer() {
    if (server) {
      return server;
    }

    var error = false;
    try {
      server = require('../lib/server.js')(gulp, gutil);
      if (server.serverUrl() === undefined) {
        gutil.log(
          gutil.colors.red(
            'A server URL is required in your configuration. ' +
              'Please use template.server.conf.json to create server.conf.json.'
          )
        );
        error = true;
      }
      if (server.sandboxPluginDir() === undefined) {
        gutil.log(
          gutil.colors.red(
            'A sandboxPluginDir is required in your configuration. ' +
              'Please use template.server.conf.json to create server.conf.json.'
          )
        );
        error = true;
      }
    } catch (err) {
      gutil.log(gutil.colors.red(err.message));
      error = true;
    }
    if (error) {
      process.exit(1);
    }
    return server;
  }

  function createReloadQuery(path) {
    var query = {};
    var found = false;

    Object.keys(ENDPOINT_PATTERN_MAP).forEach(function(key) {
      if (found) {
        return;
      }
      ENDPOINT_PATTERN_MAP[key].forEach(function(pattern) {
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
      url: getServer().serverUrl() + getServer().pluginReloadUrl(),
      qs: reload.all ? { all: true } : reload,
      json: true
    })
      .then(function(res) {
        if (res.reloaded) {
          gutil.log(
            gutil.colors.green(
              'Plugin cache cleared for [' + res.reloaded + '] assets, app is READY!'
            )
          );
        } else {
          gutil.log(gutil.colors.red('Failed to reload plugin. ' + res));
        }
      })
      .catch(function() {
        gutil.log(
          gutil.colors.red(
            'Failed to reload plugin, please make sure your server.conf.json is configured ' +
              'properly, the "phase" config for your community is set to "dev", and your community is started.'
          )
        );
      });
  }

  function syncPlugin() {
    var pluginDir = gutil.env.newStructure ? '../dist/plugin/' : 'plugin/';
    return rsync()(pluginDir, getServer().sandboxPluginDir()).catch(function(e) {
      gutil.log(gutil.colors.red('Failed to sync files: ' + e));
    });
  }

  return {
    syncPlugin: syncPlugin,
    refreshPlugin: refreshPlugin,
    createReloadQuery: createReloadQuery
  };
};
