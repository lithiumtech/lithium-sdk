/**
 * Skin Object
 *
 * @author Doug Schroeder
 */

'use strict';

var fs = require('fs');
var path = require('path');
var serverLib = require('./server.js');
var putils = require('./plugin-utils');

module.exports = function (gulp, gutil) {
  var server, localSkins, localResponsiveSkins, otherCommunitySkins;
  var skinPropertyCopySass = "copy_sass_files_to_child";
  var baseFeaturePath = 'res/feature/responsivebase/';
  var peakFeaturePath = 'res/feature/responsivepeak/';
  var skinsBaseDir = "res/skins";
  var communityPluginsDir = "other";
  var propFileName = "skin.properties";

  function isEmpty(obj) {
    return Object.keys(obj).length === 0;
  }

  function checkString(valName, val) {
    if (!(typeof val === 'string' || val instanceof String)) {
      throw Error(valName + ' must be a string!');
    }
  }

  function checkArray(valName, val) {
    if (!(Array.isArray(val))) {
      throw Error(valName + ' must be an array!');
    }
  }

  function createSkin(skinId, skinDir) {
    return new Skin(skinId, skinDir);
  }

  var coreResponsiveSkinIds = ['responsive_peak', 'responsive_base'];
  //Subset of legacy core skins -- This list is fetched from studio's subset of skins exposed from skin editor.
  var coreSkinIds = ["base", "whiteui", "proui", "pacificaui", "newsui", "naturalbridgesui", "mondrian", "lightui",
                    "castlerockui", "anonuevoui" ];

  function getCoreResponsiveSkinIds() {
    return coreResponsiveSkinIds;
  }

  /**
   * List of all core skins that are not responsive
   */
  function getCoreSkinIds() {
    return coreSkinIds;
  }

  /**
   * All SDK skins that are not responsive
   */
  function getLocalSkins() {
    return localSkins ? localSkins : localSkins = fs.readdirSync(skinsBaseDir).filter(function(file) {
      var skinDir = path.resolve(skinsBaseDir, file);
      return fs.statSync(skinDir).isDirectory();
    }).map(function(skinId) {
      var skinDir = path.resolve(skinsBaseDir, skinId);
      return createSkin(path.basename(skinDir), skinDir);
    }).filter(function(skin) {
      return !skin.isResponsive();
    });
  }

  /**
   * All SDK local skins that are responsive
   */
  function getLocalResponsiveSkins() {
    return localResponsiveSkins ? localResponsiveSkins : localResponsiveSkins = fs.readdirSync(skinsBaseDir).filter(function(file) {
      var skinDir = path.resolve(skinsBaseDir, file);
      return fs.statSync(skinDir).isDirectory();
    }).map(function(skinId) {
      var skinDir = path.resolve(skinsBaseDir, skinId);
      return createSkin(path.basename(skinDir), skinDir);
    }).filter(function(skin) {
      return skin.isResponsive();
    });
  }

  /**
   * Looks recursively under core plugins to fetch feature version for given feature. If not found, returns default
   */
  function getResponsiveFeatureVersionFromCore(featurePath, defaultPath) {
    var server = getServer();
    var coreFeaturePath = path.resolve(server.coreOutputDir(), featurePath);
    if (!fs.existsSync(coreFeaturePath)) {
      putils.logWarning(gutil, "No directory found under coreplugins for "+featurePath + ". Returning default");
      return defaultPath;
    }
    var featureVersion = fs.readdirSync(coreFeaturePath).filter(function(dir) {
      return path.basename(dir).match(/v\S+-lia\S+/);
    }).map(function(dir) {
      return path.basename(dir);
    });
    if (featureVersion === undefined || featureVersion.length == 0) {
      putils.logWarning(gutil, "No feature version found under coreplugins for "+featurePath + ". Returning default");
      return defaultPath;
    }
    return featureVersion[0];
  }

  /**
   * This function returns skins from other plugins in community. This is found in coreplugins directory under other.
   */
  function getOtherCommunitySkins() {
    if (otherCommunitySkins) {
      return otherCommunitySkins;
    }
    var skinBasePath = path.resolve(getServer().coreOutputDir(), communityPluginsDir, skinsBaseDir);
    if (!fs.existsSync(skinBasePath)) {
      //No other community plugins found
      return [];
    }
    otherCommunitySkins = fs.readdirSync(skinBasePath).filter(function(file) {
      var skinDir = path.resolve(skinBasePath, file);
      return fs.statSync(skinDir).isDirectory();
    }).map(function(skinId) {
      var skinDir = path.resolve(skinBasePath, skinId);
      return createSkin(path.basename(skinDir), skinDir);
    });
    return otherCommunitySkins;
  }

  function isFile(path) {
    try {
      return fs.statSync(path).isFile();
    } catch (err) {
      return false;
    }
  }

  function isDirectory(path) {
    try {
      return fs.statSync(path).isDirectory();
    } catch (err) {
      return false;
    }
  }

  function getServer() {
    return server ? server : server = require('./server.js')(gulp, gutil);
  }

  /**
   * This function looks up a skinId on the file system, including skinIds that are core and responsive.
   */
  function findBaseDirForSkin(skinId) {
    //Is the skin local skin?
    var localSkinIds = fs.readdirSync(skinsBaseDir).filter(function(file) {
      var skinDir = path.resolve(skinsBaseDir, file);
      return fs.statSync(skinDir).isDirectory();
    });
    if (localSkinIds.indexOf(skinId) > -1) {
      return path.resolve(skinsBaseDir, skinId);
    }

    //Fetch base directories for core responsive skins
    var server = getServer();
    if (getCoreResponsiveSkinIds().indexOf(skinId) > -1) {

      if (skinId.indexOf("responsive_peak") > -1) {
        return path.resolve(server.coreOutputDir(), peakFeaturePath, getResponsiveFeatureVersionFromCore(peakFeaturePath, server.localSkinCompileVersion()),
            skinsBaseDir, skinId);
      } else if (skinId.indexOf("responsive_base") > -1) {
        return path.resolve(server.coreOutputDir(), baseFeaturePath, getResponsiveFeatureVersionFromCore(baseFeaturePath, server.localSkinCompileVersion()),
            skinsBaseDir, "bootstrap_base");
      } else {
        throw new Error("Invalid parent core responsive skin=" + skinId);
      }
    }

    //Fetch base directories for core legacy skins
    if (getCoreSkinIds().indexOf(skinId) > -1) {
      return path.resolve(server.coreOutputDir(), skinsBaseDir, skinId);
    }

    //Check if this is a community skin from other plugins
    var likelyPath = path.resolve(server.coreOutputDir(), communityPluginsDir, skinsBaseDir, skinId);
    if (fs.statSync(likelyPath).isDirectory()) {
      return likelyPath;
    }
    //Should we error here? or just create a skin with unknown skinId
    throw new Error("Invalid skin=" + skinId);
  }

  function Skin(id, dir) {
    checkString("id", id);
    checkString("dir", dir);
    var id = id;
    var dir = dir;
    var skinProperties = {};
    var parent = null;
    var attribs = {};

    var getAttrib = function(key, fPopulator) {
      if (typeof attribs[key] == 'undefined') {
        attribs[key] = fPopulator(key);
      }
      return attribs[key]
    };

    var addSkinProp = function(line) {

      //Look up skin property values in file
      if (line.indexOf('+=') > -1 ) {
        //Property is an array
        var lineItem = line.split('+=');
        if (lineItem.length != 2) {
          return;
        }
        //Allow multi values to be property arrays
        var key = lineItem[0].trim();
        var val = lineItem[1].trim();
        if (key in skinProperties) {
            var origVal = skinProperties[key];
            if (!(origVal instanceof Array)) {
              skinProperties[key] = [];
              skinProperties[key].push(origVal);
            }
        } else {
          skinProperties[key] = [];
        }
        skinProperties[key].push(val);
      } else {
        //Property is a simple string
        var lineItem = line.split('=');
        if (lineItem.length != 2) {
          return;
        }
        var key = lineItem[0].trim();
        var val = lineItem[1].trim();
        skinProperties[key] = val;
      }
    };

    var getSkinProperties = function(skin) {
      if (isEmpty(skinProperties)) {
        if (skin.isLocal()) {
          var filePath = path.resolve(skin.getDir(), propFileName);
          if (isFile(filePath)) {
            var fileVal = fs.readFileSync(filePath).toString();
            var fileValByLines = fileVal.split('\n');
            if (fileValByLines.length > 0) {
              fileValByLines.forEach(function (line) {
                addSkinProp(line);
              });
            } else {
              addSkinProp(line);
            }
          }
        } else {
          // TODO: add skins api call to get skin properties
        }
        if (isEmpty(skinProperties)) {
          skinProperties['empty'] = true;
        }
      }

      return skinProperties;
    };

    this.getId = function() {
      return id;
    }

    this.getDir = function () {
      return dir;
    };

    this.lookupProperty = function (key) {
      return getSkinProperties(this)[key];
    };

    this.getParentId = function () {
      return this.lookupProperty('parent');
    };

    this.getParent = function () {
      if (!parent) {
        var parentId = this.getParentId();
        if (parentId) {
          parent = new Skin(parentId, findBaseDirForSkin(parentId));
        }
      }
      return parent;
    };

    this.getResponsiveCoreId = function() {
      var responsiveBaseSkins = getCoreResponsiveSkinIds();
      if (responsiveBaseSkins.indexOf(this.getId()) > -1) {
        return this.getId();
      }

      var parent = this.getParent();
      if (parent) {
        if (responsiveBaseSkins.indexOf(parent.getId()) > -1) {
          return parent.getId();
        } else {
          return parent.getResponsiveCoreId();
        }
      }

      return null;
    }

    this.isLocal = function () {
      var skin = this;
      return getAttrib('local', function () {
        return isDirectory(skin.getDir());
      });
    };

    this.isResponsive = function () {
      var skin = this;
      return getAttrib('responsive', function () {
        var skinId = skin.getId();
        var responsiveSkin = getCoreResponsiveSkinIds().indexOf(skinId) > -1;
        if (!responsiveSkin) {
          var parent = skin.getParent();
          if (parent != null) {
            responsiveSkin = parent.isResponsive();
          }
        }

        return responsiveSkin;
      });
    };
  }

  var responsiveSkins = [];
  var responsiveSkinByIdMap = {};

  return {
    Skin: Skin,
    getResponsiveSkins: function() {
      if (isEmpty(responsiveSkins)) {
        responsiveSkins.push.apply(responsiveSkins, getLocalResponsiveSkins());

        responsiveSkins.forEach(function(skin) {
          responsiveSkinByIdMap[skin.getId()] = skin;
        });
      }

      return responsiveSkins;
    },
    getResponsiveSkinIds: function() {
      return this.getResponsiveSkins().filter(function() {
        return true;
      }).map(function(skin) {
        return skin.getId();
      });
    },
    lookupResponsiveSkin: function(skinId) {
      // in case it's not cached yet
      this.getResponsiveSkinIds();

      return responsiveSkinByIdMap[skinId];
    },
    getCoreSkinIds: getCoreSkinIds,
    getCoreResponsiveSkinIds: getCoreResponsiveSkinIds,
    getLocalSkins: getLocalSkins,
    getOtherCommunitySkins: getOtherCommunitySkins,
    peakFeaturePath : peakFeaturePath,
    baseFeaturePath: baseFeaturePath,
    skinPropertyCopySass: skinPropertyCopySass,
    skinsBaseDir : skinsBaseDir,
    findBaseDirForSkin: findBaseDirForSkin,
    sassDir : "sass",
    componentsDir : "components",
    skinSubFolder : ["desktop", "mobile"],
    skinPropertiesFileName: propFileName,
    cssDir: "css"
  };
}