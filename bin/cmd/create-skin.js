#!/usr/bin/env node

var gulp = require('gulp');
var gutil = require('gulp-util');

module.exports = {
    run: function () {
        require('../../gulp/createskin')(gulp, gutil).createNewSkin();
    }
};