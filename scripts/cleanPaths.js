const fs = require('fs');
const promisify = require('util').promisify;
const join = require('path').join;
const readDir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);

module.exports = clean;

function clean(dirName) {
  return stat(dirName).then(stats => {
    if (stats.isFile()) {
      return unlink(dirName);
    } else {
      return readDir(dirName)
        .then(files => Promise.all(files.map(callClean, dirName)))
        .then(() => rmdir(dirName));
    }
  }, noop);
}

// this is provided as a second argument in files.map line 18
function callClean(file) {
  return clean(join(String(this), file));
}

if (!module.parent) {
  // if no module.parent, means this is being run from cmd, so get arguments and call on those
  // allow "clean" to be used as a module as well
  const folders = process.argv.slice(2);
  if (!folders.length) {
    return;
  }
  folders.forEach(clean);
}

function noop() {}
