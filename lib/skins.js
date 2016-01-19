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
var plumber = lazyReq('gulp-plumber');
var path = lazyReq('path');
var replace = lazyReq('gulp-replace');
var concat = lazyReq('gulp-concat');
var gulpif = lazyReq('gulp-if');
var newer = lazyReq('gulp-newer');
var fs = lazyReq('fs');

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
        .pipe(lr ? plumber()() : gutil.noop())
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
    vars: function () {
      var baseFeaturePath = 'res/feature/responsivebase';
      var peakFeaturePath = 'res/feature/responsivepeak';
      var baseSassPath = 'res/skins/bootstrap_base/sass';
      var peakSassPath = 'res/skins/responsive_peak/sass';
      var varsPath = 'codebook/_variables-*.scss';

      function getSkinVersions(dir) {
        return fs().readdirSync(dir)
          .filter(function(file) {
            return fs().statSync(path().join(dir, file)).isDirectory();
          });
      }

      var peakVars = getSkinVersions(peakFeaturePath).map(function(version) {
        return gulp.src([path().join(baseFeaturePath, version, '**', varsPath),
            path().join(peakFeaturePath, version, '**', varsPath)])
          .pipe(newer()(path().join(peakFeaturePath, version, peakSassPath, '_variables.scss')))
          .pipe(replace()('!default', ''))
          .pipe(replace()(/^\s*(\$.*)/gm, '//$1'))
          .pipe(replace()(/(\s*);/gm, ';'))
          .pipe(rename()('_variables.scss'))
          .pipe(gulpif()(function(file){ return file.path.indexOf(baseFeaturePath) >= 0; },
            gulp.dest(path().join(baseFeaturePath, version, baseSassPath))))
          .pipe(concat()('_variables.scss'))
          .pipe(gulp.dest(path().join(peakFeaturePath, version, peakSassPath)));
      });
      return peakVars;
    },
    FILES_PATTERN: SKIN_FILES_PATTERN
  };
};
