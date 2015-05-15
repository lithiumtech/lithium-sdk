'use strict';

var lazyReq = require('lazy-req')(require);
var concat = lazyReq('gulp-concat');
var lazyDgeni = lazyReq('dgeni');
var es = lazyReq('event-stream');
var path = lazyReq('canonical-path');
var foreach = lazyReq('gulp-foreach');
var uglify = lazyReq('gulp-uglify');
var sourcemaps = lazyReq('gulp-sourcemaps');
var rename = lazyReq('gulp-rename');
var connect = lazyReq('gulp-connect');
var historyApiFallback = lazyReq('connect-history-api-fallback');

// We indicate to gulp that tasks are async by returning the stream.
// Gulp can then wait for the stream to close before starting dependent tasks.
// See clean and bower for async tasks, and see assets and doc-gen for dependent tasks below

var outputFolder = 'generated';
var bowerFolder = 'docs/bower_components';

var src = 'docs/app/src/**/*.js';
var assets = 'docs/app/assets/**/*';


var copyComponent = function(gulp, component, pattern, sourceFolder, packageFile) {
  pattern = pattern || '/**/*';
  sourceFolder = sourceFolder || bowerFolder;
  packageFile = packageFile || 'bower.json';
  var version = require(path().resolve(sourceFolder,component,packageFile)).version;
  return gulp
    .src(sourceFolder + '/' + component + pattern)
    .pipe(gulp.dest(outputFolder + '/components/' + component + '-' + version));
};

module.exports = function(gulp) {

  gulp.task('build-dgeni-app', function () {
    var file = 'docs.js';
    var minFile = 'docs.min.js';
    var folder = outputFolder + '/js/';

    return gulp.src(src)
      .pipe(sourcemaps().init())
      .pipe(concat()(file))
      .pipe(gulp.dest(folder))
      .pipe(rename()(minFile))
      .pipe(uglify()())
      .pipe(sourcemaps().write('.'))
      .pipe(gulp.dest(folder));
  });


  gulp.task('assets-angular-li', function () {
    var JS_EXT = /\.js$/;

    return es().merge(
      gulp.src(['./docs/images/**/*',
        //Add paths to look for more images and assets here
      ]).pipe(rename()({dirname: ''})).pipe(gulp.dest(outputFolder + '/img')),
      gulp.src([assets]).pipe(gulp.dest(outputFolder)),
      gulp.src([assets])
        .pipe(foreach()(function (stream, file) {
          if (JS_EXT.test(file.relative)) {
            var minFile = file.relative.replace(JS_EXT, '.min.js');
            return stream
              .pipe(sourcemaps().init())
              .pipe(concat()(minFile))
              .pipe(uglify()())
              .pipe(sourcemaps().write('.'))
              .pipe(gulp.dest(outputFolder));
          }
        })),
      copyComponent(gulp, 'bootstrap', '/dist/**/*', bowerFolder),
      copyComponent(gulp, 'open-sans-fontface', '/**/*', bowerFolder),
      copyComponent(gulp, 'lunr.js', '/*.js', bowerFolder),
      copyComponent(gulp, 'google-code-prettify', '/**/*', bowerFolder),
      copyComponent(gulp, 'jquery', '/dist/*.js', bowerFolder),
      copyComponent(gulp, 'marked', '/**/*.js', 'docs/node_modules', 'package.json')
    );
  });


  gulp.task('doc-gen', function () {
    var Dgeni = lazyDgeni();
    var dgeni = new Dgeni([require(process.cwd() + '/docs/config')]);
    return dgeni.generate().catch(function () {
      process.exit(1);
    });
  });

// The default task that will be run if no task is supplied
  gulp.task('build-docs', ['assets-angular-li', 'doc-gen', 'build-dgeni-app']);

  gulp.task('connect-server', ['build-docs'], function () {
    connect().server({
      root: 'generated',
      port: 9100,
      livereload: true,
      middleware: function () {
        return [historyApiFallback()];
      }
    });
  });

  gulp.task('serve-docs', ['connect-server'], function () {
    gulp.watch(['docs/content/**/*.ngdoc', 'docs/config/**/*'], ['doc-gen']);
    gulp.watch([
      './generated/**/*.html'
    ], connect().reload);
  });
};