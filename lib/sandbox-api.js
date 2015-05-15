'use strict';

var request = require('request');
var through = require('through2').obj;

module.exports = function (gulp, gutil) {
  function pluginItem(dir, ext, enc) {
    return {
      'dir': dir,
      'ext': ext,
      'enc': enc,
      'url': ''
    };
  }

  var PLUGIN_POINTS = {
    'component': pluginItem('res/components', '.ftl', ''),
    'endpoint': pluginItem('res/controllers', '.ftl', ''),
    'macro': pluginItem('res/macros', '.ftl', ''),
    'quilt': pluginItem('res/quilts', '.quilt.xml', 'base64')
  };

  var server;
  var error = false;

  function errorChecks() {
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
  }


  function readItem(sandboxParams) {
    return makeRetrieveRequest(getPluginPoint(sandboxParams).url);
  }

  function writeItem(sandboxParams) {
    var pluginPoint = getPluginPoint(sandboxParams);
    var filePath = pluginPoint.dir + '/' + sandboxParams.fileName + pluginPoint.ext;

    return gulp.src(filePath, { cwd: 'src', nodir: true })
        .pipe(makeWriteRequest(pluginPoint.url, sandboxParams.fileName, pluginPoint.enc));
  }

  function deleteItem(sandboxParams) {
    return makeDeleteRequest(getPluginPoint(sandboxParams).url, sandboxParams.fileName);
  }

  function getPluginPoint(sandboxParams) {
    var pluginPoint = PLUGIN_POINTS[sandboxParams.assetType];
    if (typeof pluginPoint === 'undefined') {
      gutil.log(gutil.colors.red('Sandbox write failed, invalid asset type: ' + sandboxParams.assetType));
      process.exit(1);
    }

    pluginPoint.url = getPluginUrl(sandboxParams);

    return pluginPoint;
  }

  function getPluginUrl(sandboxParams) {
    var pluginUploadUrl;
    if (server.pluginUploadProtocol() === 'https') {
      options.rejectUnauthorized = false;
      pluginUploadUrl = server.serverUrlSecure();
    } else {
      pluginUploadUrl = server.serverUrl();
    }
    pluginUploadUrl = pluginUploadUrl + '/restapi/ldntool/larservice/sandbox/assets/' + sandboxParams.assetType;

    return pluginUploadUrl;
  }

  function makeWriteRequest(url, name, encoding) {
    return through(
      function write(data) {
        var contents = data.contents.toString();

        if (encoding === 'base64') {
          contents = new Buffer(contents).toString('base64');
        }

        var payload = {
          'name': name,
          'encoding': encoding,
          'content': contents
        };

        // gutil.log(gutil.colors.blue('payload: ' + JSON.stringify(payload)));

        makeRequest(url, 'POST', function () {}, payload, true);
      },
        function end() {
      }
    );
  }

  function makeRetrieveRequest(url) {
    return through(function () {}, makeRequest(url, 'GET', function (res) {
      console.log('assets: \n');
      res.assets.forEach(function (asset) {
        console.log(asset.name + '\n');
      });
    }));
  }

  function makeDeleteRequest(url, name) {
    return through(function () {}, makeRequest(url + '/' + name, 'DELETE'));
  }

  function makeRequest(url, method, cb, payload, json) {
    gutil.log(gutil.colors.blue('calling out via ' + method + ': ' + url));
    var actionName =  method.toLowerCase();
    var headers = {
      'Authorization': 'Bearer ' + server.pluginToken(),
      'Content-Type': 'application/json'
    };

    if ('GET' === method) {
      headers['Content-Type'] = '';
    }

    var options = {
        url: url,
        method: method,
        headers: headers,
        body: payload,
        json: json
    };

    var req = request(options);

    return processResponse(req, actionName, cb);
  }

  function processResponse(req, actionName, cb) {
    // console.log(req);

    function write(data, enc, callback) {
      var serviceResponse = JSON.parse(data);
      if (serviceResponse.status !== 'success') {
        var errorMessage = 'Error: [' + serviceResponse.status + '] ' + serviceResponse.message;
        gutil.log(gutil.colors.red('Error: ' + errorMessage));
        callback(
          new gutil.PluginError(
            'sandbox-' + actionName,
            errorMessage,
            { showStack: false }
          ));
      } else {
        if (cb) {
          cb(serviceResponse);
        } else {
          gutil.log(gutil.colors.green('Sandbox modified successfully'));
        }

        callback(null);
      }
    }

    var stream = through(write);
    req.on('response', function (res) {
      gutil.log(gutil.colors.blue('status code: ' + res.statusCode));
      if (res.statusCode !== 200) {
        stream.emit('error',
          new gutil.PluginError(
              'sandbox-' + actionName,
              'Sandbox ' + actionName + ' failed, response status code: ' + res.statusCode,
              { showStack: false }
          ));
      } else {
        res.pipe(stream);
      }
    });

    return stream;
  }

  return {
    read: function (sandboxParams) {
      errorChecks();
      gutil.log(gutil.colors.cyan('Retrieving sandbox files for the ' + sandboxParams.assetType +
        ' asset type from your Lithium Community Sandbox'));
      return readItem(sandboxParams);
    },
    write: function (sandboxParams) {
      errorChecks();
      gutil.log(gutil.colors.cyan('Writing the ' + sandboxParams.fileName + ' ' + sandboxParams.assetType +
        ' to your Lithium Community Sandbox'));

      return writeItem(sandboxParams);
    },
    remove: function (sandboxParams) {
      errorChecks();
      gutil.log(gutil.colors.cyan('Deleting the ' + sandboxParams.fileName + ' ' + sandboxParams.assetType +
        ' from your Lithium Community Sandbox'));

      return deleteItem(sandboxParams);
    }
  };
};
