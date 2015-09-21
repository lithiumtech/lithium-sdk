'use strict';

var expectFile = require('gulp-expect-file');
var streamSync = require('./stream-sync');
var through = require('through2').obj;

module.exports = function (gulp, gutil) {

  function allDirTreePaths(paths) {
    var newPaths = [];
    for (var i = 0; i < paths.length; i++) {
      var dirs = paths[i].split('/');
      var path = '';
      for (var j = 0; j < dirs.length; j++) {
        path = path + (path.length === 0 ? '' : '/') + dirs[j];
        if (newPaths.indexOf(path) === -1) {
          newPaths.push(path);
        }
      }
    }
    return newPaths;
  }

  var RULES = [
    // expected files
    {
      pattern: ['**/*'],
      options: {
        reportMissing: false,
        reportUnexpected: true,
        errorOnFailure: true,
        testFiles: true
      },
      expectations: [
        'res/lang/text.{en,en-gb}.properties',
        'res/lang/text.{ar,bg,ca,cs,da,de,el,es,es-mx,fi,fr,hr,hu,in,it,iw,ja,kk,ko,ms,nl,no,pl,pt,pt-br,ro,ru,sk,sq,' +
          'sv,th,tr,uk,vi,zh-cn,zh-tw}.(UTF-8).properties',
        'res/lang/text.{en,en-gb}/*.text',
        'res/lang/text.{ar,bg,ca,cs,da,de,el,es,es-mx,fi,fr,hr,hu,in,it,iw,ja,kk,ko,ms,nl,no,pl,pt,pt-br,ro,ru,sk,sq,' +
          'sv,th,tr,uk,vi,zh-cn,zh-tw}.(UTF-8)/*.text',
        'res/lang/feature/*/text.*.properties',
        'res/lang/feature/*/text.*.properties.json',
        'res/quilts/*.quilt.xml',
        'res/quilts/custom/*.quilt.xml',
        'res/layouts/*.layout.xml',
        'res/grids/*.grid.xml',
        'res/orders/*.order.xml',
        'res/components/*.ftl',
        'res/endpoints/*.endpoint.xml',
        'res/controllers/*.ftl',
        'res/macros/*.ftl',
        'res/init/Common.init.ftl',
        'res/skins/**/css/*.css',
        'res/skins/**/sass/**/*.{scss,sass}',
        'res/skins/**/sass/**/*.{scss,sass}.ftl',
        'res/skins/**/components/*.ftl',
        'res/skins/**/images/*.{png,gif,jpg,jpeg,svg}',
        'res/skins/**/skin.properties',
        'res/js/angularjs/**/*.js',
        'res/js/angularjs/metadata/dependencies.json',
        'res/editors/tinymce/**/*.js',
        'res/editors/tinymce/instances/**/*.json',
        'res/editors/tinymce/plugins/**/img/*.{png,gif,jpg,jpeg,svg}',
        'res/feature/*/*/res/lang/text.{en,en-gb}.properties',
        'res/feature/*/*/res/lang/text.{ar,bg,ca,cs,da,de,el,es,es-mx,fi,fr,hr,hu,in,it,iw,ja,kk,ko,ms,nl,no,pl,pt,pt-br,ro,ru,sk,sq,' +
          'sv,th,tr,uk,vi,zh-cn,zh-tw}.(UTF-8).properties',
        'res/feature/*/*/res/lang/text.{en,en-gb}/*.text',
        'res/feature/*/*/res/lang/text.{ar,bg,ca,cs,da,de,el,es,es-mx,fi,fr,hr,hu,in,it,iw,ja,kk,ko,ms,nl,no,pl,pt,pt-br,ro,ru,sk,sq,' +
          'sv,th,tr,uk,vi,zh-cn,zh-tw}.(UTF-8)/*.text',
        'res/feature/*/*/res/quilts/*.quilt.xml',
        'res/feature/*/*/res/layouts/*.layout.xml',
        'res/feature/*/*/res/grids/*.grid.xml',
        'res/feature/*/*/res/orders/*.order.xml',
        'res/feature/*/*/res/components/*.ftl',
        'res/feature/*/*/res/init/Common.init.ftl',
        'res/feature/*/*/res/skins/**/css/*.css',
        'res/feature/*/*/res/skins/**/sass/**/*.{scss,sass}',
        'res/feature/*/*/res/skins/**/sass/**/*.{scss,sass}.ftl',
        'res/feature/*/*/res/skins/**/components/*.ftl',
        'res/feature/*/*/res/skins/**/images/*.{png,gif,jpg,jpeg,svg}',
        'res/feature/*/*/res/skins/**/skin.properties',
        'res/feature/*/*/res/editors/tinymce/**/*.js',
        'res/feature/*/*/res/editors/tinymce/instances/**/*.json',
        'res/feature/*/*/res/editors/tinymce/plugins/**/img/*.{png,gif,jpg,jpeg,svg}',
        'res/feature/feature-definition.xml',
        '{res,web}/**/README.md',
        '{res,web}/**/*.example',
        'web/html/**/*.*',
        'web/html/apps/**/*.*',
        'web/html/**/version'
      ]
    },
    // expected directories
    {
      pattern: ['**/*'],
      options: {
        reportMissing: false,
        reportUnexpected: true,
        errorOnFailure: true,
        testDirectories: true
      },
      expectations: allDirTreePaths([
        'res/editors/tinymce/**',
        'res/lang',
        'res/lang/text.{en,en-gb}',
        'res/lang/text.{ar,bg,ca,cs,da,de,el,es,es-mx,fi,fr,hr,hu,in,it,iw,ja,kk,ko,ms,nl,no,pl,pt,pt-br,ro,ru,sk,sq,' +
          'sv,th,tr,uk,vi,zh-cn,zh-tw}.(UTF-8)',
        'res/lang/feature/*',
        'res/quilts',
        'res/quilts/custom',
        'res/layouts',
        'res/grids',
        'res/orders',
        'res/components',
        'res/init',
        'res/controllers',
        'res/endpoints',
        'res/macros',
        'res/skins/**',
        'res/js/angularjs/**',
        'res/js/angularjs/metadata',
        'res/feature/*/*/res/lang',
        'res/feature/*/*/res/lang/text.{en,en-gb}',
        'res/feature/*/*/res/lang/text.{ar,bg,ca,cs,da,de,el,es,es-mx,fi,fr,hr,hu,in,it,iw,ja,kk,ko,ms,nl,no,pl,pt,pt-br,ro,ru,sk,sq,' +
          'sv,th,tr,uk,vi,zh-cn,zh-tw}.(UTF-8)',
        'res/feature/*/*/res/quilts',
        'res/feature/*/*/res/layouts',
        'res/feature/*/*/res/grids',
        'res/feature/*/*/res/orders',
        'res/feature/*/*/res/components',
        'res/feature/*/*/res/init',
        'res/feature/*/*/res/editors/tinymce/**',
        'res/feature/*/*/res/skins/**',
        'web/html/ng-app/status/version',
        'web/html/apps/**',
        'web/html/assets/**',
        'web/html/badge_icons/**',
        'web/html/rank_icons/**',
        'web/html/survey_icons/**',
        'web/html/**'
      ])
    },
    {
      pattern: '**/*',
      options: {
        reportMissing: true,
        reportUnexpected: false,
        errorOnFailure: true,
        testDirectories: true
      },
      expectations: allDirTreePaths([
        'res/**'
      ])
    }
  ];

  return {
    verify: function () {
      return streamSync(
        {
          collateErrors: true
        },
        RULES.map(function (rule) {
          return function () {
            return gulp.src(rule.pattern, { cwd: 'plugin' })
              .pipe(through(function (file, enc, cb) {
                if (file.isStream()) {
                  cb(new gutil.PluginError('plugin-verify', 'Streaming not supported'));
                  return;
                }
                if (file.isNull() && file.stat && file.stat.isDirectory && file.stat.isDirectory()) {
                  if (rule.options.testDirectories) {
                    this.push(file);
                  }
                } else {
                  if (rule.options.testFiles) {
                    this.push(file);
                  }
                }
                cb();
              }))
              .pipe(expectFile(rule.options, rule.expectations));
          };
        })
      );
    }
  };
};
