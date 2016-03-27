#!/usr/bin/env node

'use strict';

var gutil = require('gulp-util');

module.exports = {
  run: function () {
    require('../../lib/spawn-gulp')(['responsive-options'].concat(process.argv.splice(3)));
  },
  help: 'Points your stage site to a specific url and port which will be hosted on your local machine to retrieve the ' +
  '\nCSS for the site’s skin (You can alternatively configure the port and skin in Studio > Advanced > SDK).' +
  '\nSkin and port settings are stored in a configuration file (/configs/responsive.conf.json) created by this script.' +
  '\nThe skin selected with this script is compiled and served by running li serve-sass, overriding the default CSS ' +
  '\nconfigured for the community in Community Admin while doing responsive skin development.' +
  '\nRun this script from the root directory of a plugin project, and run it before running li serve-sass.' +
  '\nAfter running this, go to Studio > Advanced > SDK and select the "View as Anonymous" checkbox to allow the local CSS ' +
  '\nto continue overriding the default CSS when viewing the community as an anonymous user.' +
  '\nThe "Override Skin CSS URL" checkbox must be selected for this setting to be applied.'
};