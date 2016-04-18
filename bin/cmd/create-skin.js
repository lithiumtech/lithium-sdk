#!/usr/bin/env node

var gulp = require('gulp');
var gutil = require('gulp-util');
var fs = require('fs');

module.exports = {
    run: function () {
        //Success call back function
        var cb = require('../../gulp/createskin')(gulp, gutil).createNewSkin;

        //Check if we are creating skin on a sdk project
        if (!fs.existsSync('./server.conf.json')) {
            console.log(gutil.colors.red('Please run create-skin under your Lithium SDK project directory.' +
                '\n or create a new project with ' + gutil.colors.bold('li create-project') + ' before creating a new skin.'));
            process.exit(1);
            return true;
        }
        var server = require('../../lib/server.js')(gulp, gutil);
        require('../../lib/version-check.js')(gulp, gutil).process(server, {
            debugMode: gutil.env['debug']
        }, cb);
    },
    help: 'Creates a new skin.' + gutil.colors.bold('\nOptions:') +
    '\n--clearFalse:   Downloads the core plugins from server even when directory is already present. Defaults to false'
};