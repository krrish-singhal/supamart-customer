// Mobile reads use our API rather than the device's WebChannel connection to Google.
// The backend enforces ownership and performs the actual Firestore reads.
import apiClient from './api';
import { AppState } from 'react-native';

export const collection = (_db, ...parts) => {
  let opts = {};
  if (parts.length > 0 && typeof parts[parts.length - 1] === 'object' && !Array.isArray(parts[parts.length - 1])) {
    opts = parts.pop();
  }
  return { kind: 'collection', path: parts.join('/'), constraints: [], ...opts };
};
export const doc = (_db, ...parts) => {
  let opts = {};
  if (parts.length > 0 && typeof parts[parts.length - 1] === 'object' && !Array.isArray(parts[parts.length - 1])) {
    opts = parts.pop();
  }
  return { kind: 'doc', path: parts.join('/'), constraints: [], ...opts };
};
export const query = (ref, ...constraints) => ({ ...ref, constraints: [...ref.constraints, ...constraints] });
export const where = (field, op, value) => ({ type: 'where', field, op, value });
export const orderBy = (field, direction = 'asc') => ({ type: 'orderBy', field, direction });
export const limit = value => ({ type: 'limit', value });
export const documentId = () => '__name__';

const documentSnapshot = record => ({
  id: record?.id,
  exists: () => Boolean(record),
  data: () => record?.data,
});

export async function getDoc(ref) {
  const { data } = await apiClient.post('/reads', ref, { __skipErrorToast: true });
  return documentSnapshot(data.document);
}

export async function getDocs(ref) {
  const records = [];
  let cursor;
  do {
    const { data } = await apiClient.post('/reads', { ...ref, cursor }, { __skipErrorToast: true });
    records.push(...data.documents);
    cursor = data.nextCursor;
  } while (cursor);
  const docs = records.map(documentSnapshot);
  return { docs, empty: !docs.length, size: docs.length };
}

// Poll while visible, retry transport failures, and stop cleanly on unmount.
// Keep the snapshot interface used by screens, including inbox docChanges().
export function onSnapshot(ref, next, error = () => {}) {
  let stopped = false;
  let timer;
  let running = false;
  let previous = new Map();
  let previousDocs = new Map();
  let previousJSON;
  let failures = 0;
  const poll = async () => {
    if (stopped || running || (AppState.currentState && AppState.currentState !== 'active')) return;
    clearTimeout(timer);
    running = true;
    try {
      const snap = await (ref.kind === 'doc' ? getDoc(ref) : getDocs(ref));
      if (stopped) return;
      const docs = snap.docs || (snap.exists() ? [snap] : []);
      const current = new Map(docs.map(d => [d.id, JSON.stringify(d.data())]));
      const serialized = JSON.stringify([...current]);
      failures = 0;
      if (serialized !== previousJSON) {
        const changes = docs.filter(d => previous.get(d.id) !== current.get(d.id))
          .map(d => ({ type: previous.has(d.id) ? 'modified' : 'added', doc: d }));
        previousDocs.forEach((d, id) => {
          if (!current.has(id)) changes.push({ type: 'removed', doc: d });
        });
        snap.docChanges = () => changes;
        previous = current;
        previousDocs = new Map(docs.map(d => [d.id, d]));
        previousJSON = serialized;
        next(snap);
      }
    } catch (err) {
      if (!stopped) {
        failures += 1;
        error(err);
      }
    } finally {
      running = false;
      const baseInterval = Number(ref?.pollInterval) > 0 ? Number(ref.pollInterval) : 45000;
      if (!stopped) timer = setTimeout(poll, failures > 0 ? Math.min(10000 * (2 ** Math.min(failures, 4)), 60000) : baseInterval);
    }
  };
  const subscription = AppState.addEventListener('change', state => { if (state === 'active') poll(); });
  poll();
  return () => { stopped = true; clearTimeout(timer); subscription.remove(); };
}
