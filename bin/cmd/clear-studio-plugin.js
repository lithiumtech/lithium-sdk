/**
 * Created by doug.schroeder on 7/20/15.
 */

var gutil = require('gulp-util');
var pluginPoints = require('../../lib/plugin-points');

module.exports = {
  run: function () {
    require('../../lib/spawn-gulp')(['clearstudio'].concat(process.argv.splice(3)));
  },
  help: 'Prompts to clear the studio plugin (or certain parts of it) from the server.' +
    gutil.colors.bold('\nOptions:') +
	  '\n--force:   Skips the prompt and clears the studio plugin.' +
	  '\n           You can also set the force property to true in server.conf.json to always force this.' +
	  '\n           Use --points flag or pluginPoints property in server.conf.json to specify up to five ' +
	  '\n           plugin points to clear if you do not want to clear the entire plugin.' +
    '\n--verbose: If set, will log out each file that is cleared from the Studio plugin.' +
    '\n           You can also set the verbose property to true in server.conf.json to always do this.' +
    '\n--points:  Only works if the --force flag is used.  A comma-delimited set of 5 or less plugin points' +
    '\n           to include, in case you only want to clear a sub-set of the studio plugin.' +
    '\n           You can also set the pluginPoints property in server.conf.json to always only clear the' +
    '\n           plugin points you specify. Plugin points you can specify are: ' +
    '\n           ' + pluginPoints.getPoints().join()
};