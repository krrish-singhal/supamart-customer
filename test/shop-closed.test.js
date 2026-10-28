const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { storeStatus, STORE_HOURS } = require('../src/config/storeHours');

test('storeStatus accurately indicates closed status outside operating hours', () => {
  // 1:00 AM India time (closed)
  const nightDate = new Date('2026-10-29T01:00:00+05:30').getTime();
  const nightStatus = storeStatus(nightDate);
  assert.equal(nightStatus.isOpen, false);
  assert.equal(nightStatus.opensAt, '10:00');
  assert.equal(nightStatus.closesAt, '23:00');

  // 12:00 PM India time (open)
  const noonDate = new Date('2026-10-29T12:00:00+05:30').getTime();
  const noonStatus = storeStatus(noonDate);
  assert.equal(noonStatus.isOpen, true);

  // 11:30 PM India time (closed)
  const lateDate = new Date('2026-10-29T23:30:00+05:30').getTime();
  const lateStatus = storeStatus(lateDate);
  assert.equal(lateStatus.isOpen, false);
});

test('ShopClosedNotification component exists and is mounted in AppContent', () => {
  const appContent = fs.readFileSync(path.resolve(__dirname, '../App.js'), 'utf8');
  assert(appContent.includes("import ShopClosedNotification from './src/components/ShopClosedNotification';"));
  assert(appContent.includes('<ShopClosedNotification />'));

  const componentContent = fs.readFileSync(path.resolve(__dirname, '../src/components/ShopClosedNotification.js'), 'utf8');
  assert(componentContent.includes('Shop is closed Now !'));
  assert(componentContent.includes('Come back again at'));
  assert(componentContent.includes('useStoreStatus'));
});

test('HomeScreen includes real-time onSnapshot listener for banners', () => {
  const homeScreenContent = fs.readFileSync(path.resolve(__dirname, '../src/screens/HomeScreen.js'), 'utf8');
  assert(homeScreenContent.includes("collection(db, 'banners')"));
  assert(homeScreenContent.includes('onSnapshot('));
});
