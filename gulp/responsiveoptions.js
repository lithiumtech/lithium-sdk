'use strict';

var lazyReq = require('lazy-req')(require);
var inquirer = lazyReq('inquirer');
var through = lazyReq('through2');
var putils = require('../lib/plugin-utils');

module.exports = function (gulp, gutil) {
  var responsiveOptions, pluginServer, skinLib;

  function getPluginServer() {
    if (!pluginServer) {
      pluginServer = require('../lib/plugin-server.js')(gulp, gutil);
    }

    return pluginServer;
  }

  function getResponsiveOptions() {
    if (!responsiveOptions) {
      responsiveOptions = require('../lib/responsive-options.js')(gulp, gutil);
    }

    return responsiveOptions;
  }

  function getSkinLib() {
    if (!skinLib) {
      skinLib = require('../lib/skin')();
    }

    return skinLib;
  }

  gulp.task('responsive-options', ['version-check'], function () {
    var stream = through().obj();
    var server = getPluginServer().getServer();
    if ((gutil.env['force'] || server.force()) && !gutil.env['prompt']) {
      var skinId = gutil.env['skin'];
      var port = gutil.env['port'];
      var anon = gutil.env['anon'];

      if (typeof skinId == 'undefined' || typeof port == 'undefined') {
        throw new Error('must pass both --skin and --port parameters when using the --force flag');
      }

      getResponsiveOptions().putOptions(server, {
        skinOpts: {
          enabled: true,
          id: skinId,
          url: 'http://localhost:' + port + '/style/' + skinId + '.css',
          anonymous_viewing: (typeof anon != 'undefined')
        },
        verboseMode: gutil.env['verbose'],
        debugMode: gutil.env['debug'],
        configDir: gutil.env['configdir'] || server.configDir()
      }, cb).pipe(stream);
    } else {
      var skins = getSkinLib().getResponsiveSkinIds();
      if (skins.length < 1) {
        throw new Error('There are no responsive skins. You should create a skin in the res/skins folder and make its ' +
        'parent a responsive skin (such as the responsive_peak skin) by setting the parent property in the ' +
        'skin.properties file');
      }
      inquirer().prompt([
        {
          name: 'skinId',
          type: 'list',
          message: 'Select a skin id from the list.',
          choices: skins,
          validate: function (val) {
            return typeof val != 'undefined' && val.trim().length > 4;
          }
        },
        {
          name: 'port',
          type: 'input',
          message: function () {
            return 'Enter the Port you would like to serve the css on, or press enter to use the default';
          },
          validate: function (val) {
            return putils.validate(val, /^[0-9]+$/);
          },
          default: function () {
            return '9000';
          }
        }], function (answers) {
        getResponsiveOptions().putOptions(server, {
          skinOpts: {
            enabled: true,
            id: answers.skinId,
            url: 'http://localhost:' + answers.port + '/styles/' + answers.skinId + '.css',
            anonymous_viewing: true
          },
          verboseMode: gutil.env['verbose'],
          debugMode: gutil.env['debug'],
          configDir: gutil.env['configdir'] || server.configDir()
        }, function() {}).pipe(stream);
      });
    }

    return stream;
  });
};