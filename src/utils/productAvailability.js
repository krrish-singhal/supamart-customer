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

  if (
    isProductOffSale(product) ||
    product.availability === 'OUT_OF_STOCK' ||
    product.availability === 'UNAVAILABLE' ||
    product.availability === 'UNAVAILABLE_TODAY' ||
    product.isAvailableToday === false
  ) {
    return true;
  }

  const activeVariant = variant || product?.variants?.[0];
  if (activeVariant) {
    if (activeVariant.availability != null && activeVariant.availability !== 'AVAILABLE') return true;
    if (activeVariant.stock != null && Number(activeVariant.stock) <= 0) return true;
  }

  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  if (!hasVariants) {
    if (product.stock != null && Number(product.stock) <= 0) return true;
    if (product.stockQuantity != null && Number(product.stockQuantity) <= 0) return true;
  } else {
    const hasAnyStock = product.variants.some((v) => {
      if (v.availability && v.availability !== 'AVAILABLE') return false;
      if (v.stock != null && Number(v.stock) <= 0) return false;
      return true;
    });
    if (!hasAnyStock) return true;
  }

  return false;
}


