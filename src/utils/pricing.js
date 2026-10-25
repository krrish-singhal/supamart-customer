import { haversineKm, evaluateServiceArea, deliveryChargeForDistance } from '../config/deliveryArea';

// Delivery distance and eligibility use the same policy as the backend.
export const DELIVERY_FEE = 20;
export const DEFAULT_TAX_PERCENT = 18;
export const FREE_DELIVERY_THRESHOLD = 3000;

export { haversineKm };

export function computeBill(subtotal, discount = 0, taxPercent = DEFAULT_TAX_PERCENT, config = null, address = null) {
  const baseTotal = Math.max(subtotal - discount, 0);
  const tax = Number(((baseTotal * taxPercent) / 100).toFixed(2));
  
  const { distanceKm, withinRadius, coordinatesValid } = evaluateServiceArea(address?.lat, address?.lng);
  let deliveryFee = coordinatesValid ? deliveryChargeForDistance(distanceKm) : DELIVERY_FEE;

  if (subtotal >= (config?.freeDeliveryThreshold ?? FREE_DELIVERY_THRESHOLD)) {
    deliveryFee = 0;
  }
  
  const toPay = Number((baseTotal + tax + deliveryFee).toFixed(2));
  return { deliveryFee, tax, taxPercent, baseTotal, toPay, distanceKm, withinRadius, coordinatesValid };
}
