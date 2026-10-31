const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Delivery portal responsiveness and 1-click operation assertions', () => {
  const ordersScreenContent = fs.readFileSync(
    path.join(__dirname, '../src/screens/DeliveryOrdersScreen.js'),
    'utf8'
  );
  const mapScreenContent = fs.readFileSync(
    path.join(__dirname, '../src/screens/DeliveryMapScreen.js'),
    'utf8'
  );

  // 1. handleViewAndDeliver must NOT await handleUpdateLocation (must be non-blocking in background)
  assert.match(
    ordersScreenContent,
    /const handleViewAndDeliver = \([^)]*\) => \{[\s\S]*?handleUpdateLocation\(true\)\.catch/,
    'handleViewAndDeliver must not block navigation by awaiting location sync'
  );

  // 2. Order card root must be a Pressable so delivery partner can tap anywhere on the card
  assert.match(
    ordersScreenContent,
    /<Pressable[\s\S]*?onPress=\{\(\)\s*=>\s*handleViewAndDeliver\(item\)\}/,
    'Order card must be a Pressable wrapping the whole card'
  );

  // 3. Optimistic UI update in handleAcceptIncomingOrder and handleRejectIncomingOrder
  assert.match(
    ordersScreenContent,
    /setIncomingOrder\(null\);[\s\S]*?setOrders\(/,
    'handleAcceptIncomingOrder must optimistically update local state immediately'
  );

  // 4. DeliveryMapScreen handlePickUp must be an instant 1-tap operation without blocking confirmation popup
  assert.match(
    mapScreenContent,
    /const handlePickUp = \(\) => \{\s*updateOrderStatus\('OUT_FOR_DELIVERY'/,
    'handlePickUp must directly start delivery without intermediate dialogs'
  );

  // 5. updateOrderStatus must optimistically update order state immediately
  assert.match(
    mapScreenContent,
    /setOrder\(\(prev\)\s*=>\s*\(\{\s*\.\.\.prev,\s*status:\s*newStatus\s*\}\)\)/,
    'updateOrderStatus must optimistically update status immediately'
  );

  // 6. DeliveryMapScreen must automatically navigate back without forcing driver to dismiss a success alert modal
  assert.match(
    mapScreenContent,
    /handleGoBack\(\)/,
    'handleGoBack must be called automatically upon delivery confirmation'
  );
});
