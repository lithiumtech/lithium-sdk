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
var putils = require('./plugin-utils');
var skinLib = require('./skin')();
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
      skinPath = 'res/skins/' + opts.skin + '/sass/skin.scss';
    }
    if (opts.debugMode) {
      putils.logDebug(gutil, 'skinPath: ' + skinPath);
      putils.logDebug(gutil, 'includePaths: ' + opts.includePaths);
    }
    return gulp.src(skinPath)
      .pipe(opts.lr ? plumber()() : gutil.noop())
      .pipe(sourcemaps().init())
      .pipe(sass()({
        includePaths: opts.includePaths
      }))
      .pipe(sourcemaps().write())
      .pipe(rename()(opts.skin + '.css'))
      .pipe(gulp.dest(opts.dest))
      .pipe(opts.lr ? lr() : gutil.noop());
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
    }
  }

  function withOptions(cb) {
    var server = getServer();
    var version = server.localSkinCompileVersion();
    var opts = {
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
      includePaths: [
        'res/feature/responsivepeak/' + version + '/res/skins/',
        'res/feature/responsivebase/' + version + '/res/skins/',
        'res/feature/responsivebase/common/res/skins/'
      ],
      doClear: false
    };

    if (server.useResponsiveConfigsFromServer()) {
      var respOptions = getResponsiveOptions();
      respOptions.getOptions(opts, function (config) {
        setOptionsFromConfig(config, opts);
        cb(opts);
      });
    } else {
      cb(opts);
    }
  }

  return {
    process: function (patterns, dest, files) {
      return gulp.src(patterns)
        .pipe(gutil.env.filterFiles(files))
        .pipe(gulp.dest(dest));
    },
    compile: function (lr) {
      withOptions(function (opts) {
        opts.lr = lr;
        if (server.useResponsiveConfigsFromServer()) {
          var pluginExport = getPluginExport();
          opts.coreOutputDir = gutil.env['todir'] || server.coreOutputDir();
          pluginExport.exportCorePlugin(server, opts, undefined, function () {
            opts.includePathsPrefix = opts.coreOutputDir + '/';
            opts.includePaths = [
              opts.includePathsPrefix + 'res/feature/responsivepeak/' + opts.version + '/res/skins/',
              opts.includePathsPrefix + 'res/feature/responsivebase/' + opts.version + '/res/skins/',
              opts.includePathsPrefix + 'res/feature/responsivebase/common/res/skins/',
              'res/skins'
            ];
            return doCompile(opts);
          });
        } else {
          return doCompile(opts);
        }
      });
    },
    server: function () {
      withOptions(function (opts) {
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
      });
    },
    vars: function () {
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
          gutil.log(gutil.colors.red('Warning: Skin feature path not found (this is expected for <= 15.11): ', dir));
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
