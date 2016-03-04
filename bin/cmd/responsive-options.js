#!/usr/bin/env node

'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');

module.exports = {
  run: function () {
    require('../../lib/responsive-options.js')(gulp, gutil).handleOptionsWithPrompt(function() {});
  },
  help: 'Creates responsive options file with configuration information, based on answers to a few questions.'
};