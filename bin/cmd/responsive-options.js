#!/usr/bin/env node

'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');

module.exports = {
  run: function () {
    require('../../lib/spawn-gulp')(['responsiveoptions'].concat(process.argv.splice(3)));
  },
  help: 'Creates responsive options file with configuration information.'
};