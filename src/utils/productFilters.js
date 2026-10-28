// Shared filter/sort logic for product listing screens (CategoryScreen, ProductListScreen).
export const PRICE_OPTIONS = [
  { key: 'under_100', label: 'Under ₹100', test: (p) => p < 100 },
  { key: '100_300', label: '₹100 to ₹300', test: (p) => p >= 100 && p <= 300 },
  { key: '300_500', label: '₹300 to ₹500', test: (p) => p > 300 && p <= 500 },
  { key: 'above_500', label: 'Above ₹500', test: (p) => p > 500 },
];

export const PACK_SIZE_OPTIONS = [
  { key: '250g', label: '250 g', regex: /(250\s*(g|gm|gram|ml))/i },
  { key: '500g', label: '500 g', regex: /(500\s*(g|gm|gram|ml))/i },
  { key: '1kg', label: '1 kg', regex: /(1\s*(kg|kilo|l|lt|ltr|liter|litre)|1000\s*(g|gm|ml))/i },
  { key: '2kg', label: '2 kg', regex: /(2\s*(kg|kilo|l|lt|ltr|liter|litre)|2000\s*(g|gm|ml))/i },
  { key: '5kg', label: '5 kg', regex: /(5\s*(kg|kilo|l|lt|ltr|liter|litre)|5000\s*(g|gm|ml))/i },
  { key: '10kg', label: '10 kg', regex: /(10\s*(kg|kilo)|10000\s*(g|gm))/i },
];

export const DISCOUNT_OPTIONS = [
  { key: '10plus', label: '10% or more', min: 10 },
  { key: '20plus', label: '20% or more', min: 20 },
  { key: '30plus', label: '30% or more', min: 30 },
  { key: '40plus', label: '40% or more', min: 40 },
];

// Legacy range mapping support
export const PRICE_RANGES = [
  { key: 'lt20', label: 'Less than ₹20', test: (p) => p < 20 },
  { key: '20-50', label: '₹20 to 50', test: (p) => p >= 20 && p <= 50 },
  { key: '50-100', label: '₹50 to 100', test: (p) => p > 50 && p <= 100 },
  { key: '100-500', label: '₹100 to 500', test: (p) => p > 100 && p <= 500 },
  { key: 'gt500', label: 'More than ₹500', test: (p) => p > 500 },
  ...PRICE_OPTIONS,
];

export const DISCOUNT_RANGES = [
  { key: '0-5', label: '0% to 5%', test: (d) => d >= 0 && d <= 5 },
  { key: '5-10', label: '5% to 10%', test: (d) => d > 5 && d <= 10 },
  { key: '10-15', label: '10% to 15%', test: (d) => d > 10 && d <= 15 },
  { key: '15-20', label: '15% to 20%', test: (d) => d > 15 && d <= 20 },
  { key: '20+', label: '20% and more', test: (d) => d > 20 },
];

export const SORT_OPTIONS = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'popularity', label: 'Popularity' },
  { key: 'price_asc', label: 'Price: low to high' },
  { key: 'price_desc', label: 'Price: high to low' },
  { key: 'discount', label: 'Discount: high to low' },
  { key: 'discount_desc', label: '% Off - High to Low' },
  { key: 'discount_asc', label: '% Off - Low to High' },
  { key: 'newest', label: 'Newest' },
];

export function getEffectivePrice(item) {
  if (item?.variants && item.variants.length > 0) {
    let minPrice = Infinity;
    for (const v of item.variants) {
      const pr = v?.offerPrice ?? v?.price;
      if (pr != null && pr > 0 && pr < minPrice) minPrice = pr;
    }
    if (minPrice !== Infinity) return minPrice;
  }
  return item?.offerPrice ?? item?.price ?? 0;
}

export function getDiscountPercent(item) {
  let maxDisc = 0;
  if (item?.variants && item.variants.length > 0) {
    for (const v of item.variants) {
      const price = v?.price;
      const offerPrice = v?.offerPrice;
      if (price && offerPrice != null && offerPrice < price) {
        const disc = Math.round(((price - offerPrice) / price) * 100);
        if (disc > maxDisc) maxDisc = disc;
      }
    }
    if (maxDisc > 0) return maxDisc;
  }
  const price = item?.price ?? 0;
  const offerPrice = item?.offerPrice;
  if (!price || offerPrice == null || offerPrice >= price) return 0;
  return Math.round(((price - offerPrice) / price) * 100);
}

export const EMPTY_FILTERS = {
  prices: [],
  priceKeys: [],
  packSizes: [],
  discounts: [],
  discountKeys: [],
  types: [],
  categoryIds: [],
  brandIds: [],
};

export function countActiveFilters(filters) {
  if (!filters) return 0;
  const pCount = Math.max(filters.prices?.length || 0, filters.priceKeys?.length || 0);
  const dCount = Math.max(filters.discounts?.length || 0, filters.discountKeys?.length || 0);
  const psCount = filters.packSizes?.length || 0;
  const cCount = Math.max(filters.categoryIds?.length || 0, filters.types?.length || 0);
  const bCount = filters.brandIds?.length || 0;
  const sCount = filters.sort && filters.sort !== 'relevance' && filters.sort !== 'popularity' ? 1 : 0;
  return pCount + dCount + psCount + cCount + bCount + sCount;
}

