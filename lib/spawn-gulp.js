'use strict';

var spawn = require('child_process').spawn;
var path = require('path');

module.exports = function (args) {
  spawn(
    'node',
    [path.join(__dirname, '../node_modules/gulp/bin/gulp.js')].concat(args),
    {
      stdio: 'inherit'
    }
  );
};