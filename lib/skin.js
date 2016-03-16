/**
 * Skin Object
 *
 * @author Doug Schroeder
 */

'use strict';

var fs = require('fs');
var path = require('path');

module.exports = function () {

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

  function createSkin(skinId, baseResponsiveSkins) {
    var skinDir = path.resolve('res/skins', skinId);
    return new Skin(skinId, skinDir, baseResponsiveSkins);
  }

  var coreResponsiveSkinIds = ['responsive_peak'];

  function getCoreResponsiveSkinIds() {
    return coreResponsiveSkinIds;
  }

  function getLocalResponsiveSkins() {
    return fs.readdirSync('res/skins').filter(function(file) {
      var skinDir = path.resolve('res/skins', file);
      return fs.statSync(skinDir).isDirectory();
    }).map(function(dir) {
      var skinDir = path.resolve('res/skins', dir);
      return createSkin(path.basename(skinDir), getCoreResponsiveSkinIds());
    }).filter(function(skin) {
      return skin.isResponsive();
    });
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

  function Skin(id, dir, baseResponsiveSkins) {
    checkString("id", id);
    checkString("dir", dir);
    checkArray("baseResponsiveSkins", baseResponsiveSkins);
    var id = id;
    var dir = dir;
    var baseResponsiveSkins = baseResponsiveSkins;
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
      var lineItem = line.split('=');
      if (lineItem.length == 2) {
        var key = lineItem[0].trim();
        var val = lineItem[1].trim();
        skinProperties[key] = val;
      }
    };

    var getSkinProperties = function(skin) {
      if (isEmpty(skinProperties)) {
        if (skin.isLocal()) {
          var filePath = path.resolve(skin.getDir(), 'skin.properties');
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
          var skinDir = path.resolve('res/skins', parentId);
          parent = new Skin(parentId, skinDir, baseResponsiveSkins);
        }
      }

      return parent;
    };

    this.getResponsiveCoreId = function() {
      if (baseResponsiveSkins.indexOf(this.getId()) > -1) {
        return this.getId();
      }

      var parent = this.getParent();
      if (parent) {
        if (baseResponsiveSkins.indexOf(parent.getId()) > -1) {
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
        var responsiveSkin = baseResponsiveSkins.indexOf(skinId) > -1;
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
    }
  };
}