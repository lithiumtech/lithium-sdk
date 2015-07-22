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

  function clearPlugin(stream) {
    if (!pluginExport) {
      pluginExport = require('../lib/plugin-export.js')(gulp, gutil);
    }
    
    pluginExport.exportPlugin('sdk', true, gutil.env['verbose'], getPluginServer().getServer());
  }

  gulp.task('sdk-clear', ['clean'], function () {
    var stream = through().obj();
    var server = getPluginServer().getServer();
    if ((gutil.env['force'] || server.force()) && !gutil.env['prompt']) {
      clearPlugin(stream);
    } else {
      inquirer().prompt({
        name: 'pluginClear',
        message: 'Would you like to clear the entire sdk plugin from the server?',
        type: 'confirm'
      }, function (answers) {
        if (answers.pluginClear) {
          clearPlugin(stream);
        } else {
        	stream.end();
        }
      });
    }

    return stream;
  });

  gulp.task('clearsdk', ['sdk-clear']);
};