var fs = require('fs');

if (fs.existsSync('node_modules/li-sdk')) {
  require('li-sdk/gulp/includes')(require('gulp'));
} else {
  console.log('Npm dependencies missing. Please run "npm install".');
  process.exit(1);
}
