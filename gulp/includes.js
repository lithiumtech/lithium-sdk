'use strict';

module.exports = function (gulp) {

  var startTime = process.hrtime();
  var prettyTime = require('pretty-hrtime');

  var gutil = require('../lib/env-util.js')(gulp);
  require('./clean.js')(gulp, gutil);
  require('./plugin.js')(gulp, gutil);
  require('./test.js')(gulp, gutil);
  require('./sandbox.js')(gulp, gutil);
  require('./docs.js')(gulp, gutil);
  require('./generate.js')(gulp, gutil);
  require('./project.js')(gulp, gutil);
  require('./docgen.js')(gulp, gutil);

  gutil.log('Loaded gulp tasks in: ' + gutil.colors.green(prettyTime(process.hrtime(startTime))));
};
