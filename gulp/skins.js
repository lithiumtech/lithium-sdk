'use strict';

module.exports = function (gulp, gutil) {
  var skins = require('../lib/skins.js')(gulp, gutil);

  gulp.task('skins-compile', gulp.series('check-themes', function (cb) {
  	 skins.compile().then(cb);
  }));

  gulp.task('skins-vars-template', function () {
    return skins.createVarsTemplate();
  });

  gulp.task('skins', gulp.series('skins-vars-template', 'skins-compile'));
};