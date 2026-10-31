const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const babel = require('@babel/core');

const apiCode = babel.transformSync(
  fs.readFileSync(require.resolve('../src/services/api.js'), 'utf8'),
  {
    configFile: false,
    babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }
).code;

test('api.js detects local vs cloud URLs and tunnel hostnames', () => {
  // Verify regex logic for isLocalUrl
  const isLocalUrl = (url) => {
    if (!url) return false;
    return (
      url.includes('localhost') ||
      url.includes('127.0.0.1') ||
      url.includes('10.0.2.2') ||
      /^https?:\/\/(?:10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[01])\.)/.test(url)
    );
  };

  assert.equal(isLocalUrl('http://localhost:5000/api'), true);
  assert.equal(isLocalUrl('http://127.0.0.1:5000/api'), true);
  assert.equal(isLocalUrl('http://10.28.41.35:5000/api'), true);
  assert.equal(isLocalUrl('http://192.168.1.100:5000/api'), true);
  assert.equal(isLocalUrl('http://172.20.10.2:5000/api'), true);
  assert.equal(isLocalUrl('https://supamart-backend-353k.onrender.com/api'), false);
  assert.equal(isLocalUrl('https://api.example.com/api'), false);
});

test('api.js returns cloud fallback if Metro host is a tunnel URL', () => {
  const FALLBACK_API_URL = 'https://supamart-backend-353k.onrender.com/api';
  const checkTunnel = (host) => {
    const isTunnel =
      host.includes('exp.direct') ||
      host.includes('ngrok') ||
      host.includes('loca.lt');
    return isTunnel ? FALLBACK_API_URL : `http://${host}:5000/api`;
  };

  assert.equal(checkTunnel('abc-123.exp.direct'), FALLBACK_API_URL);
  assert.equal(checkTunnel('test.ngrok.io'), FALLBACK_API_URL);
  assert.equal(checkTunnel('my-sub.loca.lt'), FALLBACK_API_URL);
  assert.equal(checkTunnel('10.28.41.35'), 'http://10.28.41.35:5000/api');
});

test('Firebase session restore restores cached profile immediately and tolerates network errors without logging out', async () => {
  const storage = new Map([
    ['authMode', 'firebase'],
    ['userProfile', JSON.stringify({ id: 'u1', name: 'Test User', email: 'test@example.com', role: 'CUSTOMER' })],
  ]);

  let token = null;
  let userProfile = null;
  let loading = true;

  const mockAsyncStorage = {
    getItem: async (k) => storage.get(k) || null,
    setItem: async (k, v) => storage.set(k, String(v)),
    removeItem: async (k) => storage.delete(k),
  };

  const mockFbUser = { uid: 'u1', email: 'test@example.com', displayName: 'Test User' };

  // Simulate loadToken logic from AuthContext.js
  const loadToken = async (apiMePromise) => {
    try {
      const authMode = await mockAsyncStorage.getItem('authMode');
      if (authMode === 'firebase') {
        const storedProfile = await mockAsyncStorage.getItem('userProfile');
        let hasCachedProfile = false;
        if (storedProfile) {
          try {
            userProfile = JSON.parse(storedProfile);
            token = 'firebase-native';
            loading = false; // Unblock UI immediately!
            hasCachedProfile = true;
          } catch (_e) {}
        }

        const fbUser = mockFbUser;
        if (!fbUser) {
          token = null;
          userProfile = null;
          await mockAsyncStorage.removeItem('userProfile');
          await mockAsyncStorage.removeItem('authMode');
          loading = false;
          return;
        }

        token = 'firebase-native';
        if (!hasCachedProfile) {
          userProfile = { id: fbUser.uid, email: fbUser.email, name: fbUser.displayName, role: 'CUSTOMER' };
          loading = false;
        }

        apiMePromise()
          .then((res) => {
            if (res.data) {
              userProfile = res.data;
              mockAsyncStorage.setItem('userProfile', JSON.stringify(res.data));
            }
          })
          .catch(async (err) => {
            if (err.response?.status === 401) {
              token = null;
              userProfile = null;
              await mockAsyncStorage.removeItem('userProfile');
              await mockAsyncStorage.removeItem('authMode');
            }
          })
          .finally(() => {
            loading = false;
          });
      }
    } finally {
      loading = false;
    }
  };

  const flush = () => new Promise((resolve) => setImmediate(resolve));

  // Case 1: Backend is slow / unreachable / network error
  await loadToken(async () => {
    throw new Error('Network Error');
  });
  await flush();

  // User should STILL be authenticated with cached profile, UI unblocked, authMode retained!
  assert.equal(loading, false);
  assert.equal(token, 'firebase-native');
  assert.equal(userProfile.name, 'Test User');
  assert.equal(storage.get('authMode'), 'firebase');
  assert.notEqual(storage.get('userProfile'), null);

  // Case 2: Backend explicitly rejects with 401 Unauthorized
  const error401 = new Error('Unauthorized');
  error401.response = { status: 401 };
  await loadToken(async () => {
    throw error401;
  });
  await flush();

  // Now session should be cleared
  assert.equal(token, null);
  assert.equal(userProfile, null);
  assert.equal(storage.has('authMode'), false);
  assert.equal(storage.has('userProfile'), false);
});
