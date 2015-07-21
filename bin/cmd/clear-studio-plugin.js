/**
 * Created by doug.schroeder on 7/20/15.
 */

var gutil = require('gulp-util');
module.exports = {
  run: function () {
    require('../../lib/spawn-gulp')(['clearstudio'].concat(process.argv.splice(3)));
  },
  help: 'Prompts to clear the studio plugin from the server.' +
    gutil.colors.bold('\nOptions:') +
    '\n--points: A comma-delimited set of 5 or less plugin points to include (in case you only want to clear a sub-set of the studio plugin)'
};