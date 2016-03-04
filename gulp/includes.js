'use strict';

var extensions = {
  'lithium-sdk-doctools': [
    'ngdoc',
    'ngdoc-build',
    'ngdoc-server'
  ],
  'lithium-sdk-kss-doctools': [
    'kss',
    'kss-build',
    'kss-server'
  ]
};

module.exports = function (req) {

  var gulp = req('gulp');
  var startTime = process.hrtime();
  var prettyTime = require('pretty-hrtime');
  var gutil = require('../lib/env-util.js')(gulp);

  require('./clean.js')(gulp, gutil);
  require('./plugin.js')(gulp, gutil);
  require('./test.js')(gulp, gutil);
  require('./sandbox.js')(gulp, gutil);
  require('./generate.js')(gulp, gutil);
  require('./project.js')(gulp, gutil);
  require('./exportstudio.js')(gulp, gutil);
  require('./clearstudio.js')(gulp, gutil);
  require('./exportsdk.js')(gulp, gutil);
  require('./clearsdk.js')(gulp, gutil);
  require('./exportcore.js')(gulp, gutil);
  require('./versioncheck')(gulp, gutil);

  Object.getOwnPropertyNames(extensions).forEach(function (ext) {
    try {
      req(ext + '/gulp/includes')(gulp, gutil);
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND') {
        throw err;
      } else {
        extensions[ext].forEach(function (task) {
          gulp.task(task, [], function () {
            var cyan = gutil.colors.cyan;
            var yellow = gutil.colors.yellow;
            var red = gutil.colors.red;
            var taskOutput = yellow('[' + task + ']');
            var extOutput = yellow('[' + ext + ']');

            gutil.log(cyan('Gulp task ') + taskOutput + cyan(' requires ext ') + extOutput +
                cyan('. Please run the following command from the current directory.'));
            gutil.log(red('npm install lithiumtech/' + ext));
            process.exit(1);
          });
        });
      }
    }
  });

  gutil.log('Loaded gulp tasks in: ' + gutil.colors.green(prettyTime(process.hrtime(startTime))));
};
