/**
 * Library methods for styles and css tasks
 *
 * @author Nikhil Modak
 */

'use strict';

var SKIN_FILES_PATTERN = '**/*(*.css|*.scss|*.sass|*.ftl|*.png|*.svg|*.jpg|*.jpeg|skin.properties)';

module.exports = function (gulp, gutil) {

  return {
    process: function (patterns, dest, files) {
      return gulp.src(patterns)
       .pipe(gutil.env.filterFiles(files))
       .pipe(gulp.dest(dest));
    },
    FILES_PATTERN: SKIN_FILES_PATTERN
  };
};
