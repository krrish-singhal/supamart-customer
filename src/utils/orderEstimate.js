const { haversineKm } = require('../config/deliveryArea');
const FINAL_STATUSES = ['DELIVERED', 'CANCELLED', 'REJECTED', 'PENDING_CONFIRMATION'];
function orderEstimate(order, now = Date.now()) {
  if (!order || FINAL_STATUSES.includes(order.status)) return null;
  const destination = order.addressSnapshot;
  const rider = order.partnerLocation;
  const riderDistance = order.status === 'OUT_FOR_DELIVERY' && rider && now - rider.updatedAt < 120000
    ? haversineKm(rider.lat, rider.lng, destination?.lat, destination?.lng) : null;
  if (riderDistance !== null) return riderDistance < 0.2 ? 'Arriving now' : `~${Math.max(2, Math.ceil(riderDistance / 20 * 60 + 3))} mins`;
  if (Number.isFinite(order.estimatedDeliveryAt)) {
    const remaining = Math.ceil((order.estimatedDeliveryAt - now) / 60000);
    return remaining > 0 ? `~${remaining} mins` : 'Updating arrival time';
  }
  // Older orders have no saved estimate. Derive it from their distance and creation time.
  if (Number.isFinite(order.distanceKm) && Number.isFinite(order.createdAt)) {
    const remaining = Math.ceil(15 + order.distanceKm / 20 * 60 - (now - order.createdAt) / 60000);
    return remaining > 0 ? `~${remaining} mins` : 'Updating arrival time';
  }
  return 'Awaiting delivery estimate';
}
module.exports = { orderEstimate, FINAL_STATUSES };
