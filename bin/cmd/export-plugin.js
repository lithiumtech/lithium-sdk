/**
 * Created by doug.schroeder on 7/23/15.
 */
'use strict';

var gutil = require('gulp-util');
module.exports = {
  run: function () {
    require('../../lib/spawn-gulp')(['exportsdk'].concat(process.argv.splice(3)));
  },
  help: 'Prompts to export the SDK plugin from the server.' +
    gutil.colors.bold('\nOptions:') +
    '\n--force:   Skips the prompt and exports the SDK plugin.' +
    '\n           You can also set the force property to true in server.conf.json to always force this.'
};