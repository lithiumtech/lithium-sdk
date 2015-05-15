/**
 * Library methods for generating stubs
 *
 * @author jaker
 */

'use strict';

var changeCase = require('change-case');
var fs = require('fs');
var inquirer = require('inquirer');
var rename = require('gulp-rename');
var template = require('gulp-template');
var through = require('through2').obj;
var urllib = require('urllib');

module.exports = function (gulp, gutil) {

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
        ops.camel = 'li' + changeCase.pascalCase(subModule) + changeCase.pascalCase(name);
        ops.markup = 'li:' + [subModule, name].join('-');
        ops.cssClass = ['li', subModule, name].join('-');
        break;
      case 'service':
        ops.camel = '$li' + changeCase.pascalCase(name);
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
    }
  };
};
