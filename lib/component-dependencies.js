'use strict';

const dependencyTree = require('dependency-tree');
const fs = require('fs-extra');
const path = require('path');

const COMPONENT_DEPS_SRC_PATH = 'src/react-li/src/components';
const COMPONENT_DEPS_DEST_PATH = 'plugin/res/features/component-dependencies.json';

function walk(currentDirPath, componentsRootDir, depsMap) {
  fs.readdirSync(currentDirPath).map(f => path.join(currentDirPath, f)).forEach(filePath => {
    const stat = fs.statSync(filePath);
  if (stat.isFile() && path.parse(filePath).ext === '.jsx') {
    depsMap = captureDeps(filePath, depsMap, componentsRootDir);
  } else if (stat.isDirectory()) {
    return walk(filePath, componentsRootDir, depsMap);
  }
});

  return depsMap;
}

function captureDeps(filepath, resultsObj, componentsRootDir) {
  const tree = dependencyTree({
      filename: filepath,
      directory: process.cwd(),
      filter: p => p.indexOf(componentsRootDir) === 0
  });

  return Object.assign(resultsObj, deepObjKeyTransform(tree, componentsRootDir));
}

function deepObjKeyTransform(componentTree, componentsRootDir, deps, topLevelComp) {
  Object.keys(componentTree).forEach(componentPath => {
    let fullComponentName = path.relative(process.cwd() + '/src', componentPath);
    fullComponentName = fullComponentName.substr(0, fullComponentName.lastIndexOf('/'));

    if (!deps) {
      deps = {
        [fullComponentName]: []
      };
      topLevelComp = fullComponentName;
    } else {
      deps[topLevelComp].push(fullComponentName);
    }

    deepObjKeyTransform(componentTree[componentPath], componentsRootDir, deps, topLevelComp);

  });
  return deps;
}


function createDepFile(src, dest, cb) {
  const fullSrcPath = path.resolve(src);
  const deps = walk(fullSrcPath, fullSrcPath, {});

  fs.ensureFile(dest, (err) => {
    if (err) {
      throw err;
    }
    fs.writeFile(dest, JSON.stringify(deps, null, 2), (err) => {
      if (err) {
        throw err;
      }
      console.log(`Component dependencies have been written to file: ${dest}`);
      cb();
    });
  });
}

module.exports = { COMPONENT_DEPS_SRC_PATH, COMPONENT_DEPS_DEST_PATH, createDepFile };

