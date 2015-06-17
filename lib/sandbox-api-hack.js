'use strict';

var request = require('request');
var through = require('through2').obj;
var spawn = require('child_process').spawn;
var path = require('path');
var is = require('is_js');

module.exports = function (gulp, gutil) {
  var SUPPORTED_UPDATE_PLUGIN_POINTS = [{
    id: 'skins',
    sub: ['images']
  }, { id: 'quilts' }, { id: 'layouts' }, { id: 'lang' }, { id: 'components' }];
  var SKIP_UPDATE_PLUGIN_POINTS = ['js'];
  var filesToUpload = [];
  var refreshTimeout = false;
  var server;
  var error = false;
  try {
    server = require('../lib/server.js')(gulp, gutil);
    if (server.serverUrl() === undefined) {
      gutil.log(gutil.colors.red('A server URL is required in your configuration. ' +
        'Please use template.server.conf.json to create server.conf.json.'));
      error = true;
    }
    if (server.sandboxPluginDir() === undefined) {
      gutil.log(gutil.colors.red('A sandboxPluginDir is required in your configuration. ' +
        'Please use template.server.conf.json to create server.conf.json.'));
      error = true;
    }
    // if (server.pluginToken() === undefined) {
    //   gutil.log(gutil.colors.red('A plugin token is required in your configuration.
    //    Please use template.server.conf.json to create server.conf.json.'));
    //   error = true;
    // }
  } catch (err) {
    gutil.log(gutil.colors.red(err.message));
    error = true;
  }
  if (error) {
    process.exit(1);
  }

  function refreshPlugin(callback, reload) {
    var req = request({
      url: server.serverUrl() + server.pluginReloadUrl(),
      qs: reload.all ? { all: true} : reload
    });
    var result;
    req.on('error', function (e) {
      callback(e);
    });
    req.on('response', function (res) {
      res.pipe(through(
        function (buf, enc, cb) {
          try {
            result = JSON.parse(String(buf));
          } catch (err) {
            callback(new Error('Failed to reload plugin \nResult: \n' +
              String(buf) + 'Error: ' + err.message));
          }
          cb();
        },
        function (cb) {
          if (result.reloaded) {
            callback();
          } else {
            callback(new Error('Failed to reload plugin'));
          }
          cb();
        }
      ));
    });
  }

  function done(err) {
    if (err) {
      gutil.log(gutil.colors.red('Failed to reload plugin. Error: ' + err.message));
    } else {
      gutil.log(gutil.colors.green('Uploaded staged files and refreshed plugin'));
    }
  }

  function deleteAllAndUploadFiles() {
    spawn('rsync', [
      '-d',
      '--delete-excluded',
      '--exclude=res',
      '--exclude=web',
      './',
      server.sandboxPluginDir() + '/'
    ], {
      cwd: 'plugin',
      stdio: ['pipe', 'ignore', 'inherit']
    }).on('close', function (code) {
      if (code === 0) {
        uploadFiles();
      } else {
        done(new Error('Failed to reset sandbox plugin'));
      }
    });
  }

  function uploadFiles() {
    refreshTimeout = false;
    var fileBase = path.join(process.cwd(), 'plugin') + '/';
    var reload = {};

    spawn(
      'rsync',
      ['-Rd']
        .concat(filesToUpload.map(
          function (filePath) {
            var relativePath = filePath.substr(fileBase.length);
            var testPath = relativePath.replace(/res\/feature\/.*\/res/, 'res');
            var parts = testPath.split('/');
            if (parts.length > 2 && parts[0] === 'res') {
              var matchFlag = false;
              SUPPORTED_UPDATE_PLUGIN_POINTS.forEach(function (item) {
                if (item.id === parts[1] && matchFlag === false) {
                  if (item.sub) {
                    for (var i = 2; i < parts.length; i++) {
                      if (parts[i].indexOf(item.sub) > -1) {
                        reload[item.id + '/' + item.sub] = true;
                        matchFlag = true;
                      }
                    }
                  }
                  if (matchFlag === false) {
                    reload[item.id] = true;
                    matchFlag = true;
                  }
                }
              });

              if (matchFlag === false) {
                reload.all = true;
              }
            }

            return relativePath;
          }))
        .concat(server.sandboxPluginDir()),
      {
        cwd: 'plugin',
        stdio: ['pipe', 'ignore', 'inherit']
      }
    ).on('close', function (code) {
      if (code === 0) {
        if (is.empty(reload)) {
          done();
        } else {
          refreshPlugin(done, reload);
        }
        filesToUpload = [];
      } else {
        done(new Error('Failed to upload files'));
      }
    });
  }

  return {
    uploadToSandbox: function (firstRun) {
      return through(
        function (file, en, cb) {
          if (filesToUpload.indexOf(file.path) === -1) {
            if (firstRun === undefined || !firstRun) {
              gutil.log('Staging file for upload: ', gutil.colors.cyan(file.path.substr(
                path.join(process.cwd(), 'plugin').length + 1)));
            }
            if (file.path !== path.join(process.cwd(), 'plugin')) {
              filesToUpload.push(file.path);
            }
          }
          this.push(file);
          cb();
        },
        function (cb) {
          if (refreshTimeout) {
            clearTimeout(refreshTimeout);
          }
          refreshTimeout = setTimeout(firstRun? deleteAllAndUploadFiles : uploadFiles, 1000);
          cb();
        }
      );
    }
  };
};