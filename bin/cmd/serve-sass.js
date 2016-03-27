/**
 * Created by doug.schroeder on 2/10/16.
 */

module.exports = {
  run: function () {
    require('../../lib/spawn-gulp')(['watch-res-sass'].concat(process.argv.splice(3)));
  },
  help: 'Compiles the SCSS files for the responsive skin you selected (either in Studio > Advanced > SDK or configured' +
  '\nwith li set-responsive-options) and serves the compiled CSS from the specified port.' +
  '\nSaved changes to local SCSS will be seen in the browser upon reload. ' +
  '\nYou can view the compiled CSS at the URL you set (either in Studio or with li set-responsive-options). ' +
  '\nRun this command from the root directory of a project.'
};