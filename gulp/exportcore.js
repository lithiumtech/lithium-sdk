'use strict';

var lazyReq = require('lazy-req')(require);
var inquirer = lazyReq('inquirer');
var through = lazyReq('through2');

module.exports = function (gulp, gutil) {
  var pluginExport, pluginServer;

  function getPluginServer() {
    if (!pluginServer) {
      pluginServer = require('../lib/plugin-server.js')(gulp, gutil);
    }

    return pluginServer;
  }

  function exportPlugin() {
    if (!pluginExport) {
      pluginExport = require('../lib/plugin-export.js')(gulp, gutil);
    }

    var server = getPluginServer().getServer();

    return pluginExport.exportPlugin(server, {
      pluginType: 'core',
      doClear: false,
      verboseMode: gutil.env['verbose'],
      debugMode: gutil.env['debug'],
      coreOutputDir: gutil.env['todir'] || server.coreOutputDir()
    }, undefined, function() {});
  }

  gulp.task('core-plugin-export', gulp.series('clean','version-check', function () {
    var stream = through().obj();
    var server = getPluginServer().getServer();
    if ((gutil.env['force'] || server.force()) && !gutil.env['prompt']) {
      exportPlugin().pipe(stream);
    } else {
      inquirer().prompt({
        name: 'pluginExport',
        message: 'Are you sure you would like to download the entire core plugin?',
        type: 'confirm'
      }, function (answers) {
        if (answers.pluginExport) {
          exportPlugin().pipe(stream);
        } else {
          stream.end();
        }
      });
    }

    return stream;
  }));

  gulp.task('exportcore', gulp.series('core-plugin-export'));
};