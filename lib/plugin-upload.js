'use strict';

var fs = require('fs');
var dive = require('diveSync');
var zip = require('gulp-zip');
var request = require('request');
var through = require('through2').obj;
var streamSync = require('./stream-sync');
var parser = require('xml2json');

module.exports = function (gulp, gutil) {
  var server;
  var error = false;
  try {
    server = require('../lib/server.js')(gulp, gutil);
    if (server.serverUrl() === undefined) {
      gutil.log(gutil.colors.red('A server URL is required in your configuration. ' +
        'Please use template.server.conf.json to create server.conf.json.'));
      error = true;
    }
    if (server.pluginToken() === undefined) {
      gutil.log(gutil.colors.red('A plugin token is required in your configuration. ' +
        'Please use template.server.conf.json to create server.conf.json.'));
      error = true;
    }
  } catch (err) {
    gutil.log(gutil.colors.red(err.message));
    error = true;
  }
  if (error) {
    process.exit(1);
  }

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

  function urlBldr(url) {

    return {
      build: function() {
        return url;
      },
      add: function(val) {
        return urlBldr(url + val);
      },
      addIf: function(bool, val) {
        return bool ? this.add(val) : urlBldr(url);
      },
      query: function(nm, val) {
          return url.indexOf('?') > -1 ? this.add('&' + nm + '=' + val) : this.add('?' + nm + '=' + val);
      },
      queryIf: function(bool, nm, val) {
        return bool ? this.query(nm, val) : urlBldr(url);
      }
    };
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
      pluginUploadUrl = server.serverUrlSecure();
    } else {
      pluginUploadUrl = server.serverUrl();
    }
    if (server.community() !== undefined) {
      pluginUploadUrl = pluginUploadUrl + server.community();
    }
    pluginUploadUrl = urlBldr(pluginUploadUrl + '/restapi/ldntool/larservice/submit-lar')
        .queryIf(server.strictMode(), 'lar.strict_mode', 'true')
        .queryIf(server.dryRun(), 'lar.dry_run', 'true')
        .queryIf(server.allowStudioOverrides(), 'lar.allow_studio_overrides', 'true')
        .build();

    var req = request.post(pluginUploadUrl, options);
    req.form().append('data', fs.createReadStream('plugin.lar'));

    return processResponse(req);
  }

  function processResponse(req) {

    function htmlDecode(str) {
      return String(str).replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#35;/g, '#')
        .replace(/&#40;/g, '(').replace(/&#41;/g, ')');
    }

    function write(data, enc, callback) {
      var serviceResponse = JSON.parse(parser.toJson(data))['service-response'];
      if (['UPLOAD_FAIL', 'DRY_RUN_FAIL'].indexOf(serviceResponse.status) > -1) {
        var errorMessage = 'Error: [' + serviceResponse.status + '] ' + serviceResponse.message;
        if (serviceResponse.hasOwnProperty('hard-failures')) {

          var hardFailures = serviceResponse['hard-failures'];

          if (!Array.isArray(hardFailures)) {
            hardFailures = new Array(hardFailures);
          }

          hardFailures.forEach(function(hardFailure) {
            errorMessage = errorMessage + '\n' +
            'Failure Code: ' + hardFailure.code + '\n' +
            'Failure Rule: ' + hardFailure.ruleFailed + '\n' +
            'Failure Message: ' + htmlDecode(hardFailure.message) + '\n' +
            'Failure Details: ' + htmlDecode(hardFailure.details) + '\n';
            var errorSuggestion = hardFailure.suggestion;
            if (typeof errorSuggestion === 'string') {
              errorMessage += 'Suggestion: ' + errorSuggestion + '\n';
            }
          });
        }
        var pluginError = new gutil.PluginError(
          'plugin-upload',
          errorMessage,
          { showStack: false }
        );
        gutil.log(gutil.colors.yellow(pluginError));
        gutil.log(gutil.colors.red('Plugin upload failed'));
        callback(null);
        process.exit(1);
      } else {
        var warnMessage = 'Warning: [' + serviceResponse.status + '] ' + serviceResponse.message;
        if (serviceResponse.hasOwnProperty('soft-failures')) {

          var softFailures = serviceResponse['soft-failures'];

          if (!Array.isArray(softFailures)) {
            softFailures = new Array(softFailures);
          }

          softFailures.forEach(function(softFailure) {
            warnMessage += '\n' +
            'Warn Code: ' + softFailure.code + '\n' +
            'Warn Rule: ' + softFailure.ruleFailed + '\n' +
            'Warn Message: ' + htmlDecode(softFailure.message) + '\n' +
            'Warn Details: ' + htmlDecode(softFailure.details) + '\n';
            var warnSuggestion = softFailure.suggestion;
            if (typeof warnSuggestion === 'string') {
              warnMessage += 'Suggestion: ' + warnSuggestion + '\n';
            }
          });

          gutil.log(gutil.colors.yellow(warnMessage));
        }
        var successMsg = serviceResponse.status === 'DRY_RUN_SUCCESS' ? 'Dry run completed successfully'
          : 'Plugin uploaded successfully';
        gutil.log(gutil.colors.green(successMsg));
        callback(null);
        process.exit(0);
      }
    }

    var stream = through(write);

    req.on('response', function (res) {
      if (res.statusCode > 200) {
        gutil.log(gutil.colors.red('server returned status code ' + res.statusCode));
        process.exit(1);
      } else {
        res.pipe(stream);
      }
    });

    return stream;
  }

  return {
    upload: function () {
      gutil.log(gutil.colors.cyan('Uploading plugin'));
      createManifest();
      return streamSync([zipPlugin, upload]);
    }
  };
};
