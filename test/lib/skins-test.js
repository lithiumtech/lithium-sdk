'use strict';

var chai = require('chai');
var expect = chai.expect;
var fs = require('fs');
var rewire = require('rewire');
var path = require('path');
var gutil = require('gulp-util');
var gulp = require('gulp');
var through = require('through2');
var temp = require('temp');
var testRoot = path.resolve(__dirname) + '/..';

describe('test skin compile', function() {
  var skinsLib;
  var tempDir;

  before(function() {
    tempDir = temp.mkdirSync('skins-test');
    var fixResSkinsDir = function(dir) {
      if (dir == 'res/skins') {
        dir = testRoot + '/lib/skins/' + dir;
      }

      return dir;
    };
    var pathMock = {
      resolve: function(dir, file) {
        return path.resolve(fixResSkinsDir(dir), file);
      },
      basename: path.basename
    };
    skinsLib = rewire(testRoot + '/../lib/skins.js');
    skinsLib.__set__({
      path: pathMock
    });
    var serverConfPath = path.join('lib', 'test.server.conf.json');
    gutil.env.serverConfig = path.join('test', serverConfPath);
    skinsLib = skinsLib(gulp, gutil);
  });

  it('should compile a skin without deleting compile dir, no livereload', function(done) {
    var skinId = 'my_responsive_skin';
    var stream = through.obj();
    skinsLib.doCompile({
      includePathsPrefix: '',
      skin: skinId,
      dest: tempDir,
      includePaths: [
        testRoot + '/lib/sasstest/coreplugin/res/feature/corefeature/v1.7-lia16.2/res/skins/'
      ],
      skinPathPrefix: testRoot + '/lib/sasstest/'
    }).pipe(stream).on('finish', function() {
      console.log('tempDir' + tempDir);
      fs.readFile(tempDir + '/' + skinId + '.css' , 'utf8', function (err, data) {
        if (err) throw err;
        //console.log(data.replace(/\r?\n|\r/g, ''));
       expect(data.replace(/\r?\n|\r/g, '')).to.contain('.lia-first-component .first-component-tab .first-component-link:hover {  cursor: pointer; }.lia-first-component .first-component-batch {  left: 12px;  position: absolute; }/*');
      });
      done();
    });
  });

  it('should download an asset to tmp directory', function(done){
     skinsLib.downloadFile("http://community.lithium.com/html/assets/footer-menu-1.png", {}, tempDir+"/footer-menu-1.png", function(msg){
      expect(fs.existsSync(tempDir + '/footer-menu-1.png'));
      expect(msg.indexOf( "Successfully downloaded asset") > -1);
      done();
    });
  });
});