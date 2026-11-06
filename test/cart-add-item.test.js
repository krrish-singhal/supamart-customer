import test from 'node:test';
import assert from 'node:assert/strict';
import { isProductUnavailable, isProductOffSale, isProductOnSale } from '../src/utils/productAvailability.js';

test('isProductUnavailable accurately checks availability and variant stock', () => {
  // Product with available variant
  const productWithStock = {
    id: 'prod-1',
    name: 'Organic Milk',
    availability: 'AVAILABLE',
    isAvailableToday: true,
    variants: [
      { id: 'v1', label: '1L', stock: 10, availability: 'AVAILABLE' }
    ]
  };

  assert.equal(isProductUnavailable(productWithStock), false);
  assert.equal(isProductUnavailable(productWithStock, productWithStock.variants[0]), false);

  // Variant out of stock
  const productOutOfStock = {
    id: 'prod-2',
    name: 'Butter',
    availability: 'AVAILABLE',
    variants: [
      { id: 'v2', label: '500g', stock: 0, availability: 'AVAILABLE' }
    ]
  };

  assert.equal(isProductUnavailable(productOutOfStock), true);

  // Product marked UNAVAILABLE
  const unavailableProduct = {
    id: 'prod-3',
    name: 'Bread',
    availability: 'UNAVAILABLE',
    variants: [
      { id: 'v3', label: 'White', stock: 20 }
    ]
  };

  assert.equal(isProductUnavailable(unavailableProduct), true);

  // Multi-variant product where first variant has 0 stock but second variant has stock
  const multiVariantProduct = {
    id: 'prod-4',
    name: 'Apples',
    availability: 'AVAILABLE',
    variants: [
      { id: 'v-small', stock: 0 },
      { id: 'v-large', stock: 15 }
    ]
  };

  assert.equal(isProductUnavailable(multiVariantProduct, multiVariantProduct.variants[0]), true);
  assert.equal(isProductUnavailable(multiVariantProduct, multiVariantProduct.variants[1]), false);
  // Default variant check detects that at least one variant is available in store
  assert.equal(isProductUnavailable(multiVariantProduct, multiVariantProduct.variants[1]), false);
});
