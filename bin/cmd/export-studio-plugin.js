/**
 * Created by doug.schroeder on 7/20/15.
 */
'use strict';

var gutil = require('gulp-util');
var pluginPoints = require('../../lib/plugin-points');

module.exports = {
  run: function () {
    require('../../lib/spawn-gulp')(['exportstudio'].concat(process.argv.splice(3)));
  },
  help: 'Prompts to export the studio plugin from the server.' +
    '\nRun this command from the root directory of a lithium-sdk project.' +
    gutil.colors.bold('\nOptions:') +
      '\n--force:   Skips the prompt and exports the studio plugin' +
      '\n           You can also set the force property to true in server.conf.json to always force this.' +
      '\n           Use --points flag or pluginPoints property in server.conf.json to specify up to five ' +
      '\n           plugin points to export if you do not want to export the entire plugin.' +
      '\n--verbose: If set, will log out each file that is exported from the Studio plugin' +
      '\n           You can also set the verbose property to true in server.conf.json to always do this.' +
      '\n--points:  Only works if the --force flag is used.  A comma-delimited set of 5 or less plugin points' +
      '\n           to include, in case you only want to export a sub-set of the studio plugin)' +
      '\n           You can also set the pluginPoints property in server.conf.json to always only export the' +
      '\n           plugin points you specify. Plugin points you can specify are: ' +
      '\n           ' + pluginPoints.getPoints().join()
};