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
      skinLib = require('../lib/skin')(gulp, gutil);
    }

    return skinLib;
  }

  function validateSkinId(val) {
    return typeof val !== 'undefined' && val.trim().length > 4;
  }

  function validatePort(val) {
    return putils.validate(val, /^[0-9]+$/);
  }

  gulp.task('responsive-options', gulp.series('check-themes', function () {
    var stream = through().obj();
    var server = getPluginServer().getServer();
    if ((gutil.env.force || server.force()) && !gutil.env.prompt) {
      var skinId = gutil.env.skin;
      var port = gutil.env.port;
      var anon = gutil.env.anon;

      if (typeof skinId === 'undefined' || typeof port === 'undefined') {
        process.exitCode = 9;
        throw new Error('must pass both --skin and --port parameters when using the --force flag');
      }

      if (!validateSkinId(skinId)) {
        process.exitCode = 9;
        throw new Error('the value passed for skin is not valid.');
      }

      var portValidate = validatePort(port);

      if (portValidate !== true) {
        process.exitCode = 9;
        throw new Error('port: ' + portValidate);
      }

      getResponsiveOptions().putOptions(server, {
        skinOpts: {
          enabled: true,
          id: skinId,
          url: 'http://localhost:' + port + '/style/' + skinId + '.css',
          anonymous_viewing: (typeof anon !== 'undefined')
        },
        verboseMode: gutil.env.verbose,
        debugMode: gutil.env.debug,
        configDir: gutil.env.configdir || server.configDir()
      }, function(err) {
        if (err) {
          process.exitCode = 1;
          throw err;
        }
      }).pipe(stream);
    } else {
      var version = require('../lib/version-check')(gulp, gutil).getVersion();
      var skinLibVar = getSkinLib();
      skinLibVar.setLiaVersion(version);
      var isThemeEnabled = require('../lib/check-themes')(gulp, gutil).getThemeEnabled();
      skinLibVar.setThemesMap(isThemeEnabled);
      var skins = skinLibVar.getResponsiveSkinIds();
      if (skins.length < 1) {
        process.exitCode = 1;
        throw new Error('There are no responsive skins. You should create a skin in the res/skins folder and make ' +
          'its parent a responsive skin (such as the responsive_peak skin) by setting the parent property in the ' +
          'skin.properties file');
      }
      inquirer().prompt([
        {
          name: 'skinId',
          type: 'list',
          message: 'Select a skin id from the list.',
          choices: skins,
          validate: validateSkinId
        },
        {
          name: 'port',
          type: 'input',
          message: function () {
            return 'Enter the Port you would like to serve the css on, or press enter to use the default';
          },
          validate: validatePort,
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
          verboseMode: gutil.env.verbose,
          debugMode: gutil.env.debug,
          configDir: gutil.env.configdir || server.configDir()
        }, function(err) {
          if (err) {
            process.exitCode = 1;
            throw err;
          }
        }).pipe(stream);
      });
    }

    return stream;
  }));
};