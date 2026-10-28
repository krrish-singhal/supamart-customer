import { haversineKm, evaluateServiceArea, deliveryChargeForDistance } from '../config/deliveryArea';

// Delivery distance and eligibility use the same policy as the backend.
export const DELIVERY_FEE = 20;
export const DEFAULT_TAX_PERCENT = 18;
export const FREE_DELIVERY_THRESHOLD = 3000;

export { haversineKm };

export function computeBill(subtotal, discount = 0, taxPercent = DEFAULT_TAX_PERCENT, config = null, address = null) {
  const tax = Number(((subtotal * taxPercent) / 100).toFixed(2));
  
  const { distanceKm, withinRadius, coordinatesValid } = evaluateServiceArea(address?.lat, address?.lng);
  let normalDeliveryFee = (coordinatesValid && withinRadius) ? deliveryChargeForDistance(distanceKm) : DELIVERY_FEE;
  if (!normalDeliveryFee || normalDeliveryFee <= 0) {
    normalDeliveryFee = DELIVERY_FEE;
  }

  const threshold = config?.freeDeliveryThreshold ?? FREE_DELIVERY_THRESHOLD;
  const isFreeDelivery = subtotal > 0 && subtotal >= threshold;
  const deliveryFee = isFreeDelivery ? 0 : normalDeliveryFee;
  
  // From the total reduce the coupon amount; no need to adjust GST
  const toPay = Number(Math.max(0, subtotal + tax + deliveryFee - discount).toFixed(2));
  const baseTotal = subtotal;
  return { deliveryFee, tax, taxPercent, baseTotal, toPay, distanceKm, withinRadius, coordinatesValid, isFreeDelivery, threshold };
}
