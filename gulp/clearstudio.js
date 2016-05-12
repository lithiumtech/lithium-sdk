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

  function clearPlugin(pluginPointAnswers) {
    if (!pluginExport) {
      pluginExport = require('../lib/plugin-export.js')(gulp, gutil);
    }
    
    return pluginExport.exportPlugin(getPluginServer().getServer(), {
        pluginType: 'studio',
        doClear: true,
        verboseMode: gutil.env.verbose,
        debugMode: gutil.env.debug
    }, pluginPointAnswers, function() {});
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
        clearPlugin(pluginPointAnswers).pipe(stream);
      } else {
        stream.end();
      }
    });
  }

  gulp.task('plugin-clear', ['clean'], function () {
    var stream = through().obj();
    var server = getPluginServer().getServer();
    if ((gutil.env.force || server.force()) && !gutil.env.prompt) {
      clearPlugin(getPluginServer().getPluginPoints()).pipe(stream);
    } else {
      inquirer().prompt({
        name: 'pluginExport',
        message: 'Would you like to clear the entire studio plugin?',
        type: 'confirm'
      }, function (answers) {
        if (answers.pluginExport) {
          clearPluginFinalCheck(stream, getPluginServer().getPluginPoints());
        } else {
          inquirer().prompt({
            name: 'pluginPoints',
            message: 'What plugin points would you like to clear? (choose up to 5)',
            type: 'checkbox',
            choices: getPluginServer().getPluginPointChoices(),
            validate: function(answer) {
              if (answer.length < 1) {
                return 'You must choose at least one plugin point.';
              } else if (answer.length > 5) {
                return 'You cannot choose more than 5 plugin points.';
              }

              return true;
            }
          }, function(answers) {
            if (answers.pluginPoints) {
              clearPluginFinalCheck(stream, answers);
            } else {
              stream.end();
            }
            });
        }
      });
    }

    return stream;
  });

  gulp.task('clearstudio', ['plugin-clear']);
};