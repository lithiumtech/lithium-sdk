'use strict';

var lazyReq = require('lazy-req')(require);
var inquirer = lazyReq('inquirer');
var through = lazyReq('through2');
var putils = require('../lib/plugin-utils');

module.exports = function (gulp, gutil) {
  var responsiveOptions, pluginServer;

  function getPluginServer() {
    if (!pluginServer) {
      pluginServer = require('../lib/plugin-server.js')(gulp, gutil);
    }

    return pluginServer;
  }

  function getResponsiveOptions() {
    if (!responsiveOptions) {
      responsiveOptions = require('../lib/responsive-options.js')(gulp, gutil);
    }

    return responsiveOptions;
  }

  function getOptions(cb) {
    var server = getPluginServer().getServer();
    getResponsiveOptions().handleOptions(server, {
      pluginType: 'responsive',
      doPut: false,
      noCache: true,
      skinOpts: {},
      verboseMode: gutil.env['verbose'],
      debugMode: gutil.env['debug'],
      configDir: gutil.env['configdir'] || server.configDir()
    }, cb);
  }

  function getOptionsWithPrompt(cb) {
    getResponsiveOptions().handleOptionsWithPrompt(getPluginServer().getServer(), cb);
  }

  function repsonsiveGulpTask(doPut) {
    var stream = through().obj();

    if (!doPut) {
      return getOptions(function(config) {
        var successMsg = 'found config.';
        putils.logSuccess(gutil, successMsg);
      });
    } else {
      getOptionsWithPrompt(new function() {});
    }

    return stream;
  }

  gulp.task('responsive-options-set', ['clean','version-check'], function () {
    return repsonsiveGulpTask(true);
  });

  gulp.task('responsive-options', ['responsive-options-set']);
};