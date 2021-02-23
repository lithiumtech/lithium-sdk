/**
 * Library methods for styles and css tasks
 *
 * @author Nikhil Modak
 */

'use strict';
var SKIN_FILES_PATTERN = '**/*(*.css|*.scss|*.sass|*.ftl|*.png|*.svg|*.jpg|*.jpeg|skin.properties)';
var lazyReq = require('lazy-req')(require);
var sass = lazyReq('gulp-sass');
var sourcemaps = lazyReq('gulp-sourcemaps');
var rename = lazyReq('gulp-rename');
var plumber = lazyReq('gulp-plumber');
var replace = lazyReq('gulp-replace');
var concat = lazyReq('gulp-concat');
var gulpif = lazyReq('gulp-if');
var newer = lazyReq('gulp-newer');
var fs = lazyReq('fs');
var del = lazyReq('del');
var putils = require('./plugin-utils');
var url = require('url');
var path = require('path');

module.exports = function (gulp, gutil) {
  var server = require('./server.js')(gulp, gutil);
  var responsiveOptions = require('./responsive-options.js')(gulp, gutil);
  var pluginExport = require('./plugin-export.js')(gulp, gutil);
  var skinLib = require('./skin')(gulp, gutil);
  var baseSassPath = 'res/skins/bootstrap_base/sass/';
  var peakSassPath = 'res/skins/responsive_peak/sass/';

  function doCompile(opts) {
    var skinSrcBase = gutil.env.newStructure ? 'plugin/res/' : 'res/';
    var skinPath = opts.includePathsPrefix + skinSrcBase + 'feature/' + opts.feature +
      '/' + opts.version + '/res/skins/' + opts.skin + '/sass/skin.scss';
    if (opts.skin !== 'responsive_peak' && opts.skin !== 'bootstrap_base') {
      skinPath = opts.skinPathPrefix + skinSrcBase + 'skins/' + opts.skin + '/sass/skin.scss';
    }
    if (opts.debugMode) {
      putils.logDebug(gutil, 'skinPath: ' + skinPath);
      putils.logDebug(gutil, 'includePaths: ' + opts.includePaths);
    }

    var lr = opts.lr;

    return new Promise(function (resolve, reject) {
      if (opts.debugMode) {
        putils.logDebug(gutil, 'compiling skin to ' + path.join(opts.dest, opts.skin + '.css'));
      }

      gulp.src(skinPath)
        .pipe(lr ? plumber()() : gutil.noop())
        .pipe(sourcemaps().init())
        .pipe(sass()({
          includePaths: opts.includePaths,
          precision: 10
        }))
        .pipe(sourcemaps().write())
        .pipe(rename()(opts.skin + '.css'))
        .pipe(gulp.dest(opts.dest))
        .pipe(lr ? lr() : gutil.noop())
          .on('finish', resolve)
          .on('end', resolve)
          .on('error', reject);
    });
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

  /**
   * Creates a brand new skin directory structure. If responsive skin, copies sass files from parent.
   * If non responsive skin, copies skin properties to desktop and mobile sub structures.
   * Initializes empty components dirs.
   */
  function createNewSkin(skinInfo) {
    //Create a dir with the skinId
    var skinDir = path.resolve(skinLib.skinsBaseDir, skinInfo.name);
    fs().mkdirSync(skinDir, skinInfo.errorCb);

    //Create skin properties
    var propertiesPath = path.resolve(skinDir, 'skin.properties');
    var skinProperties = {};
    skinProperties.title = skinInfo.name;
    skinProperties.parent = skinInfo.parentSkin.getId();

    var sassFilesToCopy = skinInfo.parentSkin.lookupProperty(skinLib.skinPropertyCopySass);

    var stream = fs().createWriteStream(propertiesPath);
    stream.once('open', function() {
      Object.keys(skinProperties).forEach(function (key) {
        stream.write(key + ' = ' + skinProperties[key] + '\n');
      });
      if (sassFilesToCopy) {
        sassFilesToCopy.forEach(function (key) {
          stream.write( skinLib.skinPropertyCopySass + ' += ' + key + '\n');
        });
      }
      stream.end();
    });

    function createSkinDirectoryStructure() {
        if (skinInfo.isResponsive) {
          //Create sass folder
          fs().mkdirSync(path.join(skinDir, skinLib.sassDir), skinInfo.errorCb);
          //Copy all sass files - wait until copy
          if (sassFilesToCopy) {
            sassFilesToCopy.forEach(function (key) {
              fs().writeFileSync(path.resolve(skinDir, skinLib.sassDir, key),
                  fs().readFileSync(path.resolve(skinInfo.parentSkin.getDir(), skinLib.sassDir, key)));
            });
          } else {
            putils.logWarning(gutil, 'No sass properties read from responsive parent for skin=' + skinInfo.name +
              '. This will not copy any sass assets for your new skin!');
          }
          //Create a component dir
          fs().mkdirSync(path.join(skinDir, skinLib.componentsDir), skinInfo.errorCb);
        } else {
          //Create desktop and mobile subsections
          //Copy all skin property files - wait until copy
          skinLib.skinSubFolder.forEach(function(folder) {
            fs().mkdirSync(path.join(skinDir, folder), skinInfo.errorCb);
            fs().writeFileSync(path.resolve(skinDir, folder, skinLib.skinPropertiesFileName),
                fs().readFileSync(path.resolve(skinDir, skinLib.skinPropertiesFileName)));
            //Create a components dir
            fs().mkdirSync(path.join(skinDir, folder, skinLib.componentsDir), skinInfo.errorCb);
            fs().mkdirSync(path.join(skinDir, folder, skinLib.cssDir), skinInfo.errorCb);
          });
        }
    }
    stream.on('finish', function() {
      try {
        createSkinDirectoryStructure();
        skinInfo.cb();
      } catch (err) {
        process.exitCode = 1;
        skinInfo.errorCb(err);
      }
    });
    return stream;
  }

  /* Creates the _variables.scss file that contains the base and peak
   * variables commented out that is then used in studio when a new responsive skin is created
   */
  function createVarsTemplate() {
    var varsPath = 'codebook/_variables-*.scss';

    function getSkinVersions(dir) {
      try {
        fs().accessSync(dir, fs().F_OK);
        return fs().readdirSync(dir)
          .filter(function (file) {
            return fs().statSync(path.join(dir, file)).isDirectory();
          });
      } catch (e) {
        if (!server.useResponsiveConfigsFromServer()) {
          gutil.log(gutil.colors.red('Warning: Skin feature path not found (this is expected for <= 15.11): ', dir));
        }
        return [];
      }
    }

    return getSkinVersions(skinLib.peakFeaturePath).map(function (version) {
      return gulp.src([path.join(skinLib.baseFeaturePath, version, '**', varsPath),
        path.join(skinLib.peakFeaturePath, version, '**', varsPath)])
        .pipe(newer()(path.join(skinLib.peakFeaturePath, version, peakSassPath, '_variables.scss')))
        .pipe(replace()('!default', ''))
        .pipe(replace()(/^\s*(?!(?:\/|\s))(.*)$/gm, '//$1'))
        .pipe(replace()(/(\s*);/gm, ';'))
        .pipe(rename()('_variables.scss'))
        .pipe(gulpif()(function (file) {
            return file.path.indexOf(skinLib.baseFeaturePath) >= 0;
          },
          gulp.dest(path.join(skinLib.baseFeaturePath, version, baseSassPath))))
        .pipe(concat()('_variables.scss'))
        .pipe(gulp.dest(path.join(skinLib.peakFeaturePath, version, peakSassPath)));
    });
  }

  function options() {
    var version = server.localSkinCompileVersion();

    var opts = {
      debugMode: gutil.env.debug,
      verboseMode: gutil.env.verbose,
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
        skinLib.peakFeaturePath + version + '/' + skinLib.skinsBaseDir,
        skinLib.baseFeaturePath + version + '/' + skinLib.skinsBaseDir,
        skinLib.baseFeaturePath + 'common/res/skins',
        skinLib.peakFeaturePath + 'common/res/skins'
      ],
      doClear: false
    };

    if (server.useResponsiveConfigsFromServer()) {
      return new Promise(function (resolve) {
        responsiveOptions.getOptions(server, opts, function (err, config) {
          if (err) {
            process.exitCode = 1;
            throw err;
          }

          opts.coreOutputDir = gutil.env.todir || server.coreOutputDir();
          opts.includePathsPrefix = opts.coreOutputDir + '/';
          opts.includePaths = [
            opts.includePathsPrefix + 'res/feature/responsivepeak/' + opts.version + '/res/skins/',
            opts.includePathsPrefix + 'res/feature/responsivebase/' + opts.version + '/res/skins/',
            opts.includePathsPrefix + 'res/feature/responsivebase/common/res/skins/',
            opts.includePathsPrefix + 'res/feature/responsivepeak/common/res/skins/',
            'res/skins'
          ];
          setOptionsFromConfig(config, opts);
        });

        resolve(opts);
      });
    } else {
      return Promise.resolve(opts);
    }
  }

  function compile(delCoreOutputDir, lr) {
    return options().then(function (opts) {
      opts.lr = lr;
      opts.coreOutputDir = gutil.env.todir || server.coreOutputDir();

      if (server.useResponsiveConfigsFromServer()) {
        var coreOutputDirExists = fs().existsSync(opts.coreOutputDir);

        if (coreOutputDirExists && gutil.env.force && delCoreOutputDir) {
          del().sync(opts.coreOutputDir, { force: true });
          coreOutputDirExists = false;
        }

        if (!coreOutputDirExists) {
          return new Promise(function (resolve) {
            pluginExport.exportCorePlugin(server, opts, undefined, function () {
              doCompile(opts).then(function () {
                resolve();
              });
            });
          });
        } else {
          return doCompile(opts);
        }
      } else {
        return doCompile(opts);
      }
    });
  }

  return {
    FILES_PATTERN: SKIN_FILES_PATTERN,
    compile: compile,
    doCompile: doCompile,
    createVarsTemplate: createVarsTemplate,
    createNewSkin: createNewSkin,
    options: options,
    setOptionsFromConfig: setOptionsFromConfig
  };
};
