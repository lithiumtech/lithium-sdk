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
        if (error) {
          reject(error.message);
        } else {
          var filesSynced = stdout.split('\n').filter(function (value) {
            return value.length > 0;
          });
          resolve(filesSynced);
        }
      });
    });
  });
};