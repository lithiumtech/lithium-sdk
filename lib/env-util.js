/**
 * Helper methods to process module.conf.json, process dependencies,
 * and build the structure for all repos to be used.
 * liUtils should be created once and passed to other modules from includes.js
 *
 * @author Nikhil Modak
 */

'use strict';

var gutil = require('gulp-util');
var path = require('path');
var through = require('through2').obj;
var sdkConf = require(path.join(process.cwd(), 'sdk.conf.json'));
var is = require('is_js');

var BOWER_COMPONENTS_PATH = 'bower_components';

function getSourcePath(f) {
  return path.join(BOWER_COMPONENTS_PATH, f);
}

function getSourcePaths(arr) {
  if (!is.array(arr)) {
    return [];
  } else {
    return arr.map(function (f) {
      return getSourcePath(f);
    });
  }
}

gutil.env.filterFiles = function (filePaths) {
  if (filePaths) {
    return through(function (file, enc, cb) {
      if (filePaths.indexOf(file.path) > -1) {
        gutil.log('Updated: ',
          gutil.colors.magenta(
            file.path.substr(process.cwd().length + 1)));
        this.push(file);
      }
      cb();
    });
  } else {
    return gutil.noop();
  }
};


module.exports = function () {
  if (is.object(sdkConf.ng) && is.not.empty(sdkConf.ng)) {
    gutil.env.ng = {
      module: sdkConf.ng.module || 'li',
      textProperties: getSourcePaths(sdkConf.ng.addTextProperties || [])
        .concat(['src/directives', 'src/services']),
      moduleDependencyMap: sdkConf.ng.moduleDependencies || {},
      moduleDependencies: getSourcePaths(
        (function () {
          var deps = [];
          Object.keys(sdkConf.ng.moduleDependencies || {}).forEach(function (key) {
            if ((sdkConf.ng.moduleDependencies[key].dev === undefined && sdkConf.ng.moduleDependencies[key].min === undefined)) {
              //sdk.conf.json is of old format. Return all the dependencies.
              sdkConf.ng.moduleDependencies[key].forEach(function (dep) {
                if (deps.indexOf(dep) === -1) {
                  deps.push(dep);
                }
              });
            } else {
              // We need to pick and choose dependencies from dev which do not have minified js files.
              sdkConf.ng.moduleDependencies[key].dev.forEach(function (dep) {
                if (deps.indexOf(dep) === -1) {
                  deps.push(dep);
                }
              });
              sdkConf.ng.moduleDependencies[key].min.forEach(function (dep) {
                if (deps.indexOf(dep) === -1) {
                  deps.push(dep);
                }
              });
            }
          });
          return deps;
        })()
      ),
      gitReposForVersion: getSourcePaths(sdkConf.ng.gitReposForVersion || [])
    };
  } else {
    gutil.env.ng = false;
  }
  gutil.env.gitStatusVersion = sdkConf.gitStatusVersion || false;
  gutil.env.serverConfig = sdkConf.serverConfig;
  gutil.env.bowerComponentsPath = BOWER_COMPONENTS_PATH;
  gutil.env.watchResIgnore = sdkConf.watchResIgnore || [];
  gutil.env.verifyPlugin = sdkConf.hasOwnProperty('verifyPlugin') ? sdkConf.verifyPlugin : true;

  return gutil;
};
