'use strict';

const dependencyTree = require('dependency-tree');
const fs = require('fs-extra');
const path = require('path');

class ComponentDependencies {
  constructor(srcPath, destPath, resolvedComponentPathBase) {
    this.srcPath = srcPath;
    this.destPath = destPath;
    this.packageName = resolvedComponentPathBase;
  }

  walk(currentDirPath, componentsRootDir, depsMap) {
    fs.readdirSync(currentDirPath).map(f => path.join(currentDirPath, f)).forEach(filePath => {
      const stat = fs.statSync(filePath);
      if (stat.isFile() && path.parse(filePath).ext === '.jsx') {
        depsMap = this.captureDeps(filePath, depsMap, componentsRootDir);
      } else if (stat.isDirectory()) {
        return this.walk(filePath, componentsRootDir, depsMap);
      }
    });

    return depsMap;
  }

  captureDeps(filepath, resultsObj, componentsRootDir) {
    const tree = dependencyTree({
      filename: filepath,
      directory: process.cwd(),
      filter: p => p.indexOf(componentsRootDir) === 0
    });

    return Object.assign(resultsObj, this.deepObjKeyTransform(tree, componentsRootDir));
  }

  deepObjKeyTransform(componentTree, componentsRootDir, deps, topLevelComp) {
    Object.keys(componentTree).forEach(componentPath => {
      let fullComponentName = path.relative(
          path.join(process.cwd(), this.srcPath), componentPath);
      fullComponentName = this.packageName + fullComponentName.substr(0, fullComponentName.lastIndexOf('/'));

      if (!deps) {
        deps = {
          [fullComponentName]: []
        };
        topLevelComp = fullComponentName;
      } else {
        deps[topLevelComp].push(fullComponentName);
      }

      this.deepObjKeyTransform(componentTree[componentPath],
          componentsRootDir, deps, topLevelComp);

    });
    return deps;
  }

  createDepFile() {
    const fullSrcPath = path.resolve(this.srcPath);
    const deps = this.walk(fullSrcPath, fullSrcPath, {});

    function handleError(err, reject) {
      if (err) {
        console.log(err);
        reject(err);
      }
    }

    return new Promise((resolve, reject) => {
      return fs.ensureFile(this.destPath, (err) => {
        handleError(err, reject);
        return fs.writeFile(this.destPath, JSON.stringify(deps, null, 2), (err) => {
          handleError(err, reject);
          console.log(`Component dependencies have been written to file: ${this.destPath}`);
          resolve();
        });
      });
    });
  }
}

module.exports = ComponentDependencies;
