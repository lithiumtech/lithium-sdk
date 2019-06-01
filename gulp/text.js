'use strict';

var lazyReq = require('lazy-req')(require);
var path = lazyReq('path');
var stripBom = require('gulp-stripbom');

module.exports = function (gulp, gutil) {
  var text = require('../lib/text.js')(gulp, gutil);

  gulp.task('text', function (cb) {
    if (gutil.env.ng) {
      var textPropPattern = gutil.env.ng.textProperties.map(function (dir) {
        return path().join(dir, text.FILES_PATTERN);
      });
      return text.processText(textPropPattern, text.TEXT_PLUGIN_PATH);
    } else {
      cb();
    }
  });

  gulp.task('text-remove-bom', function () {
    gulp.src('plugin/res/**/*.properties').pipe(stripBom()).pipe(gulp.dest('dist/plugin/res'));
  });
};