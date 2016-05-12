/**
 * Library methods for generating stubs
 *
 * @author jaker
 */

'use strict';

var changeCase = require('change-case');
var fs = require('fs-extra');
var inquirer = require('inquirer');
var path = require('path');
var rename = require('gulp-rename');
var template = require('gulp-template');
var through = require('through2').obj;

module.exports = function (gulp, gutil) {
  var server;

  function getServer() {
    return server ? server : server = require('./server.js')(gulp, gutil);
  }

  function scaffold(type, subModule, name, createNewSubModule, cb) {

    var componentPath = type + 's/' + subModule + '/' + name;

    var ops = {
      name: name,
      type: type,
      subModule: subModule,
      camel: changeCase.camel(name)
    };

    if (createNewSubModule) {
      fs.mkdirSync('src/' + type + 's/' + subModule);
    }

    // certain types need special variables
    switch (type) {
      case 'directive':
        ops.directiveName = 'li' + changeCase.pascalCase(subModule) + changeCase.pascalCase(name);
        ops.markup = 'li:' + [subModule, name].join('-');
        ops.cssClass = ['lia', subModule, name].join('-');
        break;
      case 'service':
        ops.serviceName = '$li' + changeCase.pascalCase(name);
        break;
      case 'filter':
        break;
    }

    console.log(gutil.colors.cyan('Creating scaffold for ' + name + ' ' + type));

    gulp.src(path.join(__dirname, '../templates/' + type + '/**/*'))
        .pipe(template(ops))
        .pipe(rename(function (componentPath) {
          componentPath.basename = componentPath.basename.replace('_' + type + '_', ops.name);
        }))
        .pipe(gulp.dest('src/' + componentPath))
        .pipe(through(
            function (file, en, callback) {
              this.push(file);
              callback();
            },
            function (callback) {
              callback(); // to end stream
              cb(); // passed callback
            }
        ));

    console.log(gutil.colors.green('All done. Happy hacking!'));
    console.log(gutil.colors.green(name + ' ---> src/' + componentPath));
  }

  function cloneFiles(destFilePath, files) {
    return gulp.src(files)
        .pipe(gulp.dest(destFilePath))
        .on('end', function () {
          console.log(gutil.colors.green('Finished! Start customizing your files here: ' + destFilePath));
        });
  }

  function createBootstrapBaseChild(skinDestPath, skinName) {
    return gulp.src(path.join(__dirname, '../templates/bootstrapBaseChildSkin/**/*'))
        .pipe(template({ skinName: skinName }))
        .pipe(gulp.dest(skinDestPath + skinName))
        .on('end', function () {
          console.log(gutil.colors.green('Finished! Start customizing ' + skinName + ' here: ' +
              skinDestPath + skinName));
        });
  }



  /*
   * base and peak merge functions
   *
   * these functions make many assumptions that the skins being merged are base
   * and peak. ideally these are used only until the merge is completed for a
   * release then can be removed
   *
   */
  function getSkinPath(feature, version, skin) {
    return 'res/feature/' + feature + '/' + version + '/res/skins/' + skin;
  }

  function dedupeVariables(opts) {
    var destPath = getSkinPath(opts.destFeature, opts.version, opts.destSkin);
    var baseVars = destPath + '/sass/codebook/_variables-base.scss';
    var peakVars = destPath + '/sass/codebook/_variables-peak.scss';

    try {
      var peak = ('' + fs.readFileSync(peakVars)).split('\n');
      var peakKeys = [];
      var base = ('' + fs.readFileSync(baseVars)).split('\n');
      var baseFile = '\n\n';
      var i;
      var line;

      for (i = 0; i < peak.length; i++) {
        line = peak[i];
        if (line.indexOf('$') === 0 && line.indexOf(':') > 0) {
          peakKeys.push(line.substring(0, line.indexOf(':')));
        }
      }

      for (i = 0; i < base.length; i++) {
        line = base[i];
        if (line.indexOf('$') === 0 && line.indexOf(':') > 0) {
          let key = line.substring(0, line.indexOf(':'));

          if (peakKeys.indexOf(key) >= 0) {
            continue;
          }
        }
        baseFile += line + '\n';
      }

      fs.appendFileSync(peakVars, baseFile);

    } catch(e) {
      console.error(e);
    }
  }

  function fixSkinProperties(opts) {
    var destPath = getSkinPath(opts.destFeature, opts.version, opts.destSkin);
    var sprops = destPath + '/skin.properties';

    try {
      var spropsLines = ('' + fs.readFileSync(sprops)).split('\n');
      var spropsFile = '';
      var titleSeen = false;
      var titleLine = '';

      for (let line of spropsLines) {
        // don't keep parent line
        if (line.startsWith('parent')) {
          continue;
        }

        // don't keep the first title
        if (line.startsWith('title')) {
          if (!titleSeen) {
            titleSeen = true;
            continue;
          } else {
            titleLine = line;
            continue;
          }
        }

        spropsFile += line + '\n';
      }
      spropsFile = titleLine + '\n\n' + spropsFile;

      fs.writeFileSync(sprops, spropsFile);

    } catch(e) {
      console.error(e);
    }
  }

  function fixSkinScss(opts) {
    var destPath = getSkinPath(opts.destFeature, opts.version, opts.destSkin);
    try {
      var skinScssLines = ('' + fs.readFileSync(destPath + '/sass/skin.scss')).split('\n');
      var skinScssFile = '';

      for (let line of skinScssLines) {
        // don't keep parent line
        if (line.indexOf('variables-base') > -1) {
          continue;
        }

        skinScssFile += line.replace(opts.baseSkin, opts.destSkin).replace(opts.peakSkin, opts.destSkin) + '\n';
      }

      fs.writeFileSync(destPath + '/sass/skin.scss', skinScssFile);

    } catch(e) {
      console.error(e);
    }

  }

  function mergeBaseAndPeak(cb) {
    var server = getServer();
    var opts = {
      baseFeature: 'responsivebase',
      baseSkin: 'bootstrap_base',
      version: server.localSkinCompileVersion(),
      peakFeature: 'responsivepeak',
      peakSkin: 'responsive_peak',
      destFeature: 'responsivepeak',
      destSkin: 'responsive'
    };
    var basePath = getSkinPath(opts.baseFeature, opts.version, opts.baseSkin);
    var peakPath = getSkinPath(opts.peakFeature, opts.version, opts.peakSkin);
    var destPath = getSkinPath(opts.destFeature, opts.version, opts.destSkin);

    // don't copy most folders from base common, just sass
    var baseVendorPath = getSkinPath(opts.baseFeature, 'common', opts.baseSkin) + '/sass';
    var destVendorPath = getSkinPath(opts.destFeature, 'common', opts.destSkin) + '/sass';

    console.log(gutil.colors.cyan('Cleaning destination vendor folders'));
    fs.removeSync(destVendorPath);
    console.log(gutil.colors.cyan('Copying vendor folders'));
    fs.copySync(baseVendorPath, destVendorPath, { preserveTimestamps: true });

    console.log(gutil.colors.cyan('Cleaning destination skin'));
    fs.removeSync(destPath);
    console.log(gutil.colors.cyan('Copying ' + opts.baseSkin));
    fs.copySync(basePath, destPath, { preserveTimestamps: true, filter: /^((?!skin\.scss).)*$/});
    console.log(gutil.colors.cyan('Copying ' + opts.peakSkin));
    fs.copySync(peakPath, destPath, { preserveTimestamps: true,
      filter: function(src) {
        var destSrc = destPath + '/' + path.relative(peakPath, src);

        try {
          var stat = fs.statSync(destSrc);

          if (stat && stat.isFile()) {
            fs.appendFileSync(destSrc, Buffer.concat([new Buffer('\n\n'), fs.readFileSync(src)]));
            return false;
          }
        } catch(e) {
          return true;
        }
        return true;
      }
    });
    console.log(gutil.colors.cyan('Merge and Deduping variables-base to variables-peak'));
    dedupeVariables(opts);
    console.log(gutil.colors.cyan('Fixing skin.properties'));
    fixSkinProperties(opts);
    console.log(gutil.colors.cyan('Fixing skin.scss'));
    fixSkinScss(opts);
    console.log(gutil.colors.cyan('Finished merging skins'));
    cb();
  }

  return {

    /**
     * Public scaffold method with ugly inquirer prompt.
     * Prompts are nested for validation reasons.
     * Filesystem checks in second validate() use response from first question.
     */
    scaffold: function (cb) {

      var existingType;
      var type;
      var existingSubModule;
      var subModule;
      var _name;
      var createNewSubModule = false;

      var types = ['directive', 'service', 'filter'];

      function getSubModulesForType() {
        return existingType !== undefined ? existingType
            : existingType = fs.readdirSync('src/' + type + 's');
      }

      function getNamesForSubModule() {
        return existingSubModule !== undefined ? existingSubModule
            : existingSubModule = fs.readdirSync('src/' + type + 's/' + subModule);
      }

      inquirer.prompt([
        {
          type: 'list',
          name: 'type',
          message: 'What do you want to generate?',
          default: 'directive',
          choices: types
        }, {
          type: 'list',
          name: 'subModule',
          message: function () {
            return 'What sub-module would you like the ' + type + ' to be a part of?';
          },
          when: function (answers) {
            type = answers.type;
            return answers.type;
          },
          choices: function () {
            var items = [];
            items.push({
              name: '(create new)',
              value: '__new__'
            });

            return items.concat(getSubModulesForType());
          }
        }, {
          type: 'input',
          name: 'newSubModule',
          message: 'New sub-module name?',
          when: function (answers) {
            if (answers.subModule === '__new__') {
              createNewSubModule = true;
              return true;
            }
          },
          validate: function (value) {
            subModule = value;
            if (!value) {
              // empty response
              return 'This is a required field.';
            } else if (value.match(/^[a-z][a-z0-9\-]*$/) == null) {
              // name must match the above regex
              return 'Name must contain only lowercase alpha, numerals, and dashes.';
            } else if (getSubModulesForType().indexOf(value) >= 0) {
              // check existing components
              return 'A sub-module with that name already exists';
            } else if (getSubModulesForType().indexOf(value) === -1) {
              return true;
            }
          }
        }, {
          type: 'input',
          name: 'name',
          message: function () {
            return 'What would you like to call the ' + type + '?';
          },
          when: function (answers) {
            subModule = answers.newSubModule || answers.subModule;
            return subModule;
          },
          validate: function (value) {
            _name = value;
            if (!value) {
              // empty response
              return 'This is a required field.';
            } else if (value.match(/^[a-z][a-z0-9\-]*$/) == null) {
              // name must match the above regex
              return 'Name must contain only lowercase alpha, numerals, and dashes.';
            } else if (!createNewSubModule && getNamesForSubModule().indexOf(value) >= 0) {
              // check existing names
              return 'A ' + type + ' with that name already exists';
            } else if (createNewSubModule || getNamesForSubModule().indexOf(value) === -1) {
              return true;
            }
          }
        }
      ], function () {
        // Finally
        scaffold(type, subModule, _name, createNewSubModule, cb);
      });
    },

    /**
     * Might want to move this to github in the future. For now use bower_components.
     */
    clone: function (cb) {

      var fileBase = 'bower_components/angular-li/src/';
      var clonePath = gutil.env.path;

      fs.readdir(fileBase + clonePath, function (err, files) {

        if (err) {
          console.log(gutil.colors.red('Path doesn\'t exist: ' + err.path));
          process.exit(1);
        }

        inquirer.prompt([
          {
            type: 'checkbox',
            name: 'files',
            message: 'Which files would you like to customize?',
            choices: files
          }
        ], function (answers) {

          var files = answers.files.map(function (file) {
            return fileBase + clonePath + '/' + file;
          });

          cloneFiles('src/' + clonePath, files, cb);
        });

      });

    },

    /**
     * Might want to move this to github in the future. For now use bower_components.
     */
    bootstrapBaseChild: function (cb) {
      inquirer.prompt([
        {
          type: 'input',
          name: 'skinName',
          message: 'What would you like to call your new skin?',
          validate: function (value) {
            if (!value) {
              // empty response
              return 'This is a required field.';
            } else if (value.match(/^[a-zA-Z0-9\_]*$/) == null) {
              // name must match the above regex
              return 'Name must contain only alphabetic characters, numerals, and underscores.';
            } else {
              return true;
            }
          }
        }
      ], function (answers) {
        createBootstrapBaseChild('res/skins/', answers.skinName, cb);
      });
    },
    mergeBaseAndPeak: mergeBaseAndPeak
  };
};
