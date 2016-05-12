'use strict';

var lazyReq = require('lazy-req')(require);
var path = lazyReq('path');

module.exports = function (gulp, gutil) {
  var text = require('../lib/text.js')(gulp, gutil);

  gulp.task('text', function () {
    var textPropPattern = gutil.env.ng.textProperties.map(function (dir) {
      return path().join(dir, text.FILES_PATTERN);
    });
    return text.processText(textPropPattern, text.TEXT_PLUGIN_PATH);
  });
};