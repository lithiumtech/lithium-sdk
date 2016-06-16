/**
 * Created by doug.schroeder on 2/10/16.
 */
'use strict';

module.exports = {
  run: function () {
    require('../../lib/spawn-gulp')(['watch-res-sass', 'local-server'].concat(process.argv.splice(3)));
  },
  help: 'Compiles and serves SCSS files for the responsive skin selected with li set-responsive-options.' +
  '\nSaved changes to local SCSS appears in the browser upon reload. View the compiled CSS at the URL set '+
  '\nwith li set-responsive-options.' +
  '\nRun this command from the root directory of a project. Run li set-responsive-options before running this command.'
};