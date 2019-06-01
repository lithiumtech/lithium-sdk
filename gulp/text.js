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
    var srcPath = gutil.env.newStructure ? 'plugin/res/**/*.properties' :'./res/**/*.properties';
    var destPath = gutil.env.newStructure ? 'plugin/res' : './res';
    gulp.src(srcPath).pipe(stripBom()).pipe(gulp.dest(destPath));
  });
};