/**
 * Created by nikhil.modak on 5/13/15.
 */

'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
module.exports = {
  run: function () {
    require('../../lib/project.js')(gulp, gutil).update(function (/* error */) {
      /* console.log(error); */
    });
  },
  help: 'Updates the lithium-sdk project.  Use this when updating a project to a new version of the SDK.' +
    '\nRun this command from the root directory of a lithium-sdk project.'
};
