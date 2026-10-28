const { haversineKm } = require('../config/deliveryArea');
const FINAL_STATUSES = ['DELIVERED', 'CANCELLED', 'REJECTED', 'PENDING_CONFIRMATION'];
function orderEstimate(order, now = Date.now(), liveRider = null) {
  if (!order || FINAL_STATUSES.includes(order.status)) return null;
  const destination = order.addressSnapshot || order.address;
  const rider = liveRider || order.partnerLocation;
  const riderLat = Number(rider?.lat ?? rider?.latitude);
  const riderLng = Number(rider?.lng ?? rider?.longitude);
  const destLat = Number(destination?.lat ?? destination?.latitude);
  const destLng = Number(destination?.lng ?? destination?.longitude);
  const hasRiderCoords = Number.isFinite(riderLat) && Number.isFinite(riderLng) && (riderLat !== 0 || riderLng !== 0);
  const hasDestCoords = Number.isFinite(destLat) && Number.isFinite(destLng);

  const riderDistance = order.status === 'OUT_FOR_DELIVERY' && hasRiderCoords && hasDestCoords && (now - (rider.updatedAt || now) < 300000 || liveRider)
    ? haversineKm(riderLat, riderLng, destLat, destLng) : null;
  if (riderDistance !== null && Number.isFinite(riderDistance)) {
    return riderDistance < 0.2 ? 'Arriving now' : `~${Math.max(2, Math.ceil(riderDistance / 20 * 60 + 3))} mins`;
  }
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
