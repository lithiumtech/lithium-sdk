'use strict';

var lazyReq = require('lazy-req')(require);
var del = lazyReq('del');
var exec = require('child_process').exec;

module.exports = function (gulp, gutil) {
  gulp.task('clean-tmp', function () {
    return del()('.tmp', { force: true });
  });

  gulp.task('clean-dist', function () {
    var delPath = gutil.env.newStructure ? 'dist' : 'plugin';
    return del()(delPath, { force: true });
  });

  gulp.task('clean-plugin-zip', function () {
    return del()('plugin.lar', { force: true });
  });

  gulp.task('restructure', function (cb) {
    const gitCheckoutCmd = 'git checkout .';
    const bowerInstallCmd = 'cd angular-li && bower install';
    const dirsToDel = ['.tmp', 'plugin', 'res', 'web', 'bower_components', 'coverage', 'test-reports'];

    gutil.log('Delete unused or moved directories: ' + gutil.colors.cyan(`rm -rf ${dirsToDel}`));
    del()(dirsToDel, { force: true }).then(() => {
      gutil.log('Re-fetching "plugin" directory from git repo, ' +
        'make sure you do not have any local changes: ' + gutil.colors.cyan(gitCheckoutCmd));

      exec(gitCheckoutCmd, function (err) {
        if (err) {
          cb(err);
        }

        gutil.log('Installing bower components in angular-li sub dir: ' + gutil.colors.cyan(bowerInstallCmd));
        exec(bowerInstallCmd, function (err) {
          if (err) {
            cb(err);
          }
          gutil.log(gutil.colors.green('Restructure cleanup complete. Please run the ') + gutil.colors.cyan('gulp') +
            gutil.colors.green(' command from the root directory to start the angular-li env.'));
          cb();
        });
      });
    }).catch(err => {
      gutil.log(gutil.colors.red(err));
    });
  });

  gulp.task('clean', ['clean-tmp', 'clean-dist', 'clean-plugin-zip']);
};