export function applyProductFilters(products, filters) {
  if (!filters || !Array.isArray(products)) return products || [];
  let result = products;

  // 1. Brands
  if (filters.brandIds?.length) {
    result = result.filter((p) => p.brandId && filters.brandIds.includes(p.brandId));
  }

  // 2. Categories / Subcategories / Types
  const targetCategoryIds = filters.categoryIds?.length ? filters.categoryIds : filters.types;
  if (targetCategoryIds?.length) {
    result = result.filter((p) => {
      if (p.categoryId && targetCategoryIds.includes(p.categoryId)) return true;
      // Match by keyword in name if string alias is passed
      const nameLower = (p.name || '').toLowerCase();
      const catLower = (p.categoryName || p.category || '').toLowerCase();
      return targetCategoryIds.some((t) => {
        const tLower = t.toLowerCase();
        return nameLower.includes(tLower) || catLower.includes(tLower);
      });
    });
  }

  // 3. Prices
  const priceKeys = filters.prices?.length ? filters.prices : filters.priceKeys;
  if (priceKeys?.length) {
    result = result.filter((p) => {
      const price = getEffectivePrice(p);
      return priceKeys.some((key) => {
        if (key === 'under_100') return price < 100;
        if (key === '100_300') return price >= 100 && price <= 300;
        if (key === '300_500') return price > 300 && price <= 500;
        if (key === 'above_500') return price > 500;
        const legacy = PRICE_RANGES.find((r) => r.key === key);
        return legacy ? legacy.test(price) : false;
      });
    });
  }

  // 4. Discounts
  const discountKeys = filters.discounts?.length ? filters.discounts : filters.discountKeys;
  if (discountKeys?.length) {
    result = result.filter((p) => {
      const disc = getDiscountPercent(p);
      return discountKeys.some((key) => {
        if (key === '10plus') return disc >= 10;
        if (key === '20plus') return disc >= 20;
        if (key === '30plus') return disc >= 30;
        if (key === '40plus') return disc >= 40;
        const legacy = DISCOUNT_RANGES.find((r) => r.key === key);
        return legacy ? legacy.test(disc) : false;
      });
    });
  }

  // 5. Pack Sizes
  if (filters.packSizes?.length) {
    result = result.filter((p) => {
      const allVariantLabels = (p.variants || []).map((v) => v?.label || '').join(' ');
      const textToTest = `${allVariantLabels} ${p.unit || ''} ${p.name || ''}`.toLowerCase();
      return filters.packSizes.some((key) => {
        const opt = PACK_SIZE_OPTIONS.find((o) => o.key === key);
        return opt ? opt.regex.test(textToTest) : false;
      });
    });
  }

  return result;
}

export function getProductTimestamp(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val?.toMillis === 'function') return val.toMillis();
  if (typeof val?.toDate === 'function') return val.toDate().getTime();
  if (typeof val?.seconds === 'number') return val.seconds * 1000 + (val.nanoseconds || 0) / 1e6;
  if (typeof val?._seconds === 'number') return val._seconds * 1000 + (val._nanoseconds || 0) / 1e6;
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

export function compareProductsDeterministic(a, b) {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  // 1. Explicit display order (if configured)
  const orderA = a.order != null ? Number(a.order) : null;
  const orderB = b.order != null ? Number(b.order) : null;
  if (orderA !== null && orderB !== null && orderA !== orderB) {
    return orderA - orderB;
  }
  if (orderA !== null) return -1;
  if (orderB !== null) return 1;

  // 2. Primary: Creation timestamp (newest first)
  const timeA = getProductTimestamp(a.createdAt);
  const timeB = getProductTimestamp(b.createdAt);
  if (timeB !== timeA) {
    return timeB - timeA;
  }

  // 3. Fallback: Stable tie-breaker by document ID descending
  // (matches Firestore's internal __name__ desc tie-breaker when ordering by createdAt desc)
  const idComp = String(b.id || '').localeCompare(String(a.id || ''));
  if (idComp !== 0) return idComp;

  // 4. Stable tie-breaker by name
  return String(a.name || '').localeCompare(String(b.name || ''));
}

export function sortProducts(products, sortKey) {
  if (!Array.isArray(products)) return [];
  const arr = [...products];
  switch (sortKey) {
    case 'price_asc':
      return arr.sort((a, b) => {
        const diff = getEffectivePrice(a) - getEffectivePrice(b);
        return diff !== 0 ? diff : compareProductsDeterministic(a, b);
      });
    case 'price_desc':
      return arr.sort((a, b) => {
        const diff = getEffectivePrice(b) - getEffectivePrice(a);
        return diff !== 0 ? diff : compareProductsDeterministic(a, b);
      });
    case 'discount':
    case 'discount_desc':
      return arr.sort((a, b) => {
        const diff = getDiscountPercent(b) - getDiscountPercent(a);
        return diff !== 0 ? diff : compareProductsDeterministic(a, b);
      });
    case 'discount_asc':
      return arr.sort((a, b) => {
        const diff = getDiscountPercent(a) - getDiscountPercent(b);
        return diff !== 0 ? diff : compareProductsDeterministic(a, b);
      });
    case 'newest':
      return arr.sort(compareProductsDeterministic);
    case 'popularity':
      return arr.sort((a, b) => {
        const diff = (b.soldCount || 0) - (a.soldCount || 0);
        return diff !== 0 ? diff : compareProductsDeterministic(a, b);
      });
    case 'relevance':
    default:
      return arr.sort(compareProductsDeterministic);
  }
}

