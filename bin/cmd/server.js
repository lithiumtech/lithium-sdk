#!/usr/bin/env node

'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');

module.exports = {
  run: function () {
    require('../../lib/project.js')(gulp, gutil).server(function () {
    });
  },
  help: 'Creates a server.conf.json file.'
};
