/**
 * Library methods for server tasks
 *
 * @author Nikhil Modak
 */

'use strict';

var path = require('path');

module.exports = function (gulp, gutil) {

  var serverConfig = {};
  var serverConfigPath = gutil.env.serverConfig || 'server.conf.json';

  var defaults = {
    serverUrl: undefined,
    pluginToken: undefined,
    community: undefined,
    strictMode: false,
    dryRun: false,
    allowStudioOverrides: false,
    toolVersion: '1.0.0',
    pluginUploadProtocol: 'https',
    verbose: false,
    force: false,
    pluginPoints: [],

    //Hack to copy files to plugin - until sandbox is fully supported.
    sandboxPluginDir: undefined,
    pluginReloadUrl: '/t5/api/plugin'
  };

  try {
    serverConfig = require(path.join(process.cwd(), serverConfigPath));
  } catch (err) {
    throw new Error('Error reading server.conf.json at [' +
      path.join(process.cwd(), serverConfigPath) +
      ']. Please use template.server.conf.json to create server.conf.json.');
  }

  Object.keys(defaults).forEach(function (key) {
    if (!serverConfig.hasOwnProperty(key) || serverConfig[key] === undefined) {
      serverConfig[key] = defaults[key];
    }
  });

  // Adjust urls for protocol
  if (serverConfig.serverUrl) {
    serverConfig.serverUrl = serverConfig.serverUrl.replace(/https/, 'http');
    serverConfig.serverUrlSecure = serverConfig.serverUrl.replace(/http/, 'https');
  }

  var serverApi = {};

  Object.keys(serverConfig).forEach(function (key) {
    serverApi[key] = function () {
      return serverConfig[key];
    };
  });

  return serverApi;
};
