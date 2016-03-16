#!/usr/bin/env node

'use strict';

var gutil = require('gulp-util');

module.exports = {
  run: function () {
    require('../../lib/spawn-gulp')(['responsive-options'].concat(process.argv.splice(3)));
  },
  help: 'Creates responsive options file with configuration information, based on answers to a few questions.' +
  '\nRun this command before running the li serve-sass script to configure what skin will be served by that script.' +
  '\nRun this command from the root directory of a project.'
};