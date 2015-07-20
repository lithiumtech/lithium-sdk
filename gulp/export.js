'use strict';

var lazyReq = require('lazy-req')(require);
var inquirer = lazyReq('inquirer');
var through = lazyReq('through2');

module.exports = function (gulp, gutil) {
	var pluginExport, pluginPointChoices;

	function exportPlugin(stream, pluginPointAnswers) {
		if (!pluginExport) {
        	pluginExport = require('../lib/plugin-export.js')(gulp, gutil);
      	}
      	
      	pluginExport.exportPlugin(pluginPointAnswers);
	}

	function pluginPoint(pointName) {
		return {
			name: pointName
		};
	}

	gulp.task('plugin-export', ['clean'], function () {
    	var stream = through().obj();
    	if (gutil.env['force']) {
      		exportPlugin(stream);
    	} else {
      		inquirer().prompt({
        		name: 'pluginExport',
        		message: 'Would you like to download the entire studio plugin?',
        		type: 'confirm'
      		}, function (answers) {
        		if (answers.pluginExport) {
          			exportPlugin(stream);
        		} else {
        			if (!pluginPointChoices) {
        				pluginPointChoices = [
        					pluginPoint('asset'),
        					pluginPoint('badge_icon'),
        					pluginPoint('component'),
        					pluginPoint('endpoint'),
        					pluginPoint('init'),
        					pluginPoint('layout'),
        					pluginPoint('macro'),
        					pluginPoint('quilt'),
        					pluginPoint('rank_icon'),
        					pluginPoint('skin'),
        					pluginPoint('text')
        				];
        			}
        			inquirer().prompt({
        				name: 'pluginPoints',
        				message: 'What plugin points would you like to download? (choose up to 5)',
        				type: 'checkbox',
        				choices: pluginPointChoices,
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
							exportPlugin(stream, answers);
						} else {
							stream.end();
						}
					});
        		}
      		});
    	}

    	return stream;
  	});

	gulp.task('export', ['plugin-export']);
};