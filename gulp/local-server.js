'use strict';

var lazyReq = require('lazy-req')(require);
var livereload = lazyReq('gulp-livereload');

module.exports = function (gulp, gutil) {
  var localServer = require('../lib/local-server.js')(gulp, gutil);
  var server = require('../lib/server.js')(gulp, gutil);
  var lrListening;

  gulp.task('local-server', ['version-check'], function (cb) {
    if (server.useLocalCompile()) {
      if (!lrListening) {
        lrListening = true;
        livereload().listen();
      }
      localServer.startLocalServer();
    }
    cb();
  });
};