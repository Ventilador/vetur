const fs = require('fs');
const util = require('util');
const path = require('path');
const mkdir = util.promisify(fs.mkdir);
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const createReadStream = fs.createReadStream;
const createWriteStream = fs.createWriteStream;
const from = path.resolve(process.argv[2]);
const to = path.resolve(process.argv[3]);
const { copyFile, flush, promise } = createFileQueue();
move(from, to)
  .then(flush)
  .then(() => promise)
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

function move(from, to) {
  return Promise.all([stat(from), stat(to).catch(noop)]).then(([statFrom, statTo]) => {
    if (statFrom.isDirectory()) {
      if (!statTo) {
        return mkdir(to).then(() => copyDirectory(from, to));
      }
      return copyDirectory(from, to);
    } else {
      return copyFile(from, to);
    }
  });
}
function noop() {}

function copyDirectory(from, to) {
  return readdir(from).then(files => Promise.all([files.map(cur => move(path.join(from, cur), path.join(to, cur)))]));
}

function createFileQueue() {
  const queue = [];
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  let running = 0;
  let flushed = false;
  let errored = false;
  return {
    promise,
    flush,
    copyFile
  };
  function flush() {
    flushed = true;
    if (!running && !queue.length) {
      resolve();
    }
  }
  function copyFile(from, to) {
    if (errored) {
      return;
    }
    if (running === 20) {
      queue.push([from, to]);
      return;
    }
    running++;
    createReadStream(from)
      .pipe(createWriteStream(to))
      .on('close', onClose)
      .on('error', onError);
  }
  function onError(err) {
    if (errored) {
      return;
    }
    reject(err);
    errored = true;
  }
  function onClose() {
    if (errored) {
      return;
    }
    running--;
    if (queue.length) {
      copyFile.apply(null, queue.shift());
    } else if (!running && flushed) {
      resolve();
    }
  }
}
