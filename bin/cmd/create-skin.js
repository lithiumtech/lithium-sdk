#!/usr/bin/env node

var gulp = require('gulp');
var gutil = require('gulp-util');

module.exports = {
    run: function () {
        //Success call back function
        var cb = require('../../gulp/createskin')(gulp, gutil).createNewSkin;
        var server = require('../../lib/server.js')(gulp, gutil);
        require('../../lib/version-check.js')(gulp, gutil).process(server, {
            debugMode: gutil.env['debug']
        }, cb);

    }
};