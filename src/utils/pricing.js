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

export function computeBill(subtotal, discount = 0, taxPercent = DEFAULT_TAX_PERCENT) {
  const baseTotal = Math.max(subtotal - discount, 0);
  const tax = Number(((baseTotal * taxPercent) / 100).toFixed(2));
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const toPay = Number((baseTotal + tax + deliveryFee).toFixed(2));
  return { deliveryFee, tax, taxPercent, baseTotal, toPay };
}
