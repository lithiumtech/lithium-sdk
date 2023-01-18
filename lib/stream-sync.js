'use strict';

var through = require('through2').obj;
var gutil = require('gulp-util');

module.exports = function (options, done, functions) {
  if (options instanceof Array && functions === undefined) {
    functions = options;
    options = {};
  }
  var output  = through();
  var errorsMap = [];
  var execute = function (i) {
    if (i < functions.length) {
      errorsMap.push([]);
      functions[i](done)
      .on('end', function () {
        if (output) {
          execute(i + 1);
        } else {
          output.emit('end');
        }
      })
      .on('data', function () {
        //continue
      })
      .on('readable', function () {
        //continue
      })
      .on('close', function () {
        //continue
      })
      .on('error', function (error) {
        if (options.hasOwnProperty('collateErrors') && options.collateErrors) {
          errorsMap[i].push(error);
        } else if (options.hasOwnProperty('ignoreErrors') && options.ignoreErrors) {
          //continue
        } else {
          output.emit('error', error);
          output = false;
        }
      });
    } else {
      var errorMessage = '';
      errorsMap.forEach(function (errors, i) {
        errors.forEach(function (error) {
          if (error instanceof gutil.PluginError) {
            errorMessage = errorMessage +
              '[Stream ' + i + '] Error in script \'' +
                gutil.colors.cyan(error.plugin) + '\': ' + error.message + '\n';
          } else {
            errorMessage = errorMessage + error + '\n';
          }
        });
      });
      if (errorMessage.length > 0) {
        output.emit('error',
          new gutil.PluginError(
            'stream-sync',
            'Errors\n' + errorMessage,
            { showStack: false }
          ));
      }
      output.emit('end');
    }
  };

  if (functions.length > 0) {
    execute(0);
  } else {
    output.emit('end');
  }

  return output;

};
