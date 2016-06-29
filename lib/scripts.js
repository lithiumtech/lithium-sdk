/**
 * Library methods for scripts tasks
 *
 * @author Nikhil Modak
 */

'use strict';

var lazyReq = require('lazy-req')(require);
var path = lazyReq('path');
var uglify = lazyReq('gulp-uglify');
var through = lazyReq('through2');
var is = lazyReq('is_js');
var plumber = lazyReq('gulp-plumber');
var ngAnnotate = lazyReq('gulp-ng-annotate');
var stringDecoder = lazyReq('string_decoder');
var gjshint = lazyReq('gulp-jshint');
var gjscs = lazyReq('gulp-jscs');
var wrap = lazyReq('gulp-wrap');
var gulpif = lazyReq('gulp-if');
var lazypipe = lazyReq('lazypipe');
var newer = lazyReq('gulp-newer');
var babel = lazyReq('gulp-babel');
var embedTemplates = lazyReq('gulp-angular-embed-templates');
var fs = require('fs');

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
var TPL_DIRECTIVE_PATTERN = 'src/!(services)/**/!(*.demo).tpl.html';
var TPL_SERVICES_PATTERN = 'src/services/**/!(*.demo).tpl.html';
var TPL_DEMO_PATTERN = 'src/directives/**/*.demo.tpl.html';
var PLUGIN_SCRIPTS_PATH = 'plugin/res/js/angularjs';
var SCRIPTS_DEPS_PATH = 'plugin/res/js/angularjs/lib';
var SCRIPTS_DEPS_METADATA_PATH = 'plugin/res/js/angularjs/metadata';
var SCRIPT_DEPENDENCIES_PATH = 'plugin/res/js/angularjs/metadata';
var BASE = 'src';
var EXPECTED_MODULE_PARTS = 4;

