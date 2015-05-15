'use strict';

var lazyReq = require('lazy-req')(require);
var through = lazyReq('through2');

module.exports = function (gulp, gutil) {

  var sandboxApi = require('../lib/sandbox-api.js')(gulp, gutil);

  gulp.task('sandbox-read', [], function () {
    var stream = through().obj();

    sandboxApi.read({
      'assetType': gutil.env.sbAssetType
    }).pipe(stream);

    return stream;
  });

  gulp.task('sandbox-delete-item', [], function () {
    var stream = through().obj();

    sandboxApi.remove({
      'assetType': gutil.env.sbAssetType,
      'fileName': gutil.env.sbFileName
    }).pipe(stream);

    return stream;
  });

  gulp.task('sandbox-write-item', [], function () {
    var stream = through().obj();

    sandboxApi.write({
      'assetType': gutil.env.sbAssetType,
      'fileName': gutil.env.sbFileName
    }).pipe(stream);

    return stream;
  });

  gulp.task('sandbox-write', ['sandbox-write-item'], function (cb) {
    cb(null);
  });

  gulp.task('sandbox-delete', ['sandbox-delete-item'], function (cb) {
    cb(null);
  });
};
