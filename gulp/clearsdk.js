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

  function clearPlugin() {
    if (!pluginExport) {
      pluginExport = require('../lib/plugin-export.js')(gulp, gutil);
    }
    
    return pluginExport.exportPlugin(getPluginServer().getServer(), {
        pluginType: 'sdk',
        doClear: true,
        verboseMode: gutil.env['verbose'],
        debugMode: gutil.env['debug']
    }, undefined, function() {});
  }

  gulp.task('sdk-clear', ['clean','version-check'], function () {
    var stream = through().obj();
    var server = getPluginServer().getServer();
    if ((gutil.env['force'] || server.force()) && !gutil.env['prompt']) {
      clearPlugin().pipe(stream);
    } else {
      inquirer().prompt({
        name: 'pluginClear',
        message: 'Would you like to clear the entire sdk plugin from the server?',
        type: 'confirm'
      }, function (answers) {
        if (answers.pluginClear) {
          clearPlugin().pipe(stream);
        } else {
        	stream.end();
        }
      });
    }

    return stream;
  });

  gulp.task('clearsdk', ['sdk-clear']);
};