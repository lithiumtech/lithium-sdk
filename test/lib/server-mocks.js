'use strict';

function createServerMock(serverConfig, options) {
  var serverApi = {};
  Object.keys(serverConfig).forEach(function (key) {
    serverApi[key] = function () {
      return serverConfig[key];
    };
  });

  if (options) {
    Object.keys(options).forEach(function (key) {
      serverApi[key] = function () {
        return options[key];
      };
    });
  }

  serverApi['pluginUploadProtocol'] = function() {
    var serverUrl = serverApi['serverUrl']();
    if (serverUrl && serverUrl.indexOf('http://') > -1) {
      return 'http';
    }

    return 'https';
  };

  return serverApi;
}

function createDefaultServerMock(options) {
  return createServerMock({
    //community: '',
    dryRun: false,
    force: false,
    pluginPoints: [],
    pluginToken: 'c95a3357-baed-4f09-9596-86583189b33e',
    serverUrl: 'https://mycommunity.com',
    strictMode: false,
    verbose: false
  }, options);
}

module.exports = {
  createServerMock: createServerMock,
  createDefaultServerMock: createDefaultServerMock
};