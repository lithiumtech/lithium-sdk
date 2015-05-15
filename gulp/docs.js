'use strict';

var lazyReq = require('lazy-req')(require);
var gulpkss = lazyReq('gulp-kss');
var sass = lazyReq('gulp-sass');
var concat = lazyReq('gulp-concat');
var clean = lazyReq('gulp-clean');
var browserSync = lazyReq('browser-sync');

module.exports = function (gulp) {
  gulp.task('kss-clean', function () {
    return gulp.src(['styleguide/**/*'], {read: false})
      .pipe(clean()({force:true}));
  });

  gulp.task('kss-sass', ['kss-clean'], function() {
    return gulp.src(['res/skins/bootstrap_base/sass/skin.scss'])
      .pipe(sass()())
      .pipe(concat()('style.css'))
      .pipe(gulp.dest('styleguide/public'));
    });

  gulp.task('kss-build',['kss-sass'], function () {
    return gulp.src(['res/skins/bootstrap_base/**/*.scss'])
      .pipe(gulpkss()({
        overview: 'styleguide.md'
        }))
      .pipe(gulp.dest('styleguide'))
      .pipe(browserSync().reload({stream: true}));
  });

  gulp.task('kss',['kss-build'], function () {
    browserSync().init({
      server: 'styleguide'
  });

    gulp.watch(['styleguide.md','res/skins/bootstrap_base/**/*'],['kss-build']);
  });
};
