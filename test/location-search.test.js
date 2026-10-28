const { test } = require('node:test');
const assert = require('node:assert/strict');
const { searchLocations, normalizeSuggestions } = require('../src/services/locationSearch');
const feature = (properties = {}, coordinates = [76.8602, 8.5637]) => ({ type: 'Feature', geometry: { type: 'Point', coordinates }, properties: { name: 'Menamkulam', city: 'Thiruvananthapuram', state: 'Kerala', postcode: '695582', ...properties } });

test('suggestions preserve exact longitude/latitude order, place names and real address fields', () => {
  const [result] = normalizeSuggestions({ features: [feature({ street: 'Beach Road', housenumber: '12' })] });
  assert.equal(result.latitude, 8.5637);
  assert.equal(result.longitude, 76.8602);
  assert.equal(result.title, 'Menamkulam');
  assert.match(result.detail, /12 Beach Road, Thiruvananthapuram, Kerala, 695582/);
  assert.equal(result.address.postalCode, '695582');
  assert.equal(result.address.street, '12 Beach Road');
});

test('invalid and duplicate places are excluded and results are bounded', () => {
  const features = [feature(), feature(), feature({}, ['76.8', 8.5]), feature({}, [181, 8.5]), feature({}, {}), { geometry: { type: 'LineString', coordinates: [76, 8] } }, ...Array.from({ length: 9 }, (_, i) => feature({ name: `Place ${i}` }))];
  const results = normalizeSuggestions({ features });
  assert.equal(results.length, 6);
  assert.equal(new Set(results.map(r => r.id)).size, 6);
  assert.deepEqual(normalizeSuggestions(null), []);
});

test('unnamed streets use their address instead of a numbered Result placeholder', () => {
  const [result] = normalizeSuggestions({ features: [feature({ name: '', street: 'Market Road', housenumber: '42' })] });
  assert.equal(result.title, '42 Market Road');
});

test('one or two trimmed characters never send a network request', async t => {
  const mock = t.mock.method(global, 'fetch', async () => { throw Error('Unexpected request'); });
  for (const q of ['', 'a', ' ab ']) assert.deepEqual(await searchLocations(q), []);
  assert.equal(mock.mock.callCount(), 0);
});

test('three characters trigger location-biased search and repeated queries use the cache', async t => {
  const mock = t.mock.method(global, 'fetch', async url => {
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('q'), 'men');
    assert.equal(parsed.searchParams.get('lat'), '8.5636625');
    assert.equal(parsed.searchParams.get('limit'), '6');
    return { ok: true, json: async () => ({ features: [feature()] }) };
  });
  const first = await searchLocations('men');
  const second = await searchLocations(' MEN ');
  assert.equal(first.length, 1);
  assert.deepEqual(second, first);
  assert.equal(mock.mock.callCount(), 1);
});

test('HTTP failures and malformed provider responses fail instead of showing false empty results', async t => {
  t.mock.method(global, 'fetch', async () => ({ ok: false }));
  await assert.rejects(searchLocations('failed request'), /unavailable/);
  global.fetch = async () => ({ ok: true, json: async () => ({ error: 'bad response' }) });
  await assert.rejects(searchLocations('malformed response'), /Invalid/);
});

test('canceling a search propagates to the provider request', async t => {
  let providerSignal;
  t.mock.method(global, 'fetch', (_url, { signal }) => new Promise((_resolve, reject) => {
    providerSignal = signal;
    signal.addEventListener('abort', () => reject(Error('Canceled')));
  }));
  const controller = new AbortController();
  const pending = searchLocations('cancel query', { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, /Canceled/);
  assert.equal(providerSignal.aborted, true);
});
