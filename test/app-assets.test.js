const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function sources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? sources(filename) : filename.endsWith('.js') ? [filename] : [];
  });
}
test('all static application asset references resolve, including names with apostrophes', () => {
  for (const filename of [path.join(root, 'App.js'), ...sources(path.join(root, 'src'))]) {
    const text = fs.readFileSync(filename, 'utf8');
    for (const match of text.matchAll(/require\(\s*(["'])(.*?)\1\s*\)/g)) {
      if (/\.(png|webp|jpe?g|ttf)$/.test(match[2])) assert(fs.existsSync(path.resolve(path.dirname(filename), match[2])), `${filename}: ${match[2]}`);
    }
  }
});
test('selected icon exports retain exact public library aliases without importing the full catalogue', () => {
  const libraryRoot = path.resolve(path.dirname(require.resolve('lucide-react-native')), '../..');
  const index = fs.readFileSync(path.join(libraryRoot, 'dist/esm/lucide-react-native.mjs'), 'utf8');
  const aliases = new Map();
  for (const entry of index.matchAll(/export \{ ([^}]+) \} from '\.\/icons\/([^']+)\.mjs';/g)) {
    for (const alias of entry[1].matchAll(/default as (\w+)/g)) aliases.set(alias[1], entry[2]);
  }
  const icons = fs.readFileSync(path.join(root, 'src/components/icons.js'), 'utf8');
  const exports = [...icons.matchAll(/default as (\w+) \} from 'lucide-react-native\/icons\/([^']+)'/g)];
  assert(exports.length > 0);
  for (const entry of exports) assert.equal(aliases.get(entry[1]), entry[2], entry[1]);
  for (const filename of sources(path.join(root, 'src'))) {
    assert(!/from ['"]lucide-react-native['"]/.test(fs.readFileSync(filename, 'utf8')), filename);
  }
});
