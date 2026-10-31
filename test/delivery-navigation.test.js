import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Delivery portal navigation and DeliveryMap screen registration', () => {
  it('registers DeliveryMap inside DeliveryTabs and in both partner and customer stacks', () => {
    const navContent = fs.readFileSync(path.resolve(__dirname, '../src/navigation/Navigation.js'), 'utf8');

    // DeliveryTabs must contain DeliveryMap as a hidden tab screen
    assert.ok(
      navContent.includes('<Tab.Screen\n        name="DeliveryMap"'),
      'DeliveryTabs should register DeliveryMap'
    );

    // Stack.Navigator must register DeliveryMap in both partner and customer paths
    const deliveryMapMatches = [...navContent.matchAll(/name="DeliveryMap"/g)];
    assert.ok(
      deliveryMapMatches.length >= 3,
      `Expected DeliveryMap to be registered in DeliveryTabs, Partner Stack, and Customer Stack (found ${deliveryMapMatches.length})`
    );

    // Case-insensitive partner check
    assert.ok(
      navContent.includes("userProfile?.role || '').trim().toUpperCase() === 'PARTNER'"),
      'Navigation should use case-insensitive check for partner role'
    );
  });

  it('DeliveryOrdersScreen dispatches navigation to DeliveryMap through parent and fallback references', () => {
    const screenContent = fs.readFileSync(
      path.resolve(__dirname, '../src/screens/DeliveryOrdersScreen.js'),
      'utf8'
    );

    assert.ok(
      screenContent.includes("parentNav.navigate('DeliveryMap', navParams)"),
      'Should attempt navigating via parent navigator'
    );
    assert.ok(
      screenContent.includes("navigation.navigate('DeliveryMap', navParams)"),
      'Should attempt navigating via current navigator'
    );
    assert.ok(
      screenContent.includes("navigationRef.navigate('DeliveryMap', navParams)"),
      'Should fallback to navigationRef'
    );
  });

  it('DeliveryMapScreen implements handleGoBack with parent stack fallback', () => {
    const mapContent = fs.readFileSync(
      path.resolve(__dirname, '../src/screens/DeliveryMapScreen.js'),
      'utf8'
    );

    assert.ok(
      mapContent.includes('const handleGoBack = useCallback('),
      'DeliveryMapScreen should define safe handleGoBack'
    );
    assert.ok(
      mapContent.includes("parentNav.navigate('DeliveryMain')"),
      'handleGoBack should fallback to DeliveryMain in parent'
    );
  });
});
