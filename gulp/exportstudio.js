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
      	
      	pluginExport.exportPlugin('studio', false, gutil.env['verbose'], getPluginServer().getServer(), pluginPointAnswers);
	}

	gulp.task('studio-plugin-export', ['clean'], function () {
    	var stream = through().obj();
    	var server = getPluginServer().getServer();
    	if ((gutil.env['force'] || server.force()) && !gutil.env['prompt']) {
      		exportPlugin(getPluginServer().getPluginPoints());
    	} else {
      		inquirer().prompt({
        		name: 'pluginExport',
        		message: 'Would you like to download the entire studio plugin?',
        		type: 'confirm'
      		}, function (answers) {
        		if (answers.pluginExport) {
          			exportPlugin(getPluginServer().getPluginPoints());
        		} else {
        			inquirer().prompt({
        				name: 'pluginPoints',
        				message: 'What plugin points would you like to download? (choose up to 5)',
        				type: 'checkbox',
        				choices: getPluginServer().getPluginPointChoices(),
        				validate: function(answer) {
							if (answer.length < 1) {
								return 'You must choose at least one plugin point.';
							} else if (answer.length > 5) {
								return 'You cannot choose more than 5 plugin points.';
							}
							return true;
						},
					}, function(answers) {
						if (answers.pluginPoints) {
							exportPlugin(answers);
						} else {
							stream.end();
						}
					});
        		}
      		});
    	}

    	return stream;
  	});

	gulp.task('exportstudio', ['studio-plugin-export']);
};