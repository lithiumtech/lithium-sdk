'use strict';

var lazyReq = require('lazy-req')(require);
var inquirer = lazyReq('inquirer');
var through = lazyReq('through2');

module.exports = function (gulp, gutil) {
	var pluginExport, pluginPointChoices;

  function clearPlugin(stream, pluginPointAnswers) {
    if (!pluginExport) {
      pluginExport = require('../lib/studio-plugin-export.js')(gulp, gutil);
    }
    
    pluginExport.exportPlugin(true, gutil.env['verbose'], pluginPointAnswers);
  }

  function clearPluginFinalCheck(stream, pluginPointAnswers) {
    var msg = (typeof pluginPointAnswers === 'undefined') ? 'Are you sure you want to clear the entire studio plugin?'
      : 'Are you sure to want to clear the plugin points you selected from the studio plugin?';
    inquirer().prompt({
      name: 'pluginFinalCheck',
      message: msg,
      type: 'confirm'
    }, function (answers) {
      if (answers.pluginFinalCheck) {
        clearPlugin(stream, pluginPointAnswers);
      } else {
        stream.end();
      }
    });
  }

	function pluginPoint(pointName) {
		return {
			name: pointName
		};
	}

  gulp.task('plugin-clear', ['clean'], function () {
    var stream = through().obj();
    inquirer().prompt({
      name: 'pluginExport',
      message: 'Would you like to clear the entire studio plugin?',
      type: 'confirm'
    }, function (answers) {
      if (answers.pluginExport) {
        clearPluginFinalCheck(stream);
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
      		message: 'What plugin points would you like to clear? (choose up to 5)',
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
            clearPluginFinalCheck(stream, answers);
          } else {
            stream.end();
          }
        });
      }
    });

    return stream;
  });

  gulp.task('clearstudio', ['plugin-clear']);
};