module.exports = function (gulp, gutil) {

  function processScripts(patterns, dest, files, isWatch, isLint, bypassNewer) {
    var fail = gutil.env['lint-fail'];

    return gulp.src(patterns)
      .pipe(bypassNewer ? gutil.noop() : newer()(dest))
      .pipe(isWatch ? plumber()() : gutil.noop())
      .pipe(isLint ? jshint(fail) : gutil.noop())
      .pipe(isLint ? jscs(fail) : gutil.noop())
      .pipe(babel()({
        presets: [
          require.resolve('babel-preset-es2015') //hack: github.com/babel/babel-loader/issues/166#issuecomment-160866946
        ]
      }))
      .pipe(embedTemplates()({
        basePath: './src/directives',
        skipFiles: function (file) {
          return file.path.indexOf('services') > -1;
        }
      }))
      .pipe(wrapAngularContents())
      .pipe(ngAnnotate()({
        single_quotes: true
      }))
      // .pipe(gutil.env.filterFiles(files))
      .pipe(gulp.dest(dest));
  }

  function processTpls(pattern, dest, files, isWatch) {
    return gulp.src(pattern)
      .pipe(isWatch ? plumber()() : gutil.noop())
      .pipe(gutil.env.filterFiles(files))
      .pipe(_processTpls())
      .pipe(gulp.dest(dest));
  }

  function jshint(fail) {
    var pipe = lazypipe()()
      .pipe(gjshint(), fs.existsSync('.jshintrc') ? '.jshintrc' : true)
      .pipe(specialChecks)
      .pipe(gjshint().reporter, 'jshint-stylish');

    if (fail) {
      pipe = pipe.pipe(gjshint().reporter, 'fail');
    }
    return pipe();
  }

  function jscs(fail) {
    var pipe = lazypipe()();

    if (!fs.existsSync('.jscsrc')) {
      return pipe.pipe(gutil.noop)();
    }
    pipe = pipe
      .pipe(gjscs(), fs.existsSync('.jscsrc') ? { configPath: '.jscsrc' } : {})
      .pipe(gjscs().reporter);

    if (fail) {
      pipe = pipe.pipe(gjscs().reporter, 'fail');
    }
    return pipe();
  }

  function createDepsMetadata(src, dest, isWatch) {
    var moduleFiles = (function () {
      var deps = {};
      Object.keys(gutil.env.ng.moduleDependencyMap || {}).forEach(function (key) {
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

    function recordModule(filePath, module, dependencies) {
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
         * Below logic checks whether file contains module declaration or lookup
         * It makes sure to add the module declaration to the top of moduleFiles
         * array
         */
        if (dependencies !== undefined) {
          /*
           * found module declaration
           * example: angular.module("my.module", ["some.dependencies"])
           */

          moduleFiles[module] = [filePath].concat(moduleFiles[module] || []);
          moduleDependencies[module] = is().empty(dependencies) ?
              ['ng'] : dependencies;
        } else {
          /*
           * found module look up
           * example: angular.module("my.module")
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
      .pipe(through().obj(function (file, enc, cb) {
        if (path().basename(file.path) === 'angular' || path().basename(file.path) === 'angular2' &&
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
          cb();
        } catch (err) {
          console.log(gutil.colors.red(err));
          process.exit(1);
        }
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
      }))
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

  function _processTpls() {
    return through().obj(function (file, enc, cb) {
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
        moduleType = 'services';

      } else {
        url = file.path.substr(path().join(file.cwd, 'src', 'directives').length + 1);
        moduleType = 'directives';
      }

      file.contents = new Buffer(gutil.template(HTML2JS_TEMPLATE)({
        moduleName: (function () {

          var parts = file.path.split('/');

          /**
           * services/common/form-type-registry/fields/inputs/input.tpl.html
           *
           * The parts array is used to generate the moduleName for the templateCache entry. When
           * subfolders are in the parts array, the moduleName incorrectly includes them, making the
           * templateCache invalid. Look for the presence of sub-folders within the module by determining
           * the number of path parts between the moduleType's index (service or directive) and the end of
           * the path parts array. If there are more than 4, remove these from the array starting at the
           * next-to-last position:
           *
           * parts (original)
           * [ '', 'src', 'services', 'common', 'form-type-registry', 'fields', 'inputs', 'input.tpl.html' ]
           *
           * parts (modified)
           * [ '', 'src', 'services', 'common', 'form-type-registry', 'input.tpl.html' ]
           *
           * From this, the moduleName will be correctly set as li.services.common.form-type-registry
           *
           **/

          var numParts = parts.length;
          var moduleTypeIndex = parts.indexOf(moduleType);
          var diff = (numParts - moduleTypeIndex) - EXPECTED_MODULE_PARTS;

          if (diff > 0) {
            parts.splice((diff + 1) * -1, diff);
          }

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

      this.push(file);
      cb();
    });
  }

  function matchesAngularJs(file) {
    return file.path.indexOf('angular/angular.js') !== -1;
  }

  function wrapAngularContents() {
    var stream = through().obj();
    return stream.pipe(gulpif()(
        matchesAngularJs,
        gutil.noop(),
        wrap()(';(function (angular) {\n<%= contents %>\n})(window.LITHIUM && LITHIUM.angular || angular);'))
    );
  }

  return {
    processScripts: processScripts,
    processTpls: processTpls,
    jshint: jshint,
    jscs: jscs,
    createDepsMetadata: createDepsMetadata,
    specialChecks: specialChecks,
    JS_MAIN_PATTERN: JS_MAIN_PATTERN,
    JS_DEMO_PATTERN: JS_DEMO_PATTERN,
    JS_MOCK_PATTERN: JS_MOCK_PATTERN,
    JS_SPEC_PATTERN: JS_SPEC_PATTERN,
    TPL_DIRECTIVE_PATTERN: TPL_DIRECTIVE_PATTERN,
    TPL_SERVICES_PATTERN: TPL_SERVICES_PATTERN,
    TPL_DEMO_PATTERN: TPL_DEMO_PATTERN,
    PLUGIN_SCRIPTS_PATH: PLUGIN_SCRIPTS_PATH,
    SCRIPTS_DEPS_PATH: SCRIPTS_DEPS_PATH,
    SCRIPT_DEPENDENCIES_PATH: SCRIPT_DEPENDENCIES_PATH,
    SCRIPTS_DEPS_METADATA_PATH: SCRIPTS_DEPS_METADATA_PATH,
    BASE: BASE
  };
};
