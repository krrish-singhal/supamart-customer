const test = require('node:test');
const assert = require('node:assert/strict');
const { orderEstimate } = require('../src/utils/orderEstimate');

test('Order tracking partner assignment and ETA calculation', async (t) => {
  await t.test('shows Partner Assigned when partner is assigned before out for delivery', () => {
    const orderWithPartner = {
      status: 'ORDER_ACCEPTED',
      assignedPartnerId: 'partner-123',
      deliveryBoyName: 'Rahul Kumar',
    };
    assert.equal(orderEstimate(orderWithPartner), 'Partner Assigned');

    const orderPacking = {
      status: 'ACCEPTED',
      deliveryPartner: { id: 'p1', name: 'Suresh' },
    };
    assert.equal(orderEstimate(orderPacking), 'Partner Assigned');
  });

  await t.test('shows Assigning partner when no partner is assigned yet', () => {
    const orderNoPartner = {
      status: 'ORDER_ACCEPTED',
      assignedPartnerId: null,
      deliveryBoyName: null,
    };
    assert.equal(orderEstimate(orderNoPartner), 'Assigning partner');
  });

  await t.test('ETA does NOT jump between 9 and 8 mins within 5 seconds when out for delivery', () => {
    const now = 1700000000000;
    const durationMinutes = 8;
    const order = {
      status: 'OUT_FOR_DELIVERY',
      assignedPartnerId: 'partner-1',
      deliveryBoyName: 'Rahul',
      outForDeliveryAt: now,
      estimatedDeliveryAt: now + (durationMinutes * 60000),
    };

    // At t = 0s: exactly 8 mins
    assert.equal(orderEstimate(order, now), '~8 mins');

    // At t = 5s: MUST STILL BE ~8 mins (no flip/jump!)
    assert.equal(orderEstimate(order, now + 5000), '~8 mins');

    // At t = 15s: still ~8 mins
    assert.equal(orderEstimate(order, now + 15000), '~8 mins');

    // At t = 45s: still ~8 mins
    assert.equal(orderEstimate(order, now + 45000), '~8 mins');

    // At t = 60s (after 1 full minute): counts down to ~7 mins
    assert.equal(orderEstimate(order, now + 60000), '~7 mins');

    // At t = 120s: counts down to ~6 mins
    assert.equal(orderEstimate(order, now + 120000), '~6 mins');
  });

  await t.test('shows Arriving now when rider is within 200m of destination', () => {
    const now = 1700000000000;
    const order = {
      status: 'OUT_FOR_DELIVERY',
      assignedPartnerId: 'partner-1',
      addressSnapshot: { lat: 8.5636, lng: 76.8602 },
      partnerLocation: { lat: 8.5637, lng: 76.8603, updatedAt: now },
      estimatedDeliveryAt: now + 5 * 60000,
      outForDeliveryAt: now - 3 * 60000,
    };
    assert.equal(orderEstimate(order, now), 'Arriving now');
  });
});
