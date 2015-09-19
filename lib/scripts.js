/**
 * Library methods for scripts tasks
 *
 * @author Nikhil Modak
 */

'use strict';

var lazyReq = require('lazy-req')(require);
var merge = lazyReq('merge-stream');
var path = lazyReq('path');
var uglify = lazyReq('gulp-uglify');
var through = lazyReq('through2');
var is = lazyReq('is_js');
var plumber = lazyReq('gulp-plumber');
var ngAnnotate = lazyReq('gulp-ng-annotate');
var stringDecoder = lazyReq('string_decoder');
var gjshint = lazyReq('gulp-jshint');
var jscs = lazyReq('gulp-jscs');
var wrap = lazyReq('gulp-wrap');
var gulpif = lazyReq('gulp-if');

function getPrettyEscapedContent(templateContent) {
  return templateContent
      .replace(/\\/g, '\\\\')
      .replace(/'/g, '\\\'')
      .replace(/\r?\n/g, '\\n\' +\n    \'');
}

var HTML2JS_TEMPLATE = 'angular.module(\'<%= moduleName %>\').run([\'$templateCache\', function($templateCache) {\n' +
    '  $templateCache.put(\'<%= url %>\',\n    \'<%= prettyEscapedContent %>\');\n' +
    '}]);\n';

var JS_MAIN_PATTERN = 'src/**/!(*.demo|*.spec|*.mock).js';
var JS_DEMO_PATTERN = 'src/**/*.demo.js';
var JS_MOCK_PATTERN = 'src/**/*.mock.js';
var JS_SPEC_PATTERN = 'src/**/*.spec.js';
var TPL_MAIN_PATTERN = 'src/**/!(*.demo).tpl.html';
var TPL_DEMO_PATTERN = 'src/directives/**/*.demo.tpl.html';
var BASE = 'src';

