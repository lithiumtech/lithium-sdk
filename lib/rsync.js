'use strict';

var fs = require('fs-extra');
var rsync = require('rsyncwrapper');

module.exports = function (src, dest) {
  return new Promise(function (resolve, reject) {
    fs.ensureDir(dest, function () {
      rsync({
        src: src,
        dest: dest,
        recursive: true,
        args: ['--update', '-i', '--out-format="%f"']
      }, function (error, stdout) {
        let hasError = false;
        if (error) {
          hasError = true;
          if (error.message.indexOf('rsync exited with code 24') === -1) {
            reject(error.message);
          }
        }
        let filesSynced = [];
        if (!hasError) {
          filesSynced = stdout.split('\n').filter(function (value) {
            return value.length > 0;
          });
        }
        resolve(filesSynced);
      });
    });
  });
};