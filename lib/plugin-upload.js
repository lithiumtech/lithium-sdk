'use strict';

var fs = require('fs');
var dive = require('diveSync');
var zip = require('gulp-zip');
var request = require('request');
var through = require('through2').obj;
var streamSync = require('./stream-sync');
var pluginUtils = require('./plugin-utils');
var pluginDir = 'plugin';

var doZipPlugin = function(gulp) {
  return gulp.src([pluginDir + '/**', '!' + pluginDir + '/**/README.md', '!' + pluginDir + '/**/*.example'])
    .pipe(zip('plugin.lar'))
    .pipe(gulp.dest('.'));
};

module.exports = function (gulp, gutil) {
  var server;
  var opts;
  var cb = function() {};

  function callbackOrThrowError(err) {
    if (typeof cb === 'function') {
      cb(err, null);
    } else {
      process.exitCode = 1;
      throw err;
    }
  }

  function createManifest() {
    var date = new Date();
    var manifest = '#Manifest for the LAR\n';
    manifest = manifest + '#' + date + '\n';
    manifest = manifest + 'FILES=[';
    var files = [];

    if (fs.existsSync(pluginDir)) {
      dive(pluginDir, { recursive: true, directories: true }, function (err, file) {
        if (err) {
          process.exitCode = 1;
          throw err;
        }

        files.push(file);
      });
    }
    var toolVersion = server.toolVersion();
    manifest = manifest + files;
    manifest = manifest + ']\n';
    manifest = manifest + 'timestamp=' + date + '\n';
    manifest = manifest + 'LDNTool-Version=' + toolVersion + '\n';
    manifest = manifest + 'User=';

    fs.writeFileSync(pluginDir + '/Manifest.MF', manifest);
  }

  function zipPlugin() {
    return doZipPlugin(gulp);
  }

  function upload(done) {
    var options = {
      headers: {
        Authorization: 'Bearer ' + server.pluginToken()
      }
    };
    var pluginUploadUrl;
    if (server.pluginUploadProtocol() === 'https') {
      options.rejectUnauthorized = false;
    }

    pluginUploadUrl = server.serverUrl();
    if (server.community !== undefined && server.community() !== undefined) {
      pluginUploadUrl = pluginUploadUrl + server.community();
    }
    pluginUploadUrl = pluginUtils.urlBldr(pluginUploadUrl + '/restapi/ldntool/larservice/submit-lar')
      .query('format', 'json')
      .queryIf(server.strictMode(), 'lar.strict_mode', 'true')
      .queryIf(gutil.env.dryrun || server.dryRun(), 'lar.dry_run', 'true')
      .queryIf(server.allowStudioOverrides(), 'lar.allow_studio_overrides', 'true')
      .queryIf(server.skipTemplateValidation(), 'lar.skip_template_validation', 'true')
      .build();

    if (opts.debugMode) {
      pluginUtils.logDebug(gutil, 'making call to ' + pluginUploadUrl);
      pluginUtils.logDebug(gutil, 'options: ' + JSON.stringify(options));
    }

    var req = request.post(pluginUploadUrl, options);
    req.form().append('data', fs.createReadStream('plugin.lar'));

    return processResponse(req, done);
  }

  function processResponse(req, done) {
    var all = [];
    var dataLen = 0;

    function onData(chunk, enc, callback) {
      all.push(chunk);
      dataLen += chunk.length;
      callback(null);
    }

    function onEnd() {
      var buf = new Buffer(dataLen);
      for (var i=0, len = all.length, pos = 0; i < len; i++) {
        all[i].copy(buf, pos);
        pos += all[i].length;
      }
      var data = buf.toString();
      if (opts.debugMode) {
        pluginUtils.logDebug(gutil, 'response from server: ' + data);
      }
      var serviceResponse = JSON.parse(data);
      if (serviceResponse['service-response']) {
        serviceResponse = serviceResponse['service-response'];
      }

      if (['UPLOAD_SUCCESS', 'DRY_RUN_SUCCESS'].indexOf(serviceResponse.status) <= -1) {
        pluginUtils.logHardFailures(serviceResponse, gutil, 'submit-plugin');
        var errMsg = 'Plugin upload failed';
        gutil.log(gutil.colors.red(errMsg));
        process.exitCode = 1;
        callbackOrThrowError(new Error(errMsg));
      } else {
        pluginUtils.logSoftFailures(serviceResponse, gutil);
        var successMsg = serviceResponse.status === 'DRY_RUN_SUCCESS' ? 'Dry run completed successfully'
          : 'Plugin uploaded successfully';
        gutil.log(gutil.colors.green(successMsg));
        if (typeof cb === 'function') {
          cb(successMsg);
        }
        done();
      }
    }

    var stream = through(onData).on('end', onEnd);

    req.on('response', function (res) {
      if (res.statusCode > 201) {
        process.exitCode = 1;
        callbackOrThrowError(new Error(pluginUtils.logErrorResponseStatusCode(gutil, res)));
      } else {
        res.pipe(stream);
      }
    }).on('error', function(err) {
      process.exitCode = 1;
      pluginUtils.logPluginRequestError(gutil, 'upload', err);
      callbackOrThrowError(err);
    });

    return stream;
  }

  return {
    upload: function (srvr, options, done, callback) {
      server = srvr;
      opts = options;
      if (typeof callback === 'function') {
        cb = callback;
      }
      gutil.log(gutil.colors.cyan('Uploading plugin'));
      createManifest();
      return streamSync([zipPlugin, upload], done);
    }
  };
};