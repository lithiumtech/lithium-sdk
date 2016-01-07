/**
 * Library methods for styles and css tasks
 *
 * @author Nikhil Modak
 */

'use strict';

var SKIN_FILES_PATTERN = '**/*(*.css|*.scss|*.sass|*.ftl|*.png|*.svg|*.jpg|*.jpeg|skin.properties)';
var lazyReq = require('lazy-req')(require);
var sass = lazyReq('gulp-sass');
var connect = lazyReq('gulp-connect');
var sourcemaps = lazyReq('gulp-sourcemaps');
var rename = lazyReq('gulp-rename');

module.exports = function (gulp, gutil) {
  var server;

  function getServer() {
    return server ? server : server = require('./server.js')(gulp, gutil);
  }

  var cors = function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
  };

  return {
    process: function (patterns, dest, files) {
      return gulp.src(patterns)
       .pipe(gutil.env.filterFiles(files))
       .pipe(gulp.dest(dest));
    },
    compile: function (lr) {
      var server = getServer();
      var version = server.localSkinCompileVersion();
      var feature = server.localSkinCompileFeature();
      var skin = server.localSkinCompileSkin();
      var dest = server.localSkinCompileDest();
      var skinPath = 'res/feature/' + feature + '/' + version + '/res/skins/' + skin + '/sass/skin.scss';
      var includePaths = [
        'res/feature/responsivepeak/' + version + '/res/skins/',
        'res/feature/responsivebase/' + version + '/res/skins/',
        'res/feature/responsivebase/common/res/skins/'
      ];

      return gulp.src(skinPath)
        .pipe(sourcemaps().init())
        .pipe(sass()({
          includePaths: includePaths
        }))
        .pipe(sourcemaps().write())
        .pipe(rename()(skin + '.css'))
        .pipe(gulp.dest(dest))
        .pipe(lr ? lr() : gutil.noop());
    },
    server: function () {
      connect().server({
        root: [
          getServer().localServerDir(),
          'web'
        ],
        port: getServer().localServerPort(),
        middleware: function () {
          return [cors];
        }
      });
    },
    FILES_PATTERN: SKIN_FILES_PATTERN
  };
};
