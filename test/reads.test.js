const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const babel = require('@babel/core');
const code = babel.transformSync(fs.readFileSync(require.resolve('../src/services/reads.js'), 'utf8'), {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;
function setup(post) {
  const timers = new Map();
  let onState;
  const appState = { currentState: 'active', addEventListener: (_, callback) => {
    onState = callback;
    return { remove: () => { onState = null; } };
  } };
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => name === './api' ? { post } : { AppState: appState },
    setTimeout: callback => { const id = Symbol(); timers.set(id, callback); return id; },
    clearTimeout: id => timers.delete(id),
  });
  return { api: exports, timers, appState, change: state => { appState.currentState = state; onState?.(state); } };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
test('reads paginate without silently dropping catalog documents', async () => {
  let count = 0;
  const { api } = setup(async (_, request) => {
    count++;
    assert.equal(request.cursor, count === 1 ? undefined : 'p1');
    return { data: { documents: [{ id: `p${count}`, data: { name: 'Product' } }], nextCursor: count === 1 ? 'p1' : null } };
  });
  const result = await api.getDocs(api.collection(null, 'products'));
  assert.equal(result.size, 2);
  assert.equal(result.docs[1].id, 'p2');
  assert.equal(result.docs[0].data().name, 'Product');
});
test('listeners deliver additions, modifications, and removals; cleanup cancels polling', async () => {
  let records = [{ id: 'p1', data: { stock: 1 } }];
  const { api, timers } = setup(async () => ({ data: { documents: records } }));
  const changes = [];
  const stop = api.onSnapshot(api.collection(null, 'products'), snap => changes.push(Array.from(snap.docChanges(), d => d.type)));
  await flush();
  records = [{ id: 'p1', data: { stock: 2 } }, { id: 'p2', data: { stock: 1 } }];
  [...timers.values()][0](); await flush();
  records = [{ id: 'p2', data: { stock: 1 } }];
  [...timers.values()][0](); await flush();
  assert.deepEqual(changes, [['added'], ['modified', 'added'], ['removed']]);
  stop();
  assert.equal(timers.size, 0);
});
test('listeners retry failed transport and pause while app is in the background', async () => {
  let calls = 0, errors = 0, updates = 0;
  const { api, timers, change } = setup(async () => {
    if (++calls === 1) throw Error('Offline');
    return { data: { document: { id: 'o1', data: { status: 'DELIVERED' } } } };
  });
  const stop = api.onSnapshot(api.doc(null, 'orders', 'o1'), () => updates++, () => errors++);
  await flush();
  change('background');
  [...timers.values()][0](); await flush();
  assert.equal(calls, 1);
  change('active'); await flush();
  assert.equal(calls, 2);
  assert.equal(updates, 1);
  assert.equal(errors, 1);
  stop();
});
test('unsubscribed listeners ignore pending responses', async () => {
  let resolve;
  const { api, timers } = setup(() => new Promise(done => { resolve = done; }));
  let calls = 0;
  const stop = api.onSnapshot(api.doc(null, 'orders', 'o1'), () => calls++);
  stop();
  resolve({ data: { document: null } }); await flush();
  assert.equal(calls, 0);
  assert.equal(timers.size, 0);
});
