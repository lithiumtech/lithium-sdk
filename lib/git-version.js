'use strict';

var Q = require('q');
var exec = require('child_process').exec;
var through = require('through2').obj;
var path = require('path');

module.exports = function (gulp, gutil) {

  var cmd = 'git rev-parse --abbrev-ref HEAD && ' +   //branch
    'git log -1 --pretty=format:"%ad\n%h\n%s"';  //time of commit, commit hash, commit message
  var contents = '';

  return {
    create: function (dest) {
      var stream = through();
      var contents;
      var repo = process.cwd().split('/').pop();
      exec(cmd, function (err, result) {
        var data = result.split('\n');
        contents = repo + ' | ' + data[0].trim() + '\n' +
          data[2] + ' | ' + data[1] + '\n' +
          data[3] + '\n\n';
        if (err) {
          stream.emit('error', err);
        } else {
          var file = new gutil.File({
            contents: new Buffer(contents + 'Plugin created: ' + new Date().toLocaleString() + '\n', 'utf8'),
            base: '',
            cwd: '',
            path: 'version'
          });
          stream.end(file);
        }
      });
      return stream.pipe(gulp.dest(path.join(dest, 'web/html/' + repo + '/status')));
    }
  };
};
