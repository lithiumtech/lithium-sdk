#!/usr/bin/env node

'use strict';

var gutil = require('gulp-util');

module.exports = {
  run: function () {
    require('../../lib/spawn-gulp')(['responsive-options'].concat(process.argv.splice(3)));
  },
  help: 'Points your stage site to a specific url and port which will be hosted on your local machine to retrieve the ' +
  '\nCSS for the site’s skin. This overrides the SCSS/CSS for the skin configured in Admin. Skin and port settings are' +
  '\nstored in a configuration file (/configs/responsive.conf.json). The skin selected with this command is compiled '+
  '\nand served by li serve-sass. Run this command from the root directory of a plugin project.' +
  '\nAfter running this command, go to Studio > Advanced > SDK and check the "Override Skin CSS URL" and "View as Anonymous" '+
  '\ncheckboxes to allow local CSS override when viewing the community as an anonymous user.'
};