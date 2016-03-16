/**
 * Created by doug.schroeder on 2/17/16.
 */

var gutil = require('gulp-util');
module.exports = {
  run: function () {
    require('../../lib/spawn-gulp')(['exportcore'].concat(process.argv.splice(3)));
  }
};