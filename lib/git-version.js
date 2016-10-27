'use strict';

var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');

module.exports = function () {

  var cmd = 'git rev-parse --abbrev-ref HEAD && ' +   //branch
    'git log -1 --pretty=format:"%ad\n%h\n%s"';  //time of commit, commit hash, commit message

  return {
    create: function (dest, cb) {
      var contents;
      var repo = process.cwd().split('/').pop();
      exec(cmd, function (err, result) {
        var data = result.split('\n');
        contents = repo + ' | ' + data[0].trim() + '\n' +
          data[2] + ' | ' + data[1] + '\n' +
          data[3] + '\n\n';
        if (err) {
          cb(err);
        } else {
          fs.writeFile(path.join(dest, 'web/html/' + repo + '/status/version'), contents, cb);
        }
      });
    }
  };
};
