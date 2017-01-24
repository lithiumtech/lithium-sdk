'use strict';

var lazyReq = require('lazy-req')(require);
var connect = lazyReq('gulp-connect');
var fsExtra = lazyReq('fs-extra');
var fs = lazyReq('fs');
var path = require('path');
var request = require('request');
var putils = require('./plugin-utils');

module.exports = function (gulp, gutil) {
  var server = require('./server.js')(gulp, gutil);
  var skins = require('./skins.js')(gulp, gutil);

  function cors(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
  }

  /**
   * Filter for downloading mostly image assets right before they are served from local server.
   */
  function downloadAssets(req, res, next) {

    var assetUrl = req.originalUrl.split('?')[0];
    var matches = assetUrl.match(/\/html\/(\S+)/);
    //Ignore urls not matching asset endpoints
    if (!matches) {
      next();
      return;
    }

    if (matches.length < 2) {
      //Url does not match
      putils.logDebug(gutil, 'No file path specified in asset url. Ignoring download for ' + assetUrl);
      next();
      return;
    }
    var assetPath = path.join(matches[1]);
    var fileSystemAssetPath = path.join('web/html', assetPath);
    var pathExists = fs().existsSync(fileSystemAssetPath);
    if (pathExists) {
      //File already served from web/html
      next();
      return;
    }

    var tmpFilePath = path.join(server.localServerDir(), 'html', assetPath);
    pathExists = fs().existsSync(tmpFilePath);
    if (pathExists && fs().statSync(tmpFilePath).size > 0) {
      // File already downloaded to tmp.
      next();
      return;
    }

    var tmpDirPath = path.join(server.localServerDir(), 'html', path.dirname(assetPath));
    fsExtra().mkdirsSync(tmpDirPath);
    var options = {
      rejectUnauthorized: false
    };

    var serverUrl = server.serverUrl();
    if (server.community() && serverUrl.endsWith(server.community())) {
      serverUrl = serverUrl.substr(0, serverUrl.length - server.community().length);
    }

    var urlBld = putils.urlBldr(serverUrl);
    var serverAssetUrl = urlBld.add(assetUrl).build();
    downloadFile(serverAssetUrl, options, tmpFilePath, function(message) {
      putils.logDebug(gutil, message);
      next();
    });
  }

  /**
   * Util method for downloading url to a file specified in dest. The method copies content to a tmp file and renames
   * the file once download is finished.
   * @param url Url for download
   * @param options Request options
   * @param dest file path to destination
   * @param cb Callback function for success or error.
   */
  function downloadFile(url, options, dest, cb) {
    var file = fs().createWriteStream(dest + '.tmp');
    var sendReq = request.get(url, options);
    var errorOnDownload = false;
    // verify response code
    sendReq.on('response', function(response) {
      if (response.statusCode !== 200) {
        errorOnDownload = true;
        return cb('Response status was ' + response.statusCode + ' (for ' + url + ')');
      }
    });
    // check for request errors
    sendReq.on('error', function (err) {
      fs().unlink(file.path);
      if (cb) {
        return cb(err.message);
      }
    });
    sendReq.pipe(file);
    file.on('finish', function() {
      file.close();
      if (!errorOnDownload) {
        fs().renameSync(dest + '.tmp', dest);
        cb('Successfully downloaded asset = ' + dest);
      } else{
        fs().unlinkSync(dest + '.tmp');
      }
    });
    file.on('error', function(err) { // Handle errors
      fs().unlink(dest); // Delete the tmp file
      if (cb) {
        return cb(err.message);
      }
    });
  }

  function startLocalServer() {
    var responsiveOptions = require('./responsive-options.js')(gulp, gutil);
    skins.options().then(function (opts) {
      function runServer() {
        connect().server({
          root: [
            opts.localServerDir,
            'web',
            'plugin/res',
            'plugin/web',
            'src'
          ],
          port: opts.localServerPort,
          middleware: function () {
            return [cors, downloadAssets];
          }
        });
      }

      if (server.useResponsiveConfigsFromServer()) {
        return responsiveOptions.getOptions(server, opts, function (err, config) {
          if (err) throw err;
          opts = skins.setOptionsFromConfig(config, opts);
          return runServer();
        });
      } else {
        return runServer();
      }
    });
  }

  return {
    startLocalServer: startLocalServer,
    downloadAssets: downloadAssets,
    downloadFile: downloadFile
  };
};