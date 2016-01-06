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
var urlAdjuster = lazyReq('gulp-css-url-adjuster');


module.exports = function (gulp, gutil) {
  var server;

  function getServer() {
    return server ? server : server = require('./server.js')(gulp, gutil);
  }

  return {
    process: function (patterns, dest, files) {
      return gulp.src(patterns)
       .pipe(gutil.env.filterFiles(files))
       .pipe(gulp.dest(dest));
    },
    compile: function (lr) {
      var ver = getServer().localCompileVersion();
      var featurePathId = 'responsivepeak';
      var skinPathId = 'responsive_peak';
      var skinPath = 'res/feature/' + featurePathId + '/' + ver + '/res/skins/' + skinPathId + '/sass/skin.scss';
      var includePaths = [
        'res/feature/responsivebase/common/res/skins/',
        'res/feature/responsivebase/' + ver + '/res/skins/',
        'res/feature/responsivepeak/' + ver + '/res/skins/'
      ];

      // hack to workaround bug in gulp-css-url-adjuster
      var imageAdjustPath = (getServer().serverUrl()).replace('//', '///') + '/html';

      return gulp.src(skinPath)
        .pipe(sass()({
          includePaths: includePaths
        }))
        .pipe(urlAdjuster()({
          replace:  ['/html', imageAdjustPath]
        }))
        .pipe(gulp.dest('.tmp/lia/sass'))
        .pipe(lr());
    },
    server: function () {
      connect().server({
        root: [
          '.tmp/lia/sass',
          'web'
        ],
        port: 9000
      });
    },
    FILES_PATTERN: SKIN_FILES_PATTERN
  };
};
