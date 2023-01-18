'use strict';

var lazyReq = require('lazy-req')(require);
var inquirer = require('inquirer');
var fs = require('fs');
var path = require('path');
var through = lazyReq('through2');
var putils = require('../lib/plugin-utils');

module.exports = function (gulp, gutil) {
  var skinLib = require('../lib/skin')(gulp, gutil);

  /**
   * This function should match all validations for studio skin creation. As of 16.4, studio skin creation does not
   * allow underscores,spaces or dashes in skin name but allows them on the title.
   */
  function validate(value, regex, name, len) {
    if (value === '') {
      return 'Please provide a valid value';
    }
    var cases = value.match(regex);
    if (cases === null) {
      return 'Invalid value, please try again.';
    }
    if (value.length > len) {
      return name + ' too long. Please use '+len+' chars or less';
    }
    return true;
  }

  /**
   * Replace all spaces with underscores and converts the skin name to lowercase
   */
  function normalizeSkinId(value) {
    if (value === '') {
      process.exitCode = 9;
      throw Error('Bad input value');
    }
    return value.trim().replace(/ /g, '_').toLowerCase();
  }

  /**
   * Exports core plugin skins for sdk if core plugins are not already downloaded.
   */
  function downloadCorePlugins(done) {

    var server = require('../lib/plugin-server.js')(gulp, gutil).getServer();
    var doClear = gutil.env.clearCore;
    if (fs.existsSync(server.coreOutputDir()) && !doClear) {
      if (gutil.env.debug) {
        putils.logDebug(gutil, 'Core plugins exist in directory ' +
          server.coreOutputDir() + '/ . Skipping download...');
      }
      //Start skin creation process
      return createNewSkin(done);
    }
    var stream = through().obj();
    var pluginExport = require('../lib/plugin-export.js')(gulp, gutil);
    //Download core plugins
    pluginExport.exportPlugin(server, {
      pluginType: 'core',
      verboseMode: gutil.env.verbose,
      debugMode: gutil.env.debug,
      coreOutputDir: server.coreOutputDir()
    }, undefined, function(err) {
      if (err) {
        putils.logError(gutil, 'Error downloading core plugins! Error: ' + err.message);
        process.exit(1);
      }
      //Start skin creation process
      return createNewSkin(done);
    }).pipe(stream);
  }

  /**
   * Interactive create skin function. Allows to create a brand
   * new skin with responsive and non responsive support.
   * SDK skins are also valid skin parents. Creates a blank
   * skin directory structure under skin base dir of sdk project.
   */
  function createNewSkin(done) {
    var putils = require('../lib/plugin-utils');

    var options = {
      skinInfo: {}
    };

    inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'What is the display name for your skin?',
        validate: function (val) {
          return validate(val, /^[a-zA-Z0-9 _\-]+$/, 'Skin display name', 100);
        }
      },
      {
        type: 'confirm',
        name: 'continue',
        message: 'Do you want to continue?',
        when: function (repo) {
          var normalizedSkinId = normalizeSkinId(repo.name);
          if (fs.existsSync(path.join('./res/skins/', normalizedSkinId))) {
            console.log(gutil.colors.red('Skin ID ' +
              gutil.colors.bold(normalizedSkinId) + ' already exists' +
              '\nChoose a different skin ID.'));
            done();
            process.exit(1);
          } else {
            return false;
          }
        },
        default: true
      },
      {
        type: 'confirm',
        name: 'isResponsive',
        message: 'Do you want to create a responsive skin?',
        default: function () {
          return true;
        }
      },
      {
        name: 'parentSkin',
        type: 'list',
        message: 'Select a parent skin from the list.',
        choices: function(repo) {
          var otherCommunitySkins = skinLib.getOtherCommunitySkins();

          var version = require('../lib/version-check')(gulp, gutil).getVersion();
          skinLib.setLiaVersion(version);
          var isThemeEnabled = require('../lib/check-themes')(gulp, gutil).getThemeEnabled();
          skinLib.setThemesMap(isThemeEnabled);

          if (repo.isResponsive) {
            var communityResponsiveSkinIds = otherCommunitySkins.filter(function(skin) {
              return skin.isResponsive();
            }).map(function(skin) {
              return skin.getId();
            });
            //All core responsive skins are allowed parents. All local SDK skins and community skins from
            //other plugins that are responsive are allowed parents
            return skinLib.getResponsiveSkinIds()
              .concat(skinLib.getCoreResponsiveSkinIds()).concat(communityResponsiveSkinIds);
          } else {
            //All core and community skins plus all sdk local skins are valid parents
            var communitySkinIds = otherCommunitySkins.filter(function(skin) {
              return !skin.isResponsive() && !skin.getIsTheme();
            }).map(function(skin) {
              return skin.getId();
            });
            return skinLib.getLocalSkins().map(function(skin) {
              return skin.getId();
            }).concat(skinLib.getCoreSkinIds()).concat(communitySkinIds);
          }
        }
      }
    ], function (answers) {

      var normalizedSkinId = normalizeSkinId(answers.name);
      putils.logInfoHighlighted(gutil, 'Creating ' +
        (answers.isResponsive ? 'responsive skin: ' : 'skin: ') + normalizedSkinId);

      // set up new skin info
      options.skinInfo.name = normalizedSkinId;
      options.skinInfo.title = answers.title;
      options.skinInfo.isResponsive = answers.isResponsive;
      options.skinInfo.debugMode = gutil.env.debug;

      if (options.skinInfo.debugMode) {
        putils.logDebug(gutil, 'Finding parent skin: ', answers.parentSkin);
      }
      // Load skin info from file system. By this time all skins including core should be available in SDK
      options.skinInfo.parentSkin =
        new skinLib.Skin(answers.parentSkin, skinLib.findBaseDirForSkin(answers.parentSkin));

      // Register a error call back to warn user of a failed skin creation process.
      options.skinInfo.errorCb = function(err, done) {
        if (err) {
          putils.logError(gutil, 'Error creating skin: ' + normalizedSkinId + ' Error: ' + err.message);
          console.log(err, err.stack.split('\n'));
          // Should we clear out the newly created skin dir? TODO
          if (fs.existsSync(path.join(skinLib.skinsBaseDir, normalizedSkinId))) {
            putils.logWarning(gutil, 'Newly created skin directory has not been cleared.');
          }
          putils.logWarning(gutil, 'Please delete the directory ' + normalizedSkinId +
            ' under ' + skinLib.skinsBaseDir + ' and try again.');
        }
        done();
      };

      var skinUtil = require('../lib/skins')(gulp, gutil);

      //Success function when all skin creation process is completed successfully
      options.skinInfo.cb = function(done) {
        putils.logSuccess(gutil, gutil.colors.green('Created new skin: ' +
          normalizedSkinId + ' under ' + skinLib.skinsBaseDir + ' dir.'));
        done();
        return;
      };
      try {
        skinUtil.createNewSkin(options.skinInfo, done);
      } catch(err) {
        process.exitCode = 1;
        options.skinInfo.errorCb(err, done);
      }
    });
  }

  gulp.task('create-new-skin', gulp.series('check-themes', function (done) {
    //Check if we are creating skin on a sdk project
    if (!fs.existsSync('./server.conf.json')) {
      console.log(gutil.colors.red('Please run create-skin under your Lithium SDK project directory.' +
        '\n or create a new project with ' + gutil.colors.bold('li create-project') + ' before creating a new skin.'));
      process.exit(1);
      return null;
    }
    var stream = through().obj();
    downloadCorePlugins(done);
    return stream;
  }));

  return {
    createNewSkin: downloadCorePlugins
  };
};