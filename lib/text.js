/**
 * Library methods for text properties tasks
 *
 * @author Nikhil Modak
 */

'use strict';

var lazyReq = require('lazy-req')(require);
var through = require('through2').obj;
var path = require('path');
var extend = require('node.extend');
var TEXT_PLUGIN_PATH = 'plugin/res/lang/feature';
var TEXT_PATTERN = '*/**/*.json';

module.exports = function (gulp, gutil) {

  function flatten (data) {
    var result = {};
    var comments = {};
    var maxLength = 0;

    function recurse (cur, prop) {
      if (Object(cur) === cur) {
        for (var p in cur) {
          if (cur.hasOwnProperty(p)) {
            recurse(cur[p], prop ? prop + '.' + p : p);
          }
        }
      } else if (Array.isArray(cur)) {
        for(var i=0, l=cur.length; i<l; i++) {
          recurse(cur[i], prop ? prop+'.'+i : ''+i);
        }
      } else {
        if (prop.indexOf('-COMMENT') !== prop.length - '-COMMENT'.length) {
          result[prop] = cur;
          maxLength = prop.length + 3 > maxLength ?
          prop.length + 3: maxLength;
        } else if (String(cur).trim().length > 0) {
          comments[prop] = '# ' + String(cur).trim().replace(/\n/gm, '\n# ');
        }
      }
    }
    recurse(data, '');
    return Object.keys(result).map(function (key) {
      var entry = key + new Array(maxLength - key.length).join(' ') +
        '= ' + result[key];
      if (comments.hasOwnProperty(key + '-COMMENT')) {
        entry = comments[key + '-COMMENT'] + '\n' + entry;
      }
      return entry;
    }).join('\n');
  }

  function processText(patterns, dest) {
    var groups = {};
    return gulp.src(patterns)
      .pipe(through(function (file, enc, cb) {
        var group = file.path.substr(file.base.length).split(path.sep)[0];
        var lang = path.extname(gutil.replaceExtension(file.path,'')).substr(1);
        if (groups[group] === undefined) {
          groups[group] = {};
        }
        if (groups[group][lang] === undefined) {
          groups[group][lang] = {};
        }
        groups[group][lang] = extend(
          true,
          groups[group][lang],
          JSON.parse(String(file.contents))
        );
        cb();
      }, function (cb) {
        var _this = this;
        Object.keys(groups).forEach(function (group) {
          Object.keys(groups[group]).forEach(function (lang) {
            var file = new gutil.File({
              base: path.join(process.cwd(), dest),
              cwd: path.join(process.cwd(), dest),
              path: path.join(process.cwd(), dest,
                'ng-' + group, 'text.' + lang + '.properties'),
              contents: new Buffer(flatten(groups[group][lang]))
            });
            _this.push(file);
          });
        });
        cb();
      })
    )
    .pipe(gulp.dest(dest));
  }

  return {
    TEXT_PLUGIN_PATH: TEXT_PLUGIN_PATH,
    FILES_PATTERN: TEXT_PATTERN,
    processText: processText
  };
};
