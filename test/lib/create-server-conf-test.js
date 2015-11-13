'use strict';

var nock = require('nock');
var chai = require('chai');
var expect = chai.expect;
var path = require('path');
var gutil = require('gulp-util');
var apiHost = 'https://mycommunity.com';
var testRoot = path.resolve(__dirname) + '/..';
var spawn = require('child_process').spawn;
var rewire = require('rewire');
var inquirer = require('inquirer');
var fs = require('fs');
var sinon = require('sinon');
var gulp = require('gulp');
var pluginToken = "35f5437a-a3be-4958-9449-7a4a13b68810";
var path = require('path');
var mockstdin = require('mock-stdin');

describe('test server conf creation', function() {
    this.slow(5000);
    var stdin;
    var sandbox;
    var sandboxTestFolder = "/tmp/sandboxtest/";

    describe('create server conf tests', function() {

        function check(expects, serverUrl, token, cb) {

            var gulpMock = {
                task: function(name, required, fn) {
                },
                src: function(globs) {
                   return gulp.src(globs);
                },
                dest: function() {
                    return gulp.dest(sandboxTestFolder);
                }
            };

            var fsMock = {
                writeFile: function(f, value) {
                    return fs.writeFile(path.join(sandboxTestFolder, 'server.conf.json'), value, cb);
                },
                createReadStream: function () {
                    return '';
                },
                existsSync: fs.existsSync
            };

            var project = rewire(testRoot + '/../lib/project.js');
            project.__set__({
                fs: fsMock
            });
            project(gulpMock, gutil).server();
            stdin.send([
                serverUrl,
                token,
                "\n"
            ]);
            if (expects.validationerror) {
               cb();
            }
        };

        function validateCreate(url, token) {
            var error = false;
            var errMessage = '';
            //Check whether folder has been created
            fs.stat(sandboxTestFolder, function(err, stat) {
                if(err != null) {
                    error = true;
                    errMessage = ' folder not created!!';
                }
            });

            //Check folder has server.conf.json
            fs.stat(sandboxTestFolder+'/server.conf.json', function(err, stat) {
                if(err != null) {
                    error = true;
                    errMessage = 'server conf json not created!!';
                }
            });
            chai.assert(error === false, errMessage);
            var serverConfig = require(path.join(sandboxTestFolder, 'server.conf.json'));
            chai.assert(serverConfig['pluginToken'] === token, "invalid value for plugin token");
            chai.assert(serverConfig['serverUrl'] === url, "invalid value for server url");
        };

        before(function() {
            sandbox = sinon.sandbox.create();
        });

        beforeEach(function() {
            nock.cleanAll();
            stdin = require('mock-stdin').stdin();
        });

        afterEach(function() {
            stdin.restore();
            sandbox.restore();
        });

        it('should create server conf successfully', function(done) {

            check( {}, apiHost, pluginToken, function() {
                validateCreate(apiHost, pluginToken);
                done();
            });
        });

        it('bad url, should fail validation', function(done) {
            check( {validationerror: true}, "abc", pluginToken, function() {
                done();
            });
        });

        it('empty url, should fail validation', function(done) {
            check( {validationerror: true}, "", pluginToken, function() {
                done();
            });
        });

    });
});