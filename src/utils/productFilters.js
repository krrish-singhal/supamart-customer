// Shared filter/sort logic for product listing screens (CategoryScreen, ProductListScreen).
// All computed from real product data — no hardcoded price/discount facets.
export const PRICE_RANGES = [
  { key: 'lt20', label: 'Less than ₹20', test: (p) => p < 20 },
  { key: '20-50', label: '₹20 to 50', test: (p) => p >= 20 && p <= 50 },
  { key: '50-100', label: '₹50 to 100', test: (p) => p > 50 && p <= 100 },
  { key: '100-500', label: '₹100 to 500', test: (p) => p > 100 && p <= 500 },
  { key: 'gt500', label: 'More than ₹500', test: (p) => p > 500 },
];

export const DISCOUNT_RANGES = [
  { key: '0-5', label: '0% to 5%', test: (d) => d >= 0 && d <= 5 },
  { key: '5-10', label: '5% to 10%', test: (d) => d > 5 && d <= 10 },
  { key: '10-15', label: '10% to 15%', test: (d) => d > 10 && d <= 15 },
  { key: '15-20', label: '15% to 20%', test: (d) => d > 15 && d <= 20 },
  { key: '20+', label: '20% and more', test: (d) => d > 20 },
];

export const SORT_OPTIONS = [
  { key: 'popularity', label: 'Popularity' },
  { key: 'price_asc', label: 'Price - Low to High' },
  { key: 'price_desc', label: 'Price - High to Low' },
  { key: 'discount_asc', label: '% Off - Low to High' },
  { key: 'discount_desc', label: '% Off - High to Low' },
];

export function getEffectivePrice(item) {
  const v = item.variants?.[0];
  return v?.offerPrice ?? v?.price ?? 0;
}

export function getDiscountPercent(item) {
  const v = item.variants?.[0];
  if (!v?.price || v.offerPrice == null || v.offerPrice >= v.price) return 0;
  return Math.round(((v.price - v.offerPrice) / v.price) * 100);
}

export const EMPTY_FILTERS = { brandIds: [], categoryIds: [], priceKeys: [], discountKeys: [] };

export function countActiveFilters(filters) {
  if (!filters) return 0;
  return (
    (filters.brandIds?.length || 0) +
    (filters.categoryIds?.length || 0) +
    (filters.priceKeys?.length || 0) +
    (filters.discountKeys?.length || 0)
  );
}

export function applyProductFilters(products, filters) {
  if (!filters) return products;
  let result = products;
  if (filters.brandIds?.length) {
    result = result.filter((p) => p.brandId && filters.brandIds.includes(p.brandId));
  }
  if (filters.categoryIds?.length) {
    result = result.filter((p) => filters.categoryIds.includes(p.categoryId));
  }
  if (filters.priceKeys?.length) {
    const ranges = PRICE_RANGES.filter((r) => filters.priceKeys.includes(r.key));
    result = result.filter((p) => ranges.some((r) => r.test(getEffectivePrice(p))));
  }
  if (filters.discountKeys?.length) {
    const ranges = DISCOUNT_RANGES.filter((r) => filters.discountKeys.includes(r.key));
    result = result.filter((p) => ranges.some((r) => r.test(getDiscountPercent(p))));
  }
  return result;
}

export function sortProducts(products, sortKey) {
  const arr = [...products];
  switch (sortKey) {
    case 'price_asc':
      return arr.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    case 'price_desc':
      return arr.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
    case 'discount_asc':
      return arr.sort((a, b) => getDiscountPercent(a) - getDiscountPercent(b));
    case 'discount_desc':
      return arr.sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a));
    case 'popularity':
    default:
      return arr.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
  }
}
