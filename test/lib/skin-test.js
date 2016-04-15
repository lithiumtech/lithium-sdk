'use strict';

var chai = require('chai');
var expect = chai.expect;
var rewire = require('rewire');
var path = require('path');
var gutil = require('gulp-util');
var fs = require('fs');
var testRoot = path.resolve(__dirname) + '/..';
var gulp = require('gulp');

describe('test skin object creation', function() {
  var skinLib;

  before(function() {
    var fixResSkinsDir = function(dir) {
      if (dir == 'res/skins') {
        dir = testRoot + '/lib/skins/' + dir;
      } else if (dir == 'coreplugin') {
        dir = testRoot + '/lib/' + dir;
      }

      return dir;
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
      }
    };
    var pathMock = {
      resolve: function(dir, file) {
        return path.resolve(fixResSkinsDir(dir), file);
      },
      basename: path.basename
    };
    skinLib = rewire(testRoot + '/../lib/skin.js');
    skinLib.__set__({
      fs: fsMock,
      path: pathMock
    });
    var serverConfPath = path.join('lib', 'test.server.conf.json');
    gutil.env.serverConfig = path.join('test', serverConfPath);
    skinLib = skinLib(gulp, gutil);
  });

  it('should not allow you to create a skin with invalid constructor values', function(done) {
    var skinId = 'my_responsive_skin';
    var skinDir = testRoot + '/lib/skins/res/skins/' + skinId;
    var errMsg = '';

    try {
      new skinLib.Skin(null, skinDir);
    } catch (err) {
      errMsg = err.message;
    }
    expect(errMsg).to.equal('id must be a string!');

    try {
      new skinLib.Skin(skinId, null);
    } catch (err) {
      errMsg = err.message;
    }
    expect(errMsg).to.equal('dir must be a string!');

    done();
  });

  it('should create a new local responsive skin object', function(done) {
    var skinId = 'my_responsive_skin';
    var skinDir = testRoot + '/lib/skins/res/skins/' + skinId;
    var skin = new skinLib.Skin(skinId, skinDir);

    expect(skin.getId()).to.equal(skinId);
    expect(skin.getDir()).to.equal(skinDir);
    expect(skin.isLocal()).to.be.true;
    expect(skin.getParentId()).to.equal('my_responsive_base_skin');
    expect(skin.isResponsive()).to.be.true;
    expect(skin.getResponsiveCoreId()).to.equal('responsive_peak');

    var parentSkin = skin.getParent();
    expect(parentSkin).to.not.be.null;
    expect(parentSkin.isResponsive()).to.be.true;
    expect(parentSkin.getResponsiveCoreId()).to.equal('responsive_peak');

    done();
  });

  it('should return all the responsive skins', function(done) {
    var config = {
      skins: [ 'responsive_peak' ]
    };
    var responsiveSkinIds = skinLib.getResponsiveSkinIds();
    var responsiveSkins = skinLib.getResponsiveSkins();
    console.log(JSON.stringify(responsiveSkins));

    expect(responsiveSkinIds).to.deep.equal(responsiveSkins
      .filter(function(){
        return true;
      }).map(function(skin) {
        return skin.getId();
      }));

    done();
  });
});