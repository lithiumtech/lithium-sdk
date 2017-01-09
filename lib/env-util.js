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
var lodash = require('lodash');

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
            var moduleDeps = sdkConf.ng.moduleDependencies[key];
            if (Array.isArray(moduleDeps)) {
              deps = deps.concat(moduleDeps);
            }
            if ('dev' in moduleDeps && Array.isArray(moduleDeps.dev)) {
              deps = deps.concat(moduleDeps.dev);
            }
            if ('min' in moduleDeps && Array.isArray(moduleDeps.min)) {
              deps = deps.concat(moduleDeps.min);
            }
            deps = lodash.uniq(deps);
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
