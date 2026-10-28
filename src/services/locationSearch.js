const { STORE_LOCATION, validCoordinates } = require('../config/deliveryArea');
const ENDPOINT = 'https://photon.komoot.io/api/';
const MIN_SEARCH_LENGTH = 3;
const cache = new Map();
const clean = value => typeof value === 'string' ? value.trim() : '';
const unique = values => [...new Set(values.map(clean).filter(Boolean))];

function normalizeSuggestions(data) {
  const seen = new Set();
  return (Array.isArray(data?.features) ? data.features : []).flatMap(feature => {
    if (feature?.geometry?.type !== 'Point' || !Array.isArray(feature.geometry.coordinates)) return [];
    const [longitude, latitude] = feature.geometry.coordinates;
    if (!validCoordinates(latitude, longitude)) return [];
    const p = feature.properties || {};
    const street = unique([p.housenumber, p.street]).join(' ');
    const title = clean(p.name) || street || clean(p.district) || clean(p.city);
    if (!title) return [];
    const detail = unique([street, p.district, p.city, p.county, p.state, p.postcode, p.country]).filter(value => value !== title).join(', ');
    const id = `${latitude}:${longitude}:${title}`;
    if (seen.has(id)) return [];
    seen.add(id);
    return [{ id, latitude, longitude, title, detail, address: {
      name: title, street, district: clean(p.district) || clean(p.name),
      city: clean(p.city) || clean(p.county), region: clean(p.state), postalCode: clean(p.postcode),
    } }];
  }).slice(0, 6);
}

async function searchLocations(query, { signal } = {}) {
  const term = query.trim();
  if (term.length < MIN_SEARCH_LENGTH) return [];
  const key = term.toLocaleLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < 5 * 60 * 1000) return cached.results;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort);
  const timeout = setTimeout(abort, 8000);
  try {
    // Bias toward the delivery store; out-of-area selections remain subject to delivery checks.
    const url = `${ENDPOINT}?q=${encodeURIComponent(term)}&lat=${STORE_LOCATION.lat}&lon=${STORE_LOCATION.lng}&zoom=12&limit=6&lang=en`;
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Location search unavailable');
    const data = await response.json();
    if (!Array.isArray(data?.features)) throw new Error('Invalid location search response');
    const results = normalizeSuggestions(data);
    cache.delete(key);
    cache.set(key, { results, time: Date.now() });
    if (cache.size > 32) cache.delete(cache.keys().next().value);
    return results;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
module.exports = { searchLocations, normalizeSuggestions, MIN_SEARCH_LENGTH };
