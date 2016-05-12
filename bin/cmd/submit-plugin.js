/**
 * Created by nikhil.modak on 5/13/15.
 */

var gutil = require('gulp-util');
module.exports = {
  run: function () {
    require('../../lib/spawn-gulp')(['plugin-upload'].concat(process.argv.splice(3)));
  },
  help: 'Packages and validates the plugin locally and then prompts to upload the plugin to the server.' +
    '\nRun this command from the root directory of an lithium-sdk project.' +
    gutil.colors.bold('\nOptions:') +
    '\n--force:   Skips the prompt and continues to upload the plugin after local validations are successful' +
    '\n--dryrun:  Uploads the plugin for server validation but does not save the plugin on the server'
};