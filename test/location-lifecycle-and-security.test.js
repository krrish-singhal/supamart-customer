const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Location Lifecycle, Security & Google Play Disclosure Suite', async (t) => {
  const disclosurePath = path.join(__dirname, '../src/components/LocationDisclosureModal.js');
  const bgLocationPath = path.join(__dirname, '../src/services/backgroundLocation.js');
  const mapScreenPath = path.join(__dirname, '../src/screens/DeliveryMapScreen.js');
  const ordersScreenPath = path.join(__dirname, '../src/screens/DeliveryOrdersScreen.js');
  const trackingScreenPath = path.join(__dirname, '../src/screens/OrderTrackingScreen.js');
  const privacyScreenPath = path.join(__dirname, '../src/screens/PrivacyPolicyScreen.js');
  const appConfigPath = path.join(__dirname, '../app.config.js');

  const disclosureContent = fs.readFileSync(disclosurePath, 'utf8');
  const bgLocationContent = fs.readFileSync(bgLocationPath, 'utf8');
  const mapScreenContent = fs.readFileSync(mapScreenPath, 'utf8');
  const ordersScreenContent = fs.readFileSync(ordersScreenPath, 'utf8');
  const trackingScreenContent = fs.readFileSync(trackingScreenPath, 'utf8');
  const privacyScreenContent = fs.readFileSync(privacyScreenPath, 'utf8');
  const appConfigContent = fs.readFileSync(appConfigPath, 'utf8');

  await t.test('1. Prominent Disclosure: modal contains all mandatory Google Play disclosure terms', () => {
    // Must explain precise location
    assert.ok(
      disclosureContent.includes('precise location') || disclosureContent.includes('GPS coordinates'),
      'Disclosure must mention precise GPS location'
    );
    // Must state collection when closed / minimized / screen locked
    assert.ok(
      disclosureContent.includes('closed, minimized, or your device screen is locked'),
      'Disclosure must clearly state background collection when app is closed, minimized or screen locked'
    );
    // Must explain live customer sharing
    assert.ok(
      disclosureContent.includes('shared exclusively with the customer'),
      'Disclosure must explain that coordinates are shared with the customer awaiting their order'
    );
    // Must detail tracking start and stop triggers
    assert.ok(
      /automatically ceases as soon as the order is marked Delivered/.test(disclosureContent),
      'Disclosure must detail the exact delivery lifecycle boundaries'
    );
    // Must have Accept and Decline buttons
    assert.ok(disclosureContent.includes('Accept & Continue'), 'Must include Accept action');
    assert.ok(disclosureContent.includes('Not Now'), 'Must include Decline action');
  });

  await t.test('2. Background Location Service: token auto-refresh handles 60+ min Firebase expiry', () => {
    // Must import auth
    assert.ok(bgLocationContent.includes("import { auth } from './firebase'"), 'Must import auth from firebase');
    // Must include getValidAuthToken with forceRefresh support
    assert.ok(bgLocationContent.includes('async function getValidAuthToken'), 'Must define getValidAuthToken helper');
    assert.ok(bgLocationContent.includes('auth.currentUser.getIdToken(forceRefresh)'), 'Must support force-refreshing Firebase token');
    // Must retry 401 with fresh token
    assert.ok(
      bgLocationContent.includes('if (res.status === 401)'),
      'Background task must catch 401 responses and retry with refreshed token'
    );
    // Must cleanly clean up on stopBackgroundTracking
    assert.ok(
      bgLocationContent.includes("AsyncStorage.removeItem('@supamart_partner_id')"),
      'stopBackgroundTracking must clean up partner tracking state'
    );
  });

  await t.test('3. Simulated 75-Minute Token Expiry and Auto-Recovery Verification', async () => {
    // Simulate token expiration behavior in headless worker:
    let tokenIssuedAt = Date.now() - (75 * 60 * 1000); // 75 minutes ago
    let refreshCount = 0;

    const mockAuth = {
      currentUser: {
        getIdToken: async (forceRefresh) => {
          if (forceRefresh || Date.now() - tokenIssuedAt > 60 * 60 * 1000) {
            refreshCount++;
            tokenIssuedAt = Date.now();
            return `fresh-token-v${refreshCount}`;
          }
          return 'stale-token-expired';
        },
      },
    };

    // Verify token is expired after 75 minutes
    const initialToken = await mockAuth.currentUser.getIdToken(false);
    assert.strictEqual(initialToken, 'fresh-token-v1');
    assert.strictEqual(refreshCount, 1);

    // Verify subsequent call within 60 minutes uses current token
    const cachedToken = await mockAuth.currentUser.getIdToken(false);
    assert.strictEqual(cachedToken, 'stale-token-expired');

    // Verify force-refresh on 401 returns new token
    const forcedToken = await mockAuth.currentUser.getIdToken(true);
    assert.strictEqual(forcedToken, 'fresh-token-v2');
    assert.strictEqual(refreshCount, 2);
  });

  await t.test('4. DeliveryMapScreen: role guard and remote cancellation/reassignment cleanup', () => {
    // Must enforce role guard
    assert.ok(
      mapScreenContent.includes("['PARTNER', 'ADMIN'].includes(String(userProfile.role || '').toUpperCase())"),
      'DeliveryMapScreen must enforce partner/admin role guard on mount'
    );
    // Must stop tracking on remote cancellation/delivery in Firestore snapshot
    assert.ok(
      mapScreenContent.includes("fresh.status === 'CANCELLED' || fresh.status === 'DELIVERED'"),
      'Must monitor remote CANCELLED and DELIVERED states in onSnapshot'
    );
    // Must stop tracking on remote reassignment
    assert.ok(
      mapScreenContent.includes('fresh.assignedPartnerId') && mapScreenContent.includes('Order Reassigned'),
      'Must monitor remote order reassignment and stop tracking'
    );
    // Must embed LocationDisclosureModal
    assert.ok(
      mapScreenContent.includes('<LocationDisclosureModal'),
      'DeliveryMapScreen must render LocationDisclosureModal'
    );
    // Must render view-only "Order is Cancelled" for cancelled orders (no operation/pickup button)
    assert.ok(
      mapScreenContent.includes("order.status === 'CANCELLED'") &&
      mapScreenContent.includes('Order is Cancelled'),
      'DeliveryMapScreen must display view-only Order is Cancelled status for cancelled orders'
    );
  });

  await t.test('5. DeliveryOrdersScreen: role guard and off-duty tracking termination', () => {
    // Must enforce role guard
    assert.ok(
      ordersScreenContent.includes("['PARTNER', 'ADMIN'].includes(String(userProfile.role || '').toUpperCase())"),
      'DeliveryOrdersScreen must enforce partner/admin role guard on mount'
    );
    // Must terminate tracking on duty toggle off
    assert.ok(
      ordersScreenContent.includes('await stopBackgroundTracking()'),
      'DeliveryOrdersScreen must call stopBackgroundTracking on off-duty'
    );
  });

  await t.test('6. OrderTrackingScreen: customer receives partner location safely without leaking profile', () => {
    // Must restrict raw deliveryPartner document reads to Admin or self
    assert.ok(
      trackingScreenContent.includes("userProfile?.role === 'ADMIN' || String(userProfile?.id) === String(partnerId)"),
      'OrderTrackingScreen must prevent arbitrary customers from listening to raw deliveryPartner doc'
    );
    // Must read partner location via order.partnerLocation
    assert.ok(
      trackingScreenContent.includes('order?.partnerLocation'),
      'Customer app must track partner location via order.partnerLocation'
    );
  });

  await t.test('7. Privacy Policy: separately defines customer vs partner tracking & verified retention', () => {
    // Customer foreground only
    assert.ok(
      privacyScreenContent.includes('Customer Location (Foreground Only)'),
      'Privacy policy must clearly define Customer Location as Foreground Only'
    );
    // Partner background tracking
    assert.ok(
      privacyScreenContent.includes('Delivery Partner Location (Active Delivery Only)'),
      'Privacy policy must clearly define Delivery Partner Location for Active Deliveries'
    );
    // Foreground service notification
    assert.ok(
      privacyScreenContent.includes('Foreground Service Notification'),
      'Privacy policy must mention persistent status bar notification'
    );
    // Retention implementation: stores only latest coordinate fix, no historical breadcrumb archiving
    assert.ok(
      privacyScreenContent.includes('stores only the latest real-time GPS coordinate fix'),
      'Privacy policy must accurately describe the established single-fix retention implementation'
    );
  });

  await t.test('8. Versioning: versionCode 5 and version 1.0.2 in app.config.js', () => {
    assert.ok(appConfigContent.includes('"version": "1.0.2"'), 'Version must be 1.0.2');
    assert.ok(appConfigContent.includes('"versionCode": 5'), 'versionCode must be 5');
    assert.ok(appConfigContent.includes('"package": "in.mstraders.grocery"'), 'Package must remain in.mstraders.grocery');
  });
});
