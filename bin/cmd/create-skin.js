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
        var versionCheck = require('../../lib/version-check.js')(gulp, gutil);
        var serverVersion = versionCheck.createVersion("16.4");
        versionCheck.process(server, {
            debugMode: gutil.env['debug'],
            version: serverVersion
        }, cb);
    },
    help: 'Creates a new skin.' + gutil.colors.bold('\nOptions:') +
    '\n--clearCore:  Gets the most recent versions of parent skins from the server. Running without --clearCore is faster, '+
    '\n             but you will be using the cached versions of the core skins, not necessarily the latest versions'
};