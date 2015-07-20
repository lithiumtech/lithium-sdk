/**
 * Created by doug.schroeder on 5/13/15.
 */

var gutil = require('gulp-util');
module.exports = {
  run: function () {
    require('../../lib/spawn-gulp')(['export'].concat(process.argv.splice(3)));
  },
  help: 'Prompts to export the studio plugin from the server.' +
    '\nRun this command from the root directory of an lithium-sdk project.' +
    gutil.colors.bold('\nOptions:') +
    '\n--force: Skips the prompt and exports the studio plugin' +
    '\n--points: A comma-delimited set of 5 or less plugin points to include (in case you only want to export a sub-set of the studio plugin)'
};