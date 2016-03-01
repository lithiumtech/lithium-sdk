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
    var skinPath = 'res/feature/' + opts.feature + '/' + opts.version + '/res/skins/' + opts.skin + '/sass/skin.scss';
    var includePaths = [
      opts.includePathsPrefix + 'res/feature/responsivepeak/' + version + '/res/skins/',
      opts.includePathsPrefix + 'res/feature/responsivebase/' + version + '/res/skins/',
      opts.includePathsPrefix + 'res/feature/responsivebase/common/res/skins/'
    ];

    if (opts.debugMode) {
      putils.logDebug(gutil, 'skinPath: ' + skinPath);
    }

    return gulp.src(skinPath)
      .pipe(opts.lr ? plumber()() : gutil.noop())
      .pipe(sourcemaps().init())
      .pipe(sass()({
        includePaths: includePaths
      }))
      .pipe(sourcemaps().write())
      .pipe(rename()(skin + '.css'))
      .pipe(gulp.dest(opts.dest))
      .pipe(opts.lr ? lr() : gutil.noop());
  }

  return {
    process: function (patterns, dest, files) {
      return gulp.src(patterns)
       .pipe(gutil.env.filterFiles(files))
       .pipe(gulp.dest(dest));
    },
    compile: function (lr) {
      var debugMode = gutil.env['debug'];
      var verboseMode = gutil.env['verbose'];
      var server = getServer();
      var version = server.localSkinCompileVersion();
      var feature = server.localSkinCompileFeature();
      var skin = server.localSkinCompileSkin();
      var dest = server.localSkinCompileDest();
      var includePathsPrefix = '';

      if (server.useResponsiveConfigsFromServer()) {
        var respOptions = getResponsiveOptions();
        respOptions.getOptions(server, {
          verboseMode: verboseMode,
          debugMode: debugMode,
          configDir: gutil.env['configdir'] || server.configDir()
        }, function (config) {
          if (config.dev_skin) {
            skin = config.dev_skin.id;
            if (debugMode) {
              putils.logDebug(gutil, 'found skin: ' + skin);
            }
            if (config.skin[skin]) {
              feature = config.skin[skin].feature_id;
              if (debugMode) {
                putils.logDebug(gutil, 'found feature: ' + feature);
              }

              if (config.feature[feature]) {
                version = config.feature[feature].fq_version;
                if (debugMode) {
                  putils.logDebug(gutil, 'found version: ' + version);
                }
              }
            }
          }

          var pluginExport = getPluginExport();
          var coreOutputDir = gutil.env['todir'] || server.coreOutputDir();
          pluginExport.exportPlugin(server, {
            pluginType: 'core',
            doClear: false,
            verboseMode: verboseMode,
            debugMode: debugMode,
            coreOutputDir: coreOutputDir
          }, undefined, function() {
            includePathsPrefix = coreOutputDir;
            doCompile({
              feature: feature,
              version: version,
              skin: skin,
              includePathsPrefix: includePathsPrefix,
              debugMode: debugMode,
              lr: lr,
              dest: dest
            });
          });
        });
      } else {
        doCompile({
          feature: feature,
          version: version,
          skin: skin,
          includePathsPrefix: includePathsPrefix,
          debugMode: debugMode,
          lr: lr,
          dest: dest
        });
      }
    },
    server: function () {
      connect().server({
        root: [
          getServer().localServerDir(),
          'web'
        ],
        port: getServer().localServerPort(),
        middleware: function () {
          return [cors];
        }
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
            .filter(function(file) {
              return fs().statSync(path().join(dir, file)).isDirectory();
            });
        } catch(e) {
          gutil.log(gutil.colors.red('Warning: Skin feature path not found (this is expected for <= 15.11): ', dir));
          return [];
        }
      }

      var peakVars = getSkinVersions(peakFeaturePath).map(function(version) {
        return gulp.src([path().join(baseFeaturePath, version, '**', varsPath),
            path().join(peakFeaturePath, version, '**', varsPath)])
          .pipe(newer()(path().join(peakFeaturePath, version, peakSassPath, '_variables.scss')))
          .pipe(replace()('!default', ''))
          .pipe(replace()(/^\s*(\$.*)/gm, '//$1'))
          .pipe(replace()(/(\s*);/gm, ';'))
          .pipe(rename()('_variables.scss'))
          .pipe(gulpif()(function(file){ return file.path.indexOf(baseFeaturePath) >= 0; },
            gulp.dest(path().join(baseFeaturePath, version, baseSassPath))))
          .pipe(concat()('_variables.scss'))
          .pipe(gulp.dest(path().join(peakFeaturePath, version, peakSassPath)));
      });
      return peakVars;
    },
    FILES_PATTERN: SKIN_FILES_PATTERN
  };
};
