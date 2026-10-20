// Checks the actual source modules without loading a React Native runtime.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  const code = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require(specifier) {
      const target = path.resolve(path.dirname(file), specifier);
      if (/\.(png|webp)$/.test(target)) {
        assert.ok(fs.existsSync(target), `Missing image: ${target}`);
        return target;
      }
      return load(target + '.js');
    },
  }, { filename: file });
  cache.set(file, module.exports);
  return module.exports;
}
const product = load(path.join(root, 'src/utils/productImages.js'));
for (const name of ['brandLogos', 'categoryImages', 'subCategoryImages']) {
  const map = load(path.join(root, `src/utils/${name}.js`)).default;
  assert.ok(Object.keys(map).length > 0);
}
const sample = Object.keys(product.default)[0];
const resolve = product.getProductImageSource;
assert.equal(resolve({ name: sample }), product.default[sample]);
const remote = 'https://example.com/product.jpg';
assert.equal(resolve({ name: sample, images: [remote] }).uri, remote);
assert.equal(resolve({ name: sample, images: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'] }), product.default[sample]);
assert.equal(resolve({ name: '__unknown__', images: [remote] }).uri, remote);
assert.equal(resolve({ name: '__unknown__' }), null);
assert.equal(resolve(null), null);
console.log('PASS: all four image maps resolve existing files; remote priority, local fallback, generic seed fallback and empty states preserved.');
