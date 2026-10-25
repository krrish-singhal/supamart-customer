// Preserve each key's original position and final value while removing overwritten entries.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { parse } = require('@babel/parser');
const filename = path.resolve(__dirname, '../src/utils/productImages.js');
const original = fs.readFileSync(filename, 'utf8');
function inspect(source) {
  const ast = parse(source, { sourceType: 'module' });
  const declaration = ast.program.body.find(node => node.type === 'VariableDeclaration' && node.declarations.some(item => item.id.name === 'productImages'));
  const object = declaration.declarations.find(item => item.id.name === 'productImages').init;
  const groups = new Map();
  const effective = {};
  for (const property of object.properties) {
    const name = property.key.value;
    assert(property.value.callee.name === 'require');
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(property);
    effective[name] = property.value.arguments[0].value;
  }
  return { groups, effective };
}
const before = inspect(original);
const edits = [];
for (const entries of before.groups.values()) {
  if (entries.length < 2) continue;
  const first = entries[0], last = entries.at(-1);
  edits.push({ start: first.value.start, end: first.value.end, text: original.slice(last.value.start, last.value.end) });
  for (const entry of entries.slice(1)) edits.push({ start: entry.start, end: entry.end + (original[entry.end] === ',' ? 1 : 0), text: '' });
}
let changed = original;
for (const edit of edits.sort((a, b) => b.start - a.start)) changed = changed.slice(0, edit.start) + edit.text + changed.slice(edit.end);
const after = inspect(changed);
assert.deepEqual(Object.entries(after.effective), Object.entries(before.effective), 'Image values and lookup order must remain identical');
fs.writeFileSync(filename, changed.replace(/[ \t]+$/gm, ''));
console.log(`Removed ${edits.length - [...before.groups.values()].filter(entries => entries.length > 1).length} overwritten product mappings; lookup order and final values preserved.`);
