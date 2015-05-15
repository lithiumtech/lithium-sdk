/**
 * Library methods for test tasks
 *
 * @author Nikhil Modak
 */

'use strict';

var gjshint = require('gulp-jshint');
var through = require('through2').obj;
var karma = require('karma').server;
var http = require('http');

module.exports = function (gulp, gutil) {

  var scripts = require('./scripts.js')(gulp, gutil);

  function proxy() {
    var proxyServer = http.createServer(function (req, res) {
      res.writeHead(200);
      res.end('\n');
    });

    return {
      start: function () {
        proxyServer.listen(9615);
        return through();
      },
      stop: function () {
        var stream = through(
          function (data, enc, callback) {
            this.push(data);
            callback();
          },
          function (data) {
            proxyServer.close();
            this.emit('end', data);
          }
        );
        return stream;
      }
    };
  }

  return {
    jshint: function (fail) {
      var stream = through();
      fail = fail || gutil.env['lint-fail'];
      stream.pipe(gjshint('.jshintrc'))
        .pipe(scripts.specialChecks())
        .pipe(gjshint.reporter('jshint-stylish'))
        .pipe(fail ? gjshint.reporter('fail') : gutil.noop());
      return stream;
    },
    karma: function (cb) {
      var p = proxy();
      var opts = {
        configFile: process.cwd() + '/karma.conf.js'
      };

      if (gutil.env.hasOwnProperty('auto-watch')) {
        opts.autoWatch = gutil.env['auto-watch'];
      }

      if (gutil.env.hasOwnProperty('browsers')) {
        opts.browsers = gutil.env.browsers;
      }

      if (gutil.env.hasOwnProperty('colors')) {
        opts.colors = gutil.env.colors;
      }

      if (gutil.env.hasOwnProperty('log-level')) {
        opts.logLevel = gutil.env['log-level'];
      }

      if (gutil.env.hasOwnProperty('port')) {
        opts.port = gutil.env.port;
      }

      if (gutil.env.hasOwnProperty('reporters')) {
        opts.reporters = gutil.env.reporters;
      }

      if (gutil.env.hasOwnProperty('runner-port')) {
        opts.runnerPort = gutil.env.runnerPort;
      }

      if (gutil.env.hasOwnProperty('single-run')) {
        opts.singleRun = gutil.env['single-run'];
      }

      karma.start(opts, function () {
        p.stop();
        cb();
      });
    }
  };
};
