/**
 * Created by doug.schroeder on 2/17/16.
 */

var gutil = require('gulp-util');
module.exports = {
  run: function () {
    require('../../lib/spawn-gulp')(['exportcore'].concat(process.argv.splice(3)));
  },
  help: 'Prompts to export the core plugin from the server.' +
  gutil.colors.bold('\nOptions:') +
  '\n--force:   Skips the prompt and exports the core plugin.' +
  '\n           You can also set the force property to true in server.conf.json to always force this.'
};