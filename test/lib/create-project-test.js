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

describe('test project creation', function() {
    this.slow(5000);
    var versionCheckApi = "/restapi/ldntool/plugins/version?format=json";
    var stdin;
    var sandbox;
    var sandboxTestFolder = "/tmp/sandboxtest/";
    var defaultVersion;

    function createErrorResponse() {
        return nock(apiHost)
            .log(console.log)
            .get(versionCheckApi)
            .reply(200, '{"status": "error"}');
    }

    function createResponse(url) {
        var serverVersion = defaultVersion.supportedVersionMajor + '.' + defaultVersion.supportedVersionMinor;
        return nock(url)
            .log(console.log)
            .get(versionCheckApi)
            .reply(200, '{"status":"OK", "version": "16.4"}');
    }

    describe('create project tests', function() {

        function check(expects, repoName, serverUrl, token, cb) {

            if (expects.serverError) {
                createErrorResponse();
            } else {
                createResponse(serverUrl);
            }
            var gulpMock = {
                task: function(name, required, fn) {
                },
                src: function(globs) {
                   return gulp.src(globs);
                },
                dest: function() {
                    return gulp.dest(sandboxTestFolder+repoName);
                }
            };

            var fsMock = {
                writeFile: function(f, value) {
                    return fs.writeFile(path.join(sandboxTestFolder, repoName, 'server.conf.json'), value, cb);
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
            project(gulpMock, gutil).scaffold();
            stdin.send([
                repoName,
                serverUrl,
                token,
                "\n"
            ]);
            if (expects.validationerror) {
               cb();
            }
        };

        function validateCreate(repoName, url, token) {
            var error = false;
            var errMessage = '';
            //Check whether folder has been created
            fs.stat(sandboxTestFolder+repoName, function(err, stat) {
                if(err != null) {
                    error = true;
                    errMessage = repoName+' folder not created!!';
                }
            });

            //Check folder has server.conf.json
            fs.stat(sandboxTestFolder+repoName+'/server.conf.json', function(err, stat) {
                if(err != null) {
                    error = true;
                    errMessage = 'server conf json not created!!';
                }
            });

            fs.stat(sandboxTestFolder+repoName+'/res', function(err, stat) {
                if(err != null) {
                    error = true;
                    errMessage = 'res folder not created!!';
                }
            });

            fs.stat(sandboxTestFolder+repoName+'/web', function(err, stat) {
                if(err != null) {
                    error = true;
                    errMessage = 'web folder not created!!';
                }
            });
            chai.assert(error === false, errMessage);
            var serverConfig = require(path.join(sandboxTestFolder, repoName, 'server.conf.json'));
            chai.assert(serverConfig['pluginToken'] === token, "invalid value for plugin token");
            chai.assert(serverConfig['serverUrl'] === url, "invalid value for server url");
        };

        before(function() {
            sandbox = sinon.sandbox.create();
            defaultVersion = require(testRoot + '/../lib/server-version.json');
        });

        beforeEach(function() {
            nock.cleanAll();
            stdin = require('mock-stdin').stdin();
        });

        afterEach(function() {
            stdin.restore();
            sandbox.restore();
        });

        it('should create project successfully', function(done) {

            var repoName = "demo";
            check( { respondSuccess: true }, repoName, apiHost, pluginToken, function() {
                validateCreate(repoName, apiHost, pluginToken);
                done();
            });
        });

        it('Upper case repo name, should fail validation', function(done) {

            var repoName = "DEMO-1";
            check( { respondSuccess: true, validationerror: true}, repoName, '\x03', '', function() {
                done();
            });
        });

        it('Empty repo name, should fail validation', function(done) {
            var repoName = "";
            check( { respondSuccess: true, validationerror: true}, repoName, apiHost, '', function() {
                done();
            });
        });

        it('Single digit repo, should create project', function(done) {
            var repoName = "1";
            check( { respondSuccess: true}, repoName, apiHost, pluginToken, function() {
                validateCreate(repoName, apiHost, pluginToken);
                done();
            });
        });

        it('Invalid server url, should fail validation', function(done) {

            var repoName = "demo2";
            var url = "url";
            check( { respondSuccess: true, validationerror: true}, repoName, url, '', function() {
                done();
            });
        });

        it('non https server url, should create project', function(done) {

            var repoName = "demo3";
            var url = "http://www.community.com";
            check( { respondSuccess: true}, repoName, url, pluginToken, function() {
                validateCreate(repoName, url, pluginToken);
                done();
            });
        });

    });
});