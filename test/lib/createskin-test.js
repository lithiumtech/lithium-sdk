'use strict';

var chai = require('chai');
var fs = require('fs');
var rewire = require('rewire');
var path = require('path');
var gutil = require('gulp-util');
var gulp = require('gulp');
var temp = require('temp');
var testRoot = path.resolve(__dirname) + '/..';
var expect = chai.expect;

describe('skin creation', function() {
    var skinsLib , skinLib;
    var tempDir;

    before(function() {
        tempDir = temp.mkdirSync('skins-test');
        var fixResSkinsDir = function(dir) {
            if (dir == 'res/skins') {
                dir = tempDir + '/';
            } else if (dir == 'coreplugin') {
                dir = testRoot + '/lib/' + dir;
            }

            return dir;
        };
        var pathMock = {
            resolve: function(dir, file) {
                var tailPath = "";
                for( var i = 2; i < arguments.length; i++) {
                    tailPath += arguments[i];
                }
                return path.resolve(fixResSkinsDir(dir), file, tailPath);
            },
            join: function(dir, file) {
                var tailPath = "";
                for( var i = 2; i < arguments.length; i++) {
                    tailPath += arguments[i];
                }
                return path.join(dir, file, tailPath);
            },
            basename: path.basename
        };
        var fsMock = {
            statSync: function(path) {
                return fs.statSync(fixResSkinsDir(path));
            },
            readFileSync: function(path) {
                return fs.readFileSync(fixResSkinsDir(path));
            },
            readdirSync: function(path) {
                return fs.readdirSync(fixResSkinsDir(path));
            },
            mkdirSync: function(path) {
                return fs.mkdirSync(tempDir+"/"+path);
            }
        };
        skinsLib = rewire(testRoot + '/../lib/skins.js');
        skinsLib.__set__({
            path: pathMock
        });
        var serverConfPath = path.join('lib', 'test.server.conf.json');
        gutil.env.serverConfig = path.join('test', serverConfPath);
        skinsLib = skinsLib(gulp, gutil);

        skinLib = rewire(testRoot + '/../lib/skin.js');
        skinLib.__set__({
            fs: fsMock,
            path: pathMock
        });
        skinLib = skinLib(gulp, gutil);
    });

    it('should create a skin with legacy skin as parent', function (done) {
        var skinId = 'newSkinWithlegacySkin';
        var skinInfo = {};
        skinInfo.name = skinId;
        skinInfo.parentSkin = new skinLib.Skin("admin", testRoot+"/lib/testcoreplugin/res/skins/admin");
        skinInfo.errorCb = function(err) {
            chai.assert.isNotOk(true, err.message);
            done();
        };
        skinInfo.cb = function() {
            //Validate if skin was created
            expect(fs.existsSync(path.join(tempDir, skinId)));
            expect(fs.existsSync(path.join(tempDir, skinId, skinLib.skinPropertiesFileName)));
            skinLib.skinSubFolder.forEach(function (folder) {
                expect(fs.existsSync(path.join(tempDir, skinId, folder, skinLib.componentsDir)));
                expect(fs.existsSync(path.join(tempDir, skinId, folder, skinLib.cssDir)));
                expect(fs.existsSync(path.join(tempDir, skinId, folder, skinLib.skinPropertiesFileName)));
            });
            var newSkin = new skinLib.Skin(skinId, tempDir+"/"+skinId);
            var title = newSkin.lookupProperty("title");
            expect(title === skinId);
            var parent = newSkin.lookupProperty("parent");
            expect(parent === "admin");
            done();
        };
        skinsLib.createNewSkin(skinInfo);
    });

    it('should create a skin with responsive peak as parent', function (done) {
        var skinId = 'newSkinWithRespPeak';
        var skinInfo = {};
        skinInfo.name = skinId;
        skinInfo.parentSkin = new skinLib.Skin("responsive_peak", testRoot+"/lib/testcoreplugin/res/feature/responsivepeak/v1.8-lia16.3/res/skins/responsive_peak");
        var parentCopySass = skinInfo.parentSkin.lookupProperty(skinLib.skinPropertyCopySass);
        skinInfo.errorCb = function(err) {
            chai.assert.isNotOk(true, err.message);
            done();
        };
        skinInfo.cb = function() {
            //Validate if skin was created
            expect(fs.existsSync(path.join(tempDir, skinId)));
            expect(fs.existsSync(path.join(tempDir, skinId, skinLib.skinPropertiesFileName)));
            expect(fs.existsSync(path.join(tempDir, skinId, skinLib.sassDir)));
            var newSkin = new skinLib.Skin(skinId, tempDir+"/"+skinId);
            var title = newSkin.lookupProperty("title");
            expect(title === skinId);
            var parent = newSkin.lookupProperty("parent");
            expect(parent === "responsive_peak");
            var copySass = newSkin.lookupProperty(skinLib.skinPropertyCopySass);
            copySass.forEach(function(prop) {
                expect(parentCopySass.indexOf(prop) <= -1);
            });
            done();
        };
        skinsLib.createNewSkin(skinInfo);
    });

    it('should create a skin with sdk skin as parent', function (done) {
        var skinId = 'newSdkParent';
        var skinInfo = {};
        skinInfo.name = skinId;
        skinInfo.parentSkin = new skinLib.Skin("newsui", testRoot+"/lib/testcoreplugin/res/skins/newsui");
        skinInfo.errorCb = function(err) {
            chai.assert.isNotOk(true, err.message);
            done();
        };
        skinInfo.cb = function() {
            //Validate if skin was created
            expect(fs.existsSync(path.join(tempDir, skinId)));
            var newSdkId = "newSdkSkinWithParentSdkSkin";
            skinInfo.name = newSdkId;
            skinInfo.parentSkin = new skinLib.Skin(skinId, tempDir+"/"+skinId);
            skinInfo.cb = function() {
                var newSkin = new skinLib.Skin(newSdkId, tempDir+"/"+newSdkId);
                var title = newSkin.lookupProperty("title");
                expect(title === newSdkId);
                var parent = newSkin.lookupProperty("parent");
                expect(parent === skinId);
                done();
            }
            skinsLib.createNewSkin(skinInfo);
        };
        skinsLib.createNewSkin(skinInfo);
    });

    it('should create a skin with other community skin as parent', function (done) {
        var skinId = 'newSkinWithOtherSkinParent';
        var skinInfo = {};
        skinInfo.name = skinId;
        skinInfo.parentSkin = new skinLib.Skin("newsui", testRoot+"/lib/testcoreplugin/other/res/skins/testnewskin");
        var parentCopySass = skinInfo.parentSkin.lookupProperty(skinLib.skinPropertyCopySass);
        skinInfo.errorCb = function(err) {
            chai.assert.isNotOk(true, err.message);
            done();
        };
        skinInfo.cb = function() {
            //Validate if skin was created
            expect(fs.existsSync(path.join(tempDir, skinId)));
            expect(fs.existsSync(path.join(tempDir, skinId, skinLib.skinPropertiesFileName)));
            expect(fs.existsSync(path.join(tempDir, skinId, skinLib.sassDir)));
            var newSkin = new skinLib.Skin(skinId, tempDir+"/"+skinId);
            var title = newSkin.lookupProperty("title");
            expect(title === skinId);
            var parent = newSkin.lookupProperty("parent");
            expect(parent === "testnewskin");
            var copySass = newSkin.lookupProperty(skinLib.skinPropertyCopySass);
            copySass.forEach(function(prop) {
                expect(parentCopySass.indexOf(prop) <= -1);
            });
            done();
        };
        skinsLib.createNewSkin(skinInfo);
    });
});