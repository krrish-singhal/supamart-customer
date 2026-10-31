export function isProductOffSale(product) {
  if (!product) return true;
  return product.availability === 'UNAVAILABLE';
}

export function isProductOnSale(product) {
  if (!product || product.onSale === false || product.isOnSale === false) return false;
  return product.onSale === true || product.isOnSale === true;
}

export function isProductUnavailable(product, variant = product?.variants?.[0]) {
  if (!product) return true;

  return (
    isProductOffSale(product) ||
    product.availability === 'OUT_OF_STOCK' ||
    product.availability === 'UNAVAILABLE_TODAY' ||
    product.isAvailableToday === false ||
    (variant?.availability != null && variant.availability !== 'AVAILABLE') ||
    (variant?.stock != null && Number(variant.stock) <= 0) ||
    (!variant && product.stock != null && Number(product.stock) <= 0)
  );
}

