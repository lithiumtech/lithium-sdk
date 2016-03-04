/**
 * Created by doug.schroeder on 2/10/16.
 */

module.exports = {
  run: function () {
    require('../../lib/spawn-gulp')(['watch-res-sass'].concat(process.argv.splice(3)));
  },
  help: 'Compiles the sass files in your chosen responsive skin (run li responsive-options to choose your ' +
  '\nresponsive skin) and serves them locally. ' +
  '\nRun this command from the root directory of a project.'
};