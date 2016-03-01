/**
 * Created by doug.schroeder on 2/10/16.
 */

module.exports = {
  run: function () {
    require('../../lib/spawn-gulp')(['watch-res-sass'].concat(process.argv.splice(3)));
  },
  help: 'Compiles the skins and serves them locally. ' +
  '\nRun this command from the root directory of a project.'
};