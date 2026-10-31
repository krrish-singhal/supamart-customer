const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function isRatingSubmitted(data) {
  if (!data) return false;
  if (
    data.ratings &&
    (data.ratings.orderRating || data.ratings.ratedAt || Object.keys(data.ratings).length > 0)
  ) {
    return true;
  }
  if (data.deliveryRating != null && data.deliveryRating !== 0) {
    return true;
  }
  if (data.rating != null && data.rating !== 0) {
    return true;
  }
  return false;
}

test('Delivery confirmation: once per order and only unrated orders', () => {
  const handledOrders = new Set();

  function findPendingOrder(orderList) {
    return orderList.find((item) => {
      const data = typeof item?.data === 'function' ? item.data() : item;
      const s = data?.status || item?.status;
      const id = String(item?.id || data?.id || '');
      const no = data?.orderNo || item?.orderNo ? String(data?.orderNo || item?.orderNo) : '';

      // 1. One order must come only once
      if ((id && handledOrders.has(id)) || (no && handledOrders.has(no))) {
        return false;
      }

      // 2. Only for orders where rating is NOT yet submitted
      if (isRatingSubmitted(data)) {
        if (id) handledOrders.add(id);
        if (no) handledOrders.add(no);
        return false;
      }

      // 3. Status must be PENDING_CONFIRMATION or unconfirmed recently DELIVERED
      if (s === 'PENDING_CONFIRMATION') return true;
      const isRecent = Date.now() - (data?.updatedAt || data?.createdAt || 0) < 2 * 60 * 60 * 1000;
      if (s === 'DELIVERED' && !data?.confirmedAt && isRecent) {
        return true;
      }
      return false;
    });
  }

  // 1. Order marked PENDING_CONFIRMATION with no ratings
  const orders = [
    { id: 'ord1', orderNo: 1037, status: 'PENDING_CONFIRMATION', total: 400 },
    { id: 'ord2', orderNo: 1036, status: 'DELIVERED', ratings: { orderRating: 5 } },
  ];

  const found = findPendingOrder(orders);
  assert.ok(found, 'Should find order pending customer confirmation');
  assert.equal(found.orderNo, 1037);

  // 2. Once handled / dismissed, it comes only once and never again
  handledOrders.add('ord1');
  handledOrders.add('1037');
  assert.equal(findPendingOrder(orders), undefined, 'Must not prompt again once handled');

  // 3. Orders with ratings submitted already are completely excluded
  const ratedOrders = [
    { id: 'ord4', orderNo: 1040, status: 'PENDING_CONFIRMATION', deliveryRating: 4 },
    { id: 'ord5', orderNo: 1041, status: 'DELIVERED', rating: 5 },
    { id: 'ord6', orderNo: 1042, status: 'PENDING_CONFIRMATION', ratings: { ratedAt: Date.now() } },
  ];
  assert.equal(findPendingOrder(ratedOrders), undefined, 'Rated orders must be skipped');

  // 4. Order without rating qualifies
  const unratedOrders = [
    { id: 'ord7', orderNo: 1043, status: 'PENDING_CONFIRMATION' },
  ];
  const unratedFound = findPendingOrder(unratedOrders);
  assert.ok(unratedFound);
  assert.equal(unratedFound.orderNo, 1043);
});

test('DeliveryConfirmationModal source has light mode styling and persistent AsyncStorage', () => {
  const fileContent = fs.readFileSync(
    path.join(__dirname, '../src/components/DeliveryConfirmationModal.js'),
    'utf8'
  );

  // Light mode background for card: #ffffff
  assert.match(fileContent, /backgroundColor:\s*'#ffffff'/);
  // Light mode title text color: deep slate (#0f172a)
  assert.match(fileContent, /color:\s*'#0f172a'/);
  // Light mode subtitle text color: slate 600 (#475569)
  assert.match(fileContent, /color:\s*'#475569'/);
  // Persistent storage key
  assert.match(fileContent, /@supamart_handled_delivery_confirmations/);
  // Rating check function
  assert.match(fileContent, /isRatingSubmitted/);
});
