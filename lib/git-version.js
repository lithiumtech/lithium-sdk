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
      var versions = {};
      Q.all(gutil.env.ng.gitReposForVersion.map(function (repo) {
        return Q.nfcall(exec, cmd, { cwd: repo });
      })).then(function (results) {
        for (var i = 0; i < results.length; i++) {
          var result = results[i];
          var repo = gutil.env.ng.gitReposForVersion[i];
          var data = result[0].split('\n');
          versions[new Date(data[1])] = repo.split('/').pop() + ' | ' + data[0].trim() + '\n' +
            data[2] + ' | ' + data[1] + '\n' +
            data[3] + '\n\n';
        }
        var times = Object.keys(versions).sort();
        for (var j = 0; j < times.length; j++) {
          contents = versions[times[j]] + contents;
        }
      }).done(function (err) {
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
      return stream.pipe(gulp.dest(path.join(dest, 'web/html/ng-app/status')));
    }
  };
};
