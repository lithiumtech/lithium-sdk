#!/usr/bin/env node

'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');

module.exports = {
  run: function () {
    require('../../lib/project.js')(gulp, gutil).server(process.argv.splice(3), function () {});
  },
  help: 'Creates a server.conf.json file with project configuration information (including information needed to ' +
  '\nconnect to a stage site).'
};
