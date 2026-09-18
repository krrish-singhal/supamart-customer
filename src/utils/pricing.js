// Mirrors the backend's actual charging rule (backend/src/services/geoService.js +
// backend/src/jobs/seed.js's config/global) so the number shown here matches order.total
// returned by POST /orders. Delivery is a flat ₹20 today (geoService.evaluateDelivery
// always returns the first delivery tier's charge, distance is not yet factored in),
// waived entirely once the cart subtotal reaches FREE_DELIVERY_THRESHOLD — keep this in
// sync with backend/src/config/constants.js's FREE_DELIVERY_THRESHOLD.
// GST defaults to 18% (config/global.taxPercent) — pass the live value from GET /config
// when you have it (CheckoutScreen does); this default is only a fallback for screens
// that don't fetch config (e.g. the cart preview).
export const DELIVERY_FEE = 20;
export const DEFAULT_TAX_PERCENT = 18;
export const FREE_DELIVERY_THRESHOLD = 2500;

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeBill(subtotal, discount = 0, taxPercent = DEFAULT_TAX_PERCENT, config = null, address = null) {
  const baseTotal = Math.max(subtotal - discount, 0);
  const tax = Number(((baseTotal * taxPercent) / 100).toFixed(2));
  
  let deliveryFee = DELIVERY_FEE;
  let distanceKm = 0;
  let withinRadius = true;

  if (config && address) {
    distanceKm = haversineKm(config.storeLat, config.storeLng, address.lat, address.lng);
    withinRadius = distanceKm <= (config.serviceRadiusKm || 5);
    
    if (withinRadius && config.deliveryTiers && config.deliveryTiers.length > 0) {
      const tiers = [...config.deliveryTiers].sort((a, b) => a.maxKm - b.maxKm);
      const tier = tiers.find(t => distanceKm <= t.maxKm);
      deliveryFee = tier ? tier.charge : (tiers[tiers.length - 1].charge || 0);
    }
  }

  if (subtotal >= FREE_DELIVERY_THRESHOLD) {
    deliveryFee = 0;
  }
  
  const toPay = Number((baseTotal + tax + deliveryFee).toFixed(2));
  return { deliveryFee, tax, taxPercent, baseTotal, toPay, distanceKm, withinRadius };
}
