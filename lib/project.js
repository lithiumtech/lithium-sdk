/**
 * Library methods for generating stubs
 *
 * @author jaker
 */

'use strict';

var expect = require('gulp-expect-file');
var extend = require('gulp-extend');
var fs = require('fs');
var http = require('http');
var merge = require('merge-stream');
var path = require('path');
var rename = require('gulp-rename');
var spawnSeries = require('spawn-series');
var template = require('gulp-template');
var inquirer = require('inquirer');
var through = require('through2').obj;
var prettyTime = require('pretty-hrtime');
var is = require('is_js');
var gulpif = require('gulp-if');

module.exports = function (gulp, gutil) {

  function logFile() {
    function decorate(color, text) {
      return text ? '[' + gutil.colors[color](text) + ']' : '';
    }

    var stream = through(function (file, enc, callback) {
      var items = [];

      items.push(gutil.colors.cyan(file.path));

      if (file.isDirectory()) {
        items.push(decorate('magenta', 'DIR'));
      } else if (file.isNull()) {
        items.push(decorate('magenta', 'EMPTY'));
      }

      gutil.log(items.join(' '));

      this.push(file);
      return callback();
    });
    stream.resume();
    return stream;
  }

  function validate(value, regex, allowEmpty) {
    if (value === '') {
      if (allowEmpty) {
        return true;
      } else {
        return 'Please provide a valid value';
      }
    }
    var cases = value.match(regex);

    if (cases === null) {
      return 'Invalid value, please try again.';
    } else {
      return true;
    }
  }

  function npmLinkAndInstall(cwd, callback) {
    /**
      * Attempt to npm link global packages.
      * This may fail because of permissions, if it fails packages
      * will be installed locally using npm install
      */
    spawnSeries(
      [
        {
          command: 'npm',
          args: ['link', require('../package.json').name],
          options: {
            cwd: cwd,
            ignoreError: true,
            stdio: 'inherit'
          }
        },
        {
          command: 'npm',
          args: ['link', 'gulp'],
          options: {
            cwd: cwd,
            ignoreError: true,
            stdio: 'inherit'
          }
        },
        {
          command: 'npm',
          args: ['install'],
          options: {
            cwd: cwd,
            stdio: 'inherit'
          }
        }
      ],
      callback,
      function (child, i, cmdObj) {
        gutil.log(gutil.colors.blue('Starting: ' + cmdObj.command + ' ' + cmdObj.args.join(' ')));
        child.on('close', function (code) {
          if (code === 0) {
            gutil.log(gutil.colors.blue('Finished: ' + cmdObj.command + ' ' + cmdObj.args.join(' ')));
          } else if (cmdObj.options.ignoreError) {
            gutil.log(gutil.colors.red('Failed: ' + cmdObj.command + ' ' + cmdObj.args.join(' ')));
            gutil.log(gutil.colors.blue('Ignoring error and continuing (Package will be installed in npm install) ..'));
          }
        });
      }
    );
  }

  function parseVersionPage(page) {
    var start = page.lastIndexOf('<body>');
    var end = page.lastIndexOf('</body>');
    var body = page.substring(start + 6, end);
    var versionArr = body.split(' ');
    var revision;

    if (versionArr.length > 2) {
      revision = versionArr[2].replace(')', '');
    }

    return {
      version: versionArr[0],
      branch: versionArr[1].replace('(', ''),
      revision: revision
    };
  }

  function bowerInstall(cwd, callback) {
    spawnSeries(
        [
          {
            command: 'bower',
            args: ['install'],
            options: {
              cwd: cwd,
              stdio: 'inherit'
            }
          }
        ],
        callback,
        function (child, i, cmdObj) {
          gutil.log(gutil.colors.blue('Starting: ' + cmdObj.command + ' ' + cmdObj.args.join(' ')));
          child.on('close', function () {
            gutil.log(gutil.colors.blue('Finished: ' + cmdObj.command + ' ' + cmdObj.args.join(' ')));
          });
        }
    );
  }

    var templateConstraint = function(file) {
        return path.basename(file.path) !== 'README.md';
    };

  return {

    scaffold: function () {
      var ops = {
        serverConf: {}
      };

      inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'What is your repository name?\nOnly lower case characters, numbers or hyphens (-) are allowed.',
          validate: function (val) {
            return validate(val, /^[a-z0-9\-]+$/);
          }
        },
        {
          type: 'confirm',
          name: 'continue',
          message: 'Do you want to continue?',
          when: function (repo) {
            if (fs.existsSync(path.join('.', repo.name))) {
              console.log(gutil.colors.red(gutil.colors.bold(repo.name) + ' already exists in ' + process.cwd() + '.' +
                '\nTo update the project please "li update" from root directory of the project.' +
                '\nTo recreate the project please delete the existing project and then re-run "li create"'));
              process.exit(1);
              return true;
            } else {
              return false;
            }
          },
          default: true
        },
        {
          type: 'input',
          name: 'serverUrl',
          message: function () {
            return 'What is the URL (include port if exists) to the dev/stage site that you will connect to ' +
              '(beginning with "https://")?';
          },
          validate: function (val) {
            return validate(val, /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/);
          }
        },
        {
          type: 'input',
          name: 'pluginToken',
          message: function () {
            return 'Do you have a plugin token (if not press enter)?';
          },
          validate: function (val) {
            return validate(val, /^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/, true);
          },
          default: function () {
            return '';
          }
        }
      ], function (answers) {

        // set up vars for server.conf.json
        ops.serverConf.serverUrl = answers.serverUrl;

        if (answers.pluginToken) {
          ops.serverConf.pluginToken = answers.pluginToken;
        }

        //default studio overrides allowed
        ops.serverConf.allowStudioOverrides = true;

        //default strict mode false
        ops.serverConf.strictMode = false;

        //default dry run mode false
        ops.serverConf.dryRun = false;

        //default verbose false
        ops.serverConf.verbose = false;

        //default force false
        ops.serverConf.force = false;

        //default pluginPoints
        ops.serverConf.pluginPoints = [];

        ops.name = answers.name;
        ops.description = 'lithium-sdk project: ' + answers.name + '\nGenerated by ' + process.env.USER;

        // copy and process templates
        var checkResponseCallback = function() {
          gulp.src(path.join(__dirname, '../templates/project/**/*'))
              .pipe(rename(function (path) {
                if (path.basename.indexOf('_') === 0) {
                  path.basename = path.basename.replace('_', '');
                }
              }))
              .pipe(gulpif(templateConstraint, template(ops)))
              .pipe(rename(function (path) {
                if (path.extname === '.mdt') {
                  path.extname = '.md';
                }
              }))
              .pipe(gulp.dest('./' + answers.name))
              .pipe(logFile())
              .on('end', function () {
                // once templates are finished, create server.conf.json
                fs.writeFile(path.join('.', answers.name, 'server.conf.json'), JSON.stringify(ops.serverConf, null, 2),
                    function (error) {
                      if (error) {
                        throw error;
                      } else {
                        gutil.log(gutil.colors.cyan(path.resolve(path.join('.', answers.name, 'server.conf.json'))));

                        // npm link and install
                        npmLinkAndInstall(path.join('.', answers.name), function (code) {
                          if (code === 0) {
                            gutil.log(gutil.colors.green('Created ' + answers.name));
                          } else {
                            gutil.log(gutil.colors.red('Error while creating ' + answers.name));
                          }
                        });
                      }
                    });

              });
        };
        //Check server version before processing the templates
        require('./version-check.js')(gulp, gutil).validate(answers.serverUrl, answers.pluginToken, checkResponseCallback);
      });
    },

    update: function (cb) {
      var ops = {
        serverConf: {}
      };

      try {
        ops.serverConf = require(path.join(process.cwd(), 'server.conf.json'));
      } catch (err) {
        console.log('Your project  may be corrupt.\nPlease delete try recreating the project using "li create"');
        process.exit(1);
      }

      inquirer.prompt([
        {
          type: 'input',
          name: 'serverUrl',
          message: function () {
            return 'Enter the new URL (include port if exists) to the dev/stage site that you will connect to (beginning with "http") or press enter to use existing';
          },
          validate: function (val) {
            return validate(val, /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/);
          },
          default: function () {
            return ops.serverConf.serverUrl;
          }
        },
        {
          type: 'input',
          name: 'pluginToken',
          message: function () {
            if (ops.serverConf.pluginToken) {
              return 'Enter plugin token to change it or press enter to continue';
            } else {
              return 'Do you have a plugin token (if not press enter)?';
            }
          },
          validate: function (val) {
            return validate(val, /^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/, true);
          },
          default: function () {
            return ops.serverConf.pluginToken || '';
          }
        }
      ], function (answers) {

        // set up vars for server.conf.json
        ops.serverConf.serverUrl = answers.serverUrl;

        if (answers.pluginToken) {
          ops.serverConf.pluginToken = answers.pluginToken;
        }

        answers.name = process.cwd().split(path.normalize('/')).pop();
        ops.name = answers.name;
        ops.description = 'lithium-sdk project: ' + answers.name + '\nGenerated by ' + process.env.USER;

        // copy and process templates
        var checkResponseCallback = function() {
          gulp.src([path.join(__dirname, '../templates/project/**/*'),
            '!' + path.join(__dirname, '../templates/project/sdk.conf.json'),
            '!' + path.join(__dirname, '../templates/project/_.gitignore')])
              .pipe(rename(function (path) {
                if (path.basename.indexOf('_') === 0) {
                  path.basename = path.basename.replace('_', '');
                }
              }))
              .pipe(gulpif(templateConstraint, template(ops)))
              .pipe(rename(function (path) {
                if (path.extname === '.mdt') {
                  path.extname = '.md';
                }
              }))
              .pipe(gulp.dest('.'))
              .pipe(logFile())
              .on('end', function () {
                // once templates are finished, create server.conf.json
                fs.writeFile(path.join('.', 'server.conf.json'), JSON.stringify(ops.serverConf, null, 2),
                    function (error) {
                      if (error) {
                        cb(error);
                      } else {
                        gutil.log(gutil.colors.cyan(path.resolve('./server.conf.json')));

                        // npm link and install
                        npmLinkAndInstall('./', function (code) {
                          if (code === 0) {
                            gutil.log(gutil.colors.green('Project updated!'));
                            cb();
                          } else {
                            gutil.log(gutil.colors.red('Error while updating project.'));
                            cb(error);
                          }
                        });
                      }
                    });
              });
        };
        require('./version-check.js')(gulp, gutil).validate(answers.serverUrl, answers.pluginToken, checkResponseCallback);

        // copy README files
      });
    },

    // before we enable angular, we need to make sure they have a few things
    verify: function () {
      var files = ['sdk.conf.json', 'server.conf.json'];
      return gulp.src(files)
        .pipe(expect({ checkRealFile: true,  errorOnFailure: true }, files))
        .on('end', function () {
          var sdkConf = require(path.join(process.cwd(), 'sdk.conf.json'));
          if (!is.undefined(sdkConf.ng)) {
            gutil.log(gutil.colors.red('Angularjs support is already enabled on this project.'));
            process.exit(1);
          }
        })
        .on('error', function () {
          gutil.log(gutil.colors.red('File check failed.'));
          process.exit(1);
        });
    },

    enableAngular: function (cb) {
      // get version
      var serverUrl = require(path.join(process.cwd(), 'server.conf.json')).serverUrl;
      var statusPath = '/t5/status/versionpage';

      var request = http.get(serverUrl + statusPath);
      var reqCallStarted = setInterval(function () {
        gutil.log(gutil.colors.cyan('Waiting for response from ' + serverUrl + ' ...'));
      }, 3000);

      var reqCallStartTime = process.hrtime();
      gutil.log(gutil.colors.cyan('Starting call to ' + serverUrl + ' ...'));

      request.on('response', function (response) {
        clearInterval(reqCallStarted);

        if (response.statusCode === 200) {
          var serverCallTime = prettyTime(process.hrtime(reqCallStartTime));
          gutil.log(gutil.colors.cyan('Finished call to ' + serverUrl + ' in ' + gutil.colors.magenta(serverCallTime)));

          response.setEncoding('utf8');
          response.on('data', function (chunk) {

            var liaBranch = parseVersionPage(chunk);
            var custName = require(path.join(process.cwd(), 'package.json')).name;

            gutil.log(gutil.colors.cyan('Lia version ' + gutil.colors.magenta(liaBranch.branch)));

            if (liaBranch.branch.indexOf('release') > -1) {
              liaBranch = 'release/' + liaBranch.version;
            } else { // active branch
              liaBranch = 'develop';
            }

            var ops = {
              name: custName,
              branch: liaBranch
            };

            // now that we have template variables, run gulp.src
            merge(
              // merge sdk.conf.json
              gulp.src(['./sdk.conf.json',
                    path.join(__dirname, '../templates/project-ng/sdk.conf.json')])
                .pipe(extend('sdk.conf.json'))
                .pipe(gulp.dest('./'))
                .pipe(logFile()),
              // copy over everything else
              gulp.src([path.join(__dirname, '../templates/project-ng/**/*'),
                        '!' + path.join(__dirname, '../templates/project-ng/sdk.conf.json')])
                .pipe(template(ops))
                .pipe(rename(function (path) {
                  path.basename = path.basename.replace('_', '');
                }))
                .pipe(gulp.dest('./'))
                .pipe(logFile())
            ).on('end', function () {
              bowerInstall('./', function (code) {
                if (code === 0) {
                  gutil.log(gutil.colors.green('Finished! You may now use angular in your sdk environment.'));
                  cb();
                } else {
                  gutil.log(gutil.colors.red('Bower install failed'));
                  cb(new Error('Bower install failed'));
                }
              });
            });
          });
        } else {
          gutil.log(gutil.colors.red('Call to ' + serverUrl + ' failed. Response status code: ' + response.statusCode));
          cb(new Error('Call to lia failed.'));
        }
      });
    }
  };
};
