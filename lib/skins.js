/**
 * Library methods for styles and css tasks
 *
 * @author Nikhil Modak
 */

'use strict';
var SKIN_FILES_PATTERN = '**/*(*.css|*.scss|*.sass|*.ftl|*.png|*.svg|*.jpg|*.jpeg|skin.properties)';
var lazyReq = require('lazy-req')(require);
var sass = lazyReq('gulp-sass');
var connect = lazyReq('gulp-connect');
var sourcemaps = lazyReq('gulp-sourcemaps');
var rename = lazyReq('gulp-rename');
var plumber = lazyReq('gulp-plumber');
var path = lazyReq('path');
var replace = lazyReq('gulp-replace');
var concat = lazyReq('gulp-concat');
var gulpif = lazyReq('gulp-if');
var newer = lazyReq('gulp-newer');
var fs = lazyReq('fs');
var del = lazyReq('del');
var putils = require('./plugin-utils');
var streamSync = require('./stream-sync');
var skinLib = require('./skin')();
var url = require('url');
module.exports = function (gulp, gutil) {
  var server;
  var responsiveOptions;
  var pluginExport;

  function getServer() {
    return server ? server : server = require('./server.js')(gulp, gutil);
  }

  function getResponsiveOptions() {
    return responsiveOptions ? responsiveOptions : responsiveOptions = require('./responsive-options.js')(gulp, gutil);
  }

  function getPluginExport() {
    return pluginExport ? pluginExport : pluginExport = require('./plugin-export.js')(gulp, gutil);
  }

  var cors = function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
  };

  function doCompile(opts) {
    var skinPath = opts.includePathsPrefix + 'res/feature/' + opts.feature + '/' + opts.version + '/res/skins/' + opts.skin + '/sass/skin.scss';
    if (opts.skin != 'responsive_peak' && opts.skin != 'responsive_base') {
      skinPath = opts.skinPathPrefix + 'res/skins/' + opts.skin + '/sass/skin.scss';
    }
    if (opts.debugMode) {
      putils.logDebug(gutil, 'skinPath: ' + skinPath);
      putils.logDebug(gutil, 'includePaths: ' + opts.includePaths);
    }

    var lr = opts.lr;
    return gulp.src(skinPath)
      .pipe(lr ? plumber()() : gutil.noop())
      .pipe(sourcemaps().init())
      .pipe(sass()({
        includePaths: opts.includePaths,
        precision: 10
      }))
      .pipe(sourcemaps().write())
      .pipe(rename()(opts.skin + '.css'))
      .pipe(gulp.dest(opts.dest))
      .pipe(lr ? lr() : gutil.noop());
  }

  function debug(opts, msg) {
    if (opts.debugMode) {
      putils.logDebug(gutil, msg);
    }
  }

  function findCoreSkin(skin) {
    if (skin) {
      var responsiveSkin = skinLib.lookupResponsiveSkin(skin);
      if (responsiveSkin) {
        return responsiveSkin.getResponsiveCoreId();
      }
    }
    return null;
  }

  function setOptionsFromConfig(config, opts) {
    if (config.dev_skin) {
      opts.skin = config.dev_skin.id;
      debug(opts, 'found skin: ' + opts.skin);
      var coreSkin = findCoreSkin(opts.skin);
      debug(opts, 'coreSkin: ' + coreSkin);
      if (config.skin[coreSkin]) {
        opts.feature = config.skin[coreSkin].feature_id;
        debug(opts, 'found feature: ' + opts.feature);
        if (config.feature[opts.feature]) {
          opts.version = config.feature[opts.feature].fq_version;
          debug(opts, 'found version: ' + opts.version);
        }
      }
      opts.localServerPort = url.parse(config.dev_skin.url).port;
    }

    return opts;
  }

  function getDefaultOptions(server) {
    var version = server.localSkinCompileVersion();
    return {
      debugMode: gutil.env['debug'],
      verboseMode: gutil.env['verbose'],
      configDir: server.configDir(),
      version: version,
      feature: server.localSkinCompileFeature(),
      skin: server.localSkinCompileSkin(),
      dest: server.localSkinCompileDest(),
      localServerDir: server.localServerDir(),
      localServerPort: server.localServerPort(),
      includePathsPrefix: '',
      skinPathPrefix: '',
      includePaths: [
        'res/feature/responsivepeak/' + version + '/res/skins/',
        'res/feature/responsivebase/' + version + '/res/skins/',
        'res/feature/responsivebase/common/res/skins/'
      ],
      doClear: false
    };
  }

  return {
    process: function (patterns, dest, files) {
      return gulp.src(patterns)
        .pipe(gutil.env.filterFiles(files))
        .pipe(gulp.dest(dest));
    },
    compile: function (delCoreOutputDir, lr) {
      var server = getServer();
      var opts = getDefaultOptions(server);
      opts.lr = lr;
      opts.coreOutputDir = gutil.env['todir'] || server.coreOutputDir();

      if (server.useResponsiveConfigsFromServer()) {
        var responsiveOptions = function() {
          return getResponsiveOptions().getOptions(server, opts, function (err, config) {
            if (err) throw err;
            opts = setOptionsFromConfig(config, opts);
            opts.coreOutputDir = gutil.env['todir'] || server.coreOutputDir();
            opts.includePathsPrefix = opts.coreOutputDir + '/';
            opts.includePaths = [
              opts.includePathsPrefix + 'res/feature/responsivepeak/' + opts.version + '/res/skins/',
              opts.includePathsPrefix + 'res/feature/responsivebase/' + opts.version + '/res/skins/',
              opts.includePathsPrefix + 'res/feature/responsivebase/common/res/skins/',
              'res/skins'
            ];

            return doCompile(opts);
          });
        };

        var corePluginFiles = function() {
          return getPluginExport().exportCorePlugin(server, opts, undefined, function () {});
        };

        var fileSystem = fs();

        var coreOutputDirExists = fileSystem.existsSync(opts.coreOutputDir);

        if (coreOutputDirExists && gutil.env['force'] && delCoreOutputDir) {
          del().sync(opts.coreOutputDir, { force: true });
          coreOutputDirExists = false;
        }

        if (!coreOutputDirExists) {
          return streamSync([corePluginFiles, responsiveOptions]);
        } else {
          return responsiveOptions();
        }
      } else {
        return doCompile(opts);
      }
    },
    doCompile: doCompile,
    server: function () {
      var server = getServer();
      var opts = getDefaultOptions(server);

      var runServer = function() {
        connect().server({
          root: [
            opts.localServerDir,
            'web'
          ],
          port: opts.localServerPort,
          middleware: function () {
            return [cors];
          }
        });
      };

      if (server.useResponsiveConfigsFromServer()) {
        var setOptsFromConfig = function() {
          return getResponsiveOptions().getOptions(server, opts, function (err, config) {
            if (err) throw err;
            opts = setOptionsFromConfig(config, opts);
            return runServer();
          });
        };

        return setOptsFromConfig();
      } else {
        return runServer();
      }
    },
    vars: function () {
      var server = getServer();
      var baseFeaturePath = 'res/feature/responsivebase';
      var peakFeaturePath = 'res/feature/responsivepeak';
      var baseSassPath = 'res/skins/bootstrap_base/sass';
      var peakSassPath = 'res/skins/responsive_peak/sass';
      var varsPath = 'codebook/_variables-*.scss';

      function getSkinVersions(dir) {
        try {
          fs().accessSync(dir, fs().F_OK);
          return fs().readdirSync(dir)
            .filter(function (file) {
              return fs().statSync(path().join(dir, file)).isDirectory();
            });
        } catch (e) {
          if (!server.useResponsiveConfigsFromServer()) {
            gutil.log(gutil.colors.red('Warning: Skin feature path not found (this is expected for <= 15.11): ', dir));
          }
          return [];
        }
      }

      var peakVars = getSkinVersions(peakFeaturePath).map(function (version) {
        return gulp.src([path().join(baseFeaturePath, version, '**', varsPath),
          path().join(peakFeaturePath, version, '**', varsPath)])
          .pipe(newer()(path().join(peakFeaturePath, version, peakSassPath, '_variables.scss')))
          .pipe(replace()('!default', ''))
          .pipe(replace()(/^\s*(\$.*)/gm, '//$1'))
          .pipe(replace()(/(\s*);/gm, ';'))
          .pipe(rename()('_variables.scss'))
          .pipe(gulpif()(function (file) {
              return file.path.indexOf(baseFeaturePath) >= 0;
            },
            gulp.dest(path().join(baseFeaturePath, version, baseSassPath))))
          .pipe(concat()('_variables.scss'))
          .pipe(gulp.dest(path().join(peakFeaturePath, version, peakSassPath)));
      });
      return peakVars;
    },
    FILES_PATTERN: SKIN_FILES_PATTERN
  };
};
