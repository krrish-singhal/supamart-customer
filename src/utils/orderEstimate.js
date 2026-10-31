const { haversineKm } = require('../config/deliveryArea');
const FINAL_STATUSES = [
  'DELIVERED',
  'CANCELLED',
  'REJECTED',
  'PENDING_CONFIRMATION',
  'DELIVERY_DISPUTED',
  'REFUNDED',
  'RETURNED',
  'PAYMENT_FAILED',
];

const ACTIVE_ORDER_STATUSES = [
  'PLACED',
  'ORDER_PLACED',
  'ACCEPTED',
  'ORDER_ACCEPTED',
  'OUT_FOR_DELIVERY',
  'DISPATCHED',
];

function orderEstimate(order, now = Date.now(), liveRider = null) {
  if (!order || !ACTIVE_ORDER_STATUSES.includes(order.status) || FINAL_STATUSES.includes(order.status)) return null;
  const destination = order.addressSnapshot || order.address;
  const rider = liveRider || order.partnerLocation;
  const riderLat = Number(rider?.lat ?? rider?.latitude);
  const riderLng = Number(rider?.lng ?? rider?.longitude);
  const destLat = Number(destination?.lat ?? destination?.latitude);
  const destLng = Number(destination?.lng ?? destination?.longitude);
  const hasRiderCoords = Number.isFinite(riderLat) && Number.isFinite(riderLng) && (riderLat !== 0 || riderLng !== 0);
  const hasDestCoords = Number.isFinite(destLat) && Number.isFinite(destLng) && (destLat !== 0 || destLng !== 0);

  const riderUpdatedAt = Number(rider?.updatedAt) || 0;
  const riderDistance = order.status === 'OUT_FOR_DELIVERY' && hasRiderCoords && hasDestCoords && riderUpdatedAt > 0 && now - riderUpdatedAt < 300000
    ? haversineKm(riderLat, riderLng, destLat, destLng) : null;
  if (riderDistance !== null && Number.isFinite(riderDistance) && riderDistance <= 25) {
    if (riderDistance < 0.2) return 'Arriving now';
  }
  const hasPartner = Boolean(
    order.assignedPartnerId ||
    order.deliveryBoyId ||
    order.deliveryPartner?.id ||
    order.deliveryBoyName ||
    order.deliveryPartner?.name ||
    liveRider
  );

  if (order.status === 'OUT_FOR_DELIVERY' && (!hasPartner || order.deliveryAcceptanceStatus === 'REJECTED')) {
    return 'Assigning partner';
  }

  // Delivery countdown is shown when OUT_FOR_DELIVERY or when explicit estimatedDeliveryAt is given.
  if (order.status !== 'OUT_FOR_DELIVERY' && !Number.isFinite(order.estimatedDeliveryAt)) {
    return hasPartner ? 'Partner Assigned' : 'Assigning partner';
  }

  if (Number.isFinite(order.estimatedDeliveryAt)) {
    // If outForDeliveryAt exists, calculate stable monotonic elapsed minutes
    if (order.outForDeliveryAt && order.estimatedDeliveryAt > order.outForDeliveryAt) {
      const totalMinutes = Math.round((order.estimatedDeliveryAt - order.outForDeliveryAt) / 60000);
      const elapsedMinutes = Math.floor(Math.max(0, now - order.outForDeliveryAt) / 60000);
      const remaining = Math.max(1, totalMinutes - elapsedMinutes);
      if (remaining <= 180) return `~${remaining} mins`;
    }
    const remaining = Math.max(1, Math.round((order.estimatedDeliveryAt - now) / 60000));
    if (remaining <= 180) {
      if (order.estimatedDeliveryAt < now) return 'Updating arrival time';
      return `~${remaining} mins`;
    }
  }
  return 'Updating arrival time';
}
module.exports = { orderEstimate, FINAL_STATUSES, ACTIVE_ORDER_STATUSES };
