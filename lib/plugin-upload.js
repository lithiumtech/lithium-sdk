'use strict';

var fs = require('fs');
var dive = require('diveSync');
var zip = require('gulp-zip');
var request = require('request');
var through = require('through2').obj;
var streamSync = require('./stream-sync');
var pluginUtils = require('./plugin-utils');
var parser = require('xml2json');

module.exports = function (gulp, gutil) {
  var server = undefined;

  function createManifest() {
    var date = new Date();
    var manifest = '#Manifest for the LAR\n';
    manifest = manifest + '#' + date + '\n';
    manifest = manifest + 'FILES=[';
    var files = [];
    var pluginDir = 'plugin';
    if (fs.existsSync(pluginDir)) {
      dive('plugin', { recursive: true, directories: true }, function (err, file) {
        if (err) {
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
    return gulp.src(['plugin/**', '!plugin/**/README.md', '!plugin/**/*.example'])
      .pipe(zip('plugin.lar'))
      .pipe(gulp.dest('.'));
  }

  function upload() {
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
    if (server.community() !== undefined) {
      pluginUploadUrl = pluginUploadUrl + server.community();
    }
    pluginUploadUrl = pluginUtils.urlBldr(pluginUploadUrl + '/restapi/ldntool/larservice/submit-lar')
        .queryIf(server.strictMode(), 'lar.strict_mode', 'true')
        .queryIf(gutil.env['dryrun'] || server.dryRun(), 'lar.dry_run', 'true')
        .queryIf(server.allowStudioOverrides(), 'lar.allow_studio_overrides', 'true')
        .build();

    var req = request.post(pluginUploadUrl, options);
    req.form().append('data', fs.createReadStream('plugin.lar'));

    return processResponse(req);
  }

  function processResponse(req) {
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
      var serviceResponse = JSON.parse(parser.toJson(data))['service-response'];
      if (['UPLOAD_SUCCESS', 'DRY_RUN_SUCCESS'].indexOf(serviceResponse.status) <= -1) {
        pluginUtils.logHardFailures(serviceResponse, gutil, 'submit-plugin');
        gutil.log(gutil.colors.red('Plugin upload failed'));
        process.exit(1);
      } else {
        pluginUtils.logSoftFailures(serviceResponse, gutil);
        var successMsg = serviceResponse.status === 'DRY_RUN_SUCCESS' ? 'Dry run completed successfully'
          : 'Plugin uploaded successfully';
        gutil.log(gutil.colors.green(successMsg));
      }
    }

    var stream = through(onData).on('end', onEnd);

    req.on('response', function (res) {
      if (res.statusCode > 201) {
        pluginUtils.logErrorResponseStatusCode(gutil, res);
        process.exit(1);
      } else {
        res.pipe(stream);
      }
    }).on('error', function(err) {
        pluginUtils.logRequestError(gutil, 'upload', err);
        process.exit(1);
    });

    return stream;
  }

  return {
    upload: function (srvr) {
      server = srvr;
      gutil.log(gutil.colors.cyan('Uploading plugin'));
      createManifest();
      return streamSync([zipPlugin, upload]);
    }
  };
};
