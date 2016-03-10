#!/usr/bin/env node

'use strict';

var gutil = require('gulp-util');

module.exports = {
  run: function () {
    require('../../lib/spawn-gulp')(['responsive-options'].concat(process.argv.splice(3)));
  },
  help: 'Creates responsive options file with configuration information, based on answers to a few questions.'
};