module.exports = function (gulp, gutil) {

  var DEPENDENCIES = gutil.env.ng.moduleDependencies;
  var libPatterns = [DEPENDENCIES];
  var templatePatterns = [TPL_MAIN_PATTERN, TPL_DEMO_PATTERN];

  function matchesAngularJs(file) {
    return file.path.indexOf('angular/angular.js') !== -1;
  }

  function process(patterns, dest, files, isWatch, isLint) {
    return merge()(
        patterns.map(function (pattern) {
          isLint = isLint && libPatterns.indexOf(pattern) === -1  && templatePatterns.indexOf(pattern) === -1;

          return gulp.src(pattern)
              .pipe(isLint ? jscs()({ configPath: '.jscsrc' }) : gutil.noop())
              .on('error', function (err) {
                console.log(err.message);
              }) // don't stop on error
              .pipe(isWatch ? plumber()() : gutil.noop())
              .pipe(isLint ? gjshint()('.jshintrc') : gutil.noop())
              .pipe(isLint ? specialChecks() : gutil.noop())
              .pipe(isLint ? gjshint().reporter('jshint-stylish') : gutil.noop())
              .pipe(gutil.env.filterFiles(files))
              .pipe(through().obj(function (file, enc, cb) {
                if (libPatterns.indexOf(pattern) > -1) {
                  file.base = path().join(file.cwd, gutil.env.bowerComponentsPath);
                }
                if (templatePatterns.indexOf(pattern) > -1) {

                  /**
                   * Support tpl.html files outside of directives. If we encounter src/services in the
                   * current file path, set the url and moduleType to modify how we populate the HTML2JS_TEMPLATE
                   * template.
                   */

                  var moduleType, url;
                  if (file.path.match(/.*\/src\/services\/.*/)) {
                    /**
                     * If processing a service, substring at src to include 'service' in the
                     * url to provide uniqueness in the off-chance a service and directive ever happen to share
                     * the same name.
                     */
                    url = file.path.substr(path().join(file.cwd, 'src').length + 1);
                    moduleType = 'services'
                  } else {
                    url = file.path.substr(path().join(file.cwd, 'src', 'directives').length + 1);
                    moduleType = 'directives';
                  }

                  file.contents = new Buffer(gutil.template(HTML2JS_TEMPLATE)({
                    moduleName: (function () {
                      var parts = file.path.split('/');
                      return [
                        gutil.env.ng.module,
                        moduleType,
                        parts[parts.length - 3],
                        parts[parts.length - 2]
                      ].join('.');
                    })(),
                    prettyEscapedContent: getPrettyEscapedContent(String(file.contents)),
                    file: file,
                    url: url
                  }));
                  file.path = gutil.replaceExtension(file.path, '.js');
                  file.base = path().join(file.cwd, 'src');
                }
                this.push(file);
                cb();
              }))
              .pipe(gulpif()(matchesAngularJs, gutil.noop(), wrap()(';(function (angular) {\n<%= contents %>\n})(window.LITHIUM && LITHIUM.angular || angular);')))
              .pipe(ngAnnotate()({
                single_quotes: true
              }))
              .pipe(gulp.dest(libPatterns.indexOf(pattern) > -1 ? path().join(dest, 'lib') : dest));
        })
    );
  }

  function createDependencies(src, dest, isWatch) {
    var moduleFiles = (function () {
      var deps = {};
      Object.keys(gutil.env.ng.moduleDependencyMap).forEach(function (key) {
        deps[key] = gutil.env.ng.moduleDependencyMap[key].map(function (dep) {
          return path().join('lib', dep);
        });
      });
      return deps;
    })();
    var moduleDependencies = (function () {
      var deps = {};
      Object.keys(gutil.env.ng.moduleDependencyMap).forEach(function (key) {
        if (key !== 'ng') {
          deps[key] = ['ng'];
        }
      });
      return deps;
    })();

    function recordModule (filePath, module, dependencies) {
      if (dependencies !== undefined &&
          moduleDependencies[module] !== undefined &&
          JSON.stringify(moduleDependencies[module]) !== JSON.stringify(['ng'])) {
        throw new Error (
            'Duplicate module declaration for [' +
            module + '] in [' +
            moduleFiles[module][0] + '] and [' +
            filePath + ']');
      } else {
        /*
         * Below logic checks whether file contians module declaration or lookup
         * It makes sure to add the module declaration to the top of moduleFiles
         * array
         */
        if (dependencies !== undefined) {
          /*
           * found module declaration
           * example: angular.module("my.mdoule", ["some.dependencies"])
           */

          moduleFiles[module] = [filePath].concat(moduleFiles[module] || []);
          moduleDependencies[module] = is().empty(dependencies) ?
              ['ng'] : dependencies;
        } else {
          /*
           * found module look up
           * example: angular.module("my.mdoule")
           */
          if (moduleFiles[module] === undefined) {
            moduleFiles[module] = [filePath];
          } else {
            if (moduleFiles[module].indexOf(filePath) === -1) {
              moduleFiles[module].push(filePath);
            }
          }
        }
      }
    }


    return gulp.src(['**/*.js', '!lib/**/*.js'], {cwd: src})
        .pipe(isWatch ? plumber()() : gutil.noop())
        .pipe(uglify()({compress: false, mangle: false}))
        .pipe(through().obj(
            function (file, enc, cb) {
              if (path().basename(file.path) === 'angular' &&
                  path().extname(file.path) === 'js') {
                cb();
                return;
              }
              var module_declaration = /angular\.module\((.*?)\)/gi;
              var contents = String(file.contents);
              var results;
              try {
                while((results = module_declaration.exec(contents)) !== null) {
                  var moduleData = [file.path.substring(file.base.length)]
                      .concat(JSON.parse('[' + results[1] + ']'));
                  recordModule.apply(null, moduleData);
                }
              } catch (err) {
                cb(err);
                return;
              }
              cb();
            },
            function (cb) {
              if (Object.getOwnPropertyNames(moduleDependencies).length > 0) {
                var file = new gutil.File({
                  base: '',
                  cwd: '',
                  path: 'dependencies.json'
                });
                file.contents = new Buffer(JSON.stringify({
                  moduleDependencies: moduleDependencies,
                  moduleFiles: moduleFiles
                }, null, 2));
                this.push(file);
              }
              cb();
            }
        ))
        .pipe(gulp.dest(dest));
  }

  function specialChecks() {

    function write(file, enc, callback) {
      var StringDecoder = stringDecoder().StringDecoder;
      var decoder = new StringDecoder('utf8');
      var contents = decoder.write(file.contents).split('\n');

      contents.forEach(function (line, i) {

        var match = line.match(/[^\s(\/\'#\[\.>{\"]{/m);
        if (match !== null) {
          if (!file.jshint) {
            file.jshint = {
              success: false
            };
          }
          if (!file.jshint.results) {
            file.jshint.results = [];
          }
          file.jshint.results.push({
            file: file.path,
            error: {
              id: '(error)',
              raw: 'Contains \'{\' without a space, (, \', #, [, ., >, {, ", or \/ before it',
              code: 'custom',
              evidence: line,
              line: i,
              character: match.index,
              scope: '(main)',
              a: undefined,
              b: undefined,
              c: undefined,
              d: undefined,
              reason: 'Contains \'{\' without a space, (, \', #, [, ., >, {, ", or \/ before it'
            }
          });
        }
      });
      callback(null, file);
    }
    return through().obj(write);
  }

  return {
    process: process,
    createDependencies: createDependencies,
    specialChecks: specialChecks,
    JS_MAIN_PATTERN: JS_MAIN_PATTERN,
    JS_DEMO_PATTERN: JS_DEMO_PATTERN,
    JS_MOCK_PATTERN: JS_MOCK_PATTERN,
    JS_SPEC_PATTERN: JS_SPEC_PATTERN,
    TPL_MAIN_PATTERN: TPL_MAIN_PATTERN,
    TPL_DEMO_PATTERN: TPL_DEMO_PATTERN,
    DEPENDENCIES: DEPENDENCIES,
    BASE: BASE
  };
};
