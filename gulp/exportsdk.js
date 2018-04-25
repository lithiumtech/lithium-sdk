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

    function exportPlugin(pluginPointAnswers) {
        if (!pluginExport) {
            pluginExport = require('../lib/plugin-export.js')(gulp, gutil);
        }

        var server = getPluginServer().getServer();

        return pluginExport.exportPlugin(server, {
            pluginType: 'sdk',
            doClear: false,
            verboseMode: gutil.env.verbose,
            debugMode: gutil.env.debug,
            sdkOutputDir: gutil.env.todir || server.sdkOutputDir()
        }, pluginPointAnswers, function() {});
    }

    gulp.task('sdk-plugin-export', ['clean','version-check'], function () {
        var stream = through().obj();
        var server = getPluginServer().getServer();
        if ((gutil.env.force || server.force()) && !gutil.env.prompt) {
            exportPlugin(getPluginServer().getPluginPoints()).pipe(stream);
        } else {
            inquirer().prompt({
                name: 'pluginExport',
                message: 'Are you sure you would like to download the entire sdk plugin?',
                type: 'confirm'
            }, function (answers) {
                if (answers.pluginExport) {
                    exportPlugin(getPluginServer().getPluginPoints()).pipe(stream);
                } else {
                    stream.end();
                }
            });
        }

        return stream;
    });

    gulp.task('exportsdk', ['sdk-plugin-export']);
};
