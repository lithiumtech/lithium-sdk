#!/usr/bin/env node
'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var fs = require('fs');

module.exports = {
  run: function () {
    require('../../lib/spawn-gulp')(['create-new-skin'].concat(process.argv.splice(3)));
  },
  help: 'Creates a new skin.' + gutil.colors.bold('\nOptions:') +
    '\n--clearCore:  Gets the most recent versions of parent skins from the server. Running without --clearCore is faster, '+
    '\n             but you will be using the cached versions of the core skins, not necessarily the latest versions'
};