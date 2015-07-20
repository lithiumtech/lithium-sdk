'use strict';

var extensions = {
  'lithium-sdk-doctools': [
    'ngdoc-build',
    'ngdoc-server'
  ],
  'lithium-sdk-kss-doctools': [
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
  require('./export.js')(gulp, gutil);

  Object.getOwnPropertyNames(extensions).forEach(function (ext) {
    try {
      req(ext + '/gulp/includes')(gulp, gutil);
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND') {
        throw err;
      } else {
        extensions[ext].forEach(function (task) {
          gulp.task(task, [], function () {
            console.log('Requires extension: ' + ext);
            console.log('run \'npm install ' + ext + ' --save\'');
            throw err;
          });
        });
      }
    }
  });

  gutil.log('Loaded gulp tasks in: ' + gutil.colors.green(prettyTime(process.hrtime(startTime))));
};
