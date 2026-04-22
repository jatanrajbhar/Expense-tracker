/**
 * Thin JSON file store.
 *
 * Persistence is a single JSON file.  Each write is atomic: the serialized
 * state is first flushed to a sibling `.tmp` file, then renamed into place.
 * `fs.renameSync` on the same filesystem is atomic on all major OSes, so a
 * crash between the two steps at worst leaves an orphaned `.tmp` file — the
 * live data file is never partially written.
 *
 * `setPath` lets tests inject a temp-file path so they never touch the real store.
 */

const fs = require('fs');
const path = require('path');

let storePath = path.join(__dirname, 'expenses.json');

function setPath(p) {
  storePath = p;
}

function read() {
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf8'));
  } catch {
    return { expenses: [], idempotencyIndex: {} };
  }
}

function write(state) {
  const tmp = storePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, storePath);
}

module.exports = { read, write, setPath };
