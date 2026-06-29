import { DEMO_USER } from './demoConfig';

// ─── Static demo data ─────────────────────────────────────────────────────────

export const DEMO_CONFIG = {
  storeName: 'SupaMart',
  serviceRadiusKm: 5,
  minOrderValue: 99,
  deliveryFee: 0,
  slots: [
    { id: 'slot-1', label: 'Morning  7 AM – 9 AM',     from: '07:00', to: '09:00', active: true },
    { id: 'slot-2', label: 'Afternoon  12 PM – 2 PM',  from: '12:00', to: '14:00', active: true },
    { id: 'slot-3', label: 'Evening  5 PM – 7 PM',     from: '17:00', to: '19:00', active: true },
  ],
};

export const DEMO_BANNERS = [
  {
    id: 'b1',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
    target: 'cat-fruits',
  },
  {
    id: 'b2',
    image: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=800&q=80',
    target: 'cat-dairy',
  },
];

export const DEMO_CATEGORIES = [
  { id: 'cat-veg',   name: 'Vegetables',   image: null, emoji: '🥦' },
  { id: 'cat-fruits',name: 'Fruits',        image: null, emoji: '🍎' },
  { id: 'cat-dairy', name: 'Dairy',         image: null, emoji: '🥛' },
  { id: 'cat-snacks',name: 'Snacks',        image: null, emoji: '🍿' },
  { id: 'cat-bev',   name: 'Beverages',     image: null, emoji: '🥤' },
  { id: 'cat-groc',  name: 'Groceries',     image: null, emoji: '🛒' },
  { id: 'cat-house', name: 'Household',     image: null, emoji: '🏠' },
  { id: 'cat-frozen',name: 'Frozen Foods',  image: null, emoji: '🧊' },
];

export const DEMO_PRODUCTS = [
  {
    id: 'p1', name: 'Farm Fresh Tomatoes', categoryId: 'cat-veg',
    image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400&q=80',
    isFeatured: true,
    variants: [
      { id: 'v1', label: '500 g', price: 35, mrp: 45, stock: 50 },
      { id: 'v2', label: '1 kg', price: 65, mrp: 85, stock: 30 },
    ],
  },
  {
    id: 'p2', name: 'Amul Toned Milk', categoryId: 'cat-dairy',
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=80',
    isFeatured: true,
    variants: [
      { id: 'v3', label: '500 ml', price: 27, mrp: 30, stock: 100 },
      { id: 'v4', label: '1 L', price: 54, mrp: 60, stock: 80 },
    ],
  },
  {
    id: 'p3', name: 'Lay\'s Classic Salted', categoryId: 'cat-snacks',
    image: 'https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=400&q=80',
    isFeatured: true,
    variants: [
      { id: 'v5', label: '26 g', price: 20, mrp: 20, stock: 200 },
      { id: 'v6', label: '55 g', price: 40, mrp: 40, stock: 150 },
    ],
  },
  {
    id: 'p4', name: 'Bananas (Robusta)', categoryId: 'cat-fruits',
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=80',
    isFeatured: true,
    variants: [
      { id: 'v7', label: '6 pcs', price: 45, mrp: 55, stock: 40 },
      { id: 'v8', label: '12 pcs', price: 85, mrp: 100, stock: 25 },
    ],
  },
  {
    id: 'p5', name: 'Bisleri Water Bottle', categoryId: 'cat-bev',
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=80',
    isFeatured: false,
    variants: [
      { id: 'v9',  label: '500 ml', price: 20, mrp: 20, stock: 200 },
      { id: 'v10', label: '1 L',    price: 35, mrp: 35, stock: 120 },
    ],
  },
  {
    id: 'p6', name: 'Britannia Good Day', categoryId: 'cat-snacks',
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=80',
    isFeatured: false,
    variants: [
      { id: 'v11', label: '100 g', price: 30, mrp: 35, stock: 80 },
    ],
  },
];

export const DEMO_ADDRESSES = [
  {
    id: 'addr-1',
    label: 'Home',
    houseNo: 'Flat 402, Block B',
    street: 'MG Road, Koramangala',
    landmark: 'Near City Park',
    pincode: '560034',
    lat: 12.9352,
    lng: 77.6245,
    isDefault: true,
  },
  {
    id: 'addr-2',
    label: 'Work',
    companyName: 'Infosys Limited',
    building: 'Electronics City Phase 1',
    floor: '3rd Floor',
    landmark: 'Opposite KFC',
    pincode: '560100',
    lat: 12.8456,
    lng: 77.6603,
    isDefault: false,
  },
];

export const DEMO_CART = {
  items: [
    { productId: 'p1', variantId: 'v1', name: 'Farm Fresh Tomatoes', variantLabel: '500 g', price: 35, qty: 2 },
    { productId: 'p2', variantId: 'v4', name: 'Amul Toned Milk',     variantLabel: '1 L',   price: 54, qty: 1 },
  ],
  subtotal: 124,
  deliveryFee: 0,
  total: 124,
};

export const DEMO_ORDERS = [
  {
    id: 'order-demo-001',
    orderNo: 'ORD-20240101',
    status: 'DELIVERED',
    items: [
      { name: 'Farm Fresh Tomatoes', variantLabel: '500 g', qty: 2, price: 35 },
      { name: 'Amul Toned Milk',     variantLabel: '1 L',   qty: 1, price: 54 },
    ],
    addressSnapshot: DEMO_ADDRESSES[0],
    slot: { label: 'Morning  7 AM – 9 AM' },
    paymentMethod: 'COD',
    paymentStatus: 'PAID',
    total: 124,
    statusHistory: [
      { status: 'ORDER_PLACED',   at: Date.now() - 3600000 * 5 },
      { status: 'ORDER_ACCEPTED', at: Date.now() - 3600000 * 4 },
      { status: 'PACKING',        at: Date.now() - 3600000 * 3 },
      { status: 'DELIVERED',      at: Date.now() - 3600000 * 1 },
    ],
  },
  {
    id: 'order-demo-002',
    orderNo: 'ORD-20240102',
    status: 'OUT_FOR_DELIVERY',
    items: [
      { name: 'Bananas (Robusta)',    variantLabel: '6 pcs', qty: 1, price: 45 },
      { name: 'Britannia Good Day',  variantLabel: '100 g', qty: 2, price: 30 },
    ],
    addressSnapshot: DEMO_ADDRESSES[0],
    slot: { label: 'Evening  5 PM – 7 PM' },
    paymentMethod: 'ONLINE',
    paymentStatus: 'PAID',
    total: 105,
    statusHistory: [
      { status: 'ORDER_PLACED',       at: Date.now() - 3600000 * 2 },
      { status: 'ORDER_ACCEPTED',     at: Date.now() - 3600000 * 1.5 },
      { status: 'OUT_FOR_DELIVERY',   at: Date.now() - 3600000 * 0.5 },
    ],
  },
];

// ─── Axios adapter ─────────────────────────────────────────────────────────────

function ok(config, data) {
  return Promise.resolve({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    request: {},
  });
}

let _cart = { ...DEMO_CART, items: [...DEMO_CART.items] };

export function demoAdapter(config) {
  const url = config.url || '';
  const method = (config.method || 'get').toUpperCase();

  // GET /config
  if (url.includes('/config') && method === 'GET') {
    return ok(config, DEMO_CONFIG);
  }

  // GET /banners
  if (url.includes('/banners') && method === 'GET') {
    return ok(config, { items: DEMO_BANNERS });
  }

  // GET /categories
  if (url.includes('/categories') && method === 'GET') {
    return ok(config, { items: DEMO_CATEGORIES });
  }

  // GET /products/:id
  if (/\/products\/[^/]+$/.test(url) && method === 'GET') {
    const id = url.split('/').pop();
    const product = DEMO_PRODUCTS.find((p) => p.id === id) || DEMO_PRODUCTS[0];
    return ok(config, product);
  }

  // GET /products
  if (url.includes('/products') && method === 'GET') {
    const params = config.params || {};
    let items = DEMO_PRODUCTS;
    if (params.featured === 'true') items = items.filter((p) => p.isFeatured);
    if (params.categoryId) items = items.filter((p) => p.categoryId === params.categoryId);
    if (params.q) items = items.filter((p) => p.name.toLowerCase().includes(params.q.toLowerCase()));
    return ok(config, { items: items.slice(0, params.limit || 20) });
  }

  // GET /cart
  if (url.includes('/cart') && method === 'GET') {
    return ok(config, _cart);
  }

  // POST /cart  (add/update item)
  if (url.includes('/cart') && method === 'POST') {
    return ok(config, _cart);
  }

  // DELETE /cart/:itemId
  if (/\/cart\//.test(url) && method === 'DELETE') {
    return ok(config, {});
  }

  // GET /users/:id/addresses
  if (/\/users\/[^/]+\/addresses/.test(url) && method === 'GET') {
    return ok(config, { items: DEMO_ADDRESSES });
  }

  // POST /users/:id/addresses
  if (/\/users\/[^/]+\/addresses/.test(url) && method === 'POST') {
    return ok(config, { id: `addr-${Date.now()}`, ...JSON.parse(config.data || '{}') });
  }

  // GET /orders
  if (url.includes('/orders') && method === 'GET') {
    return ok(config, { items: DEMO_ORDERS });
  }

  // GET /orders/:id
  if (/\/orders\/[^/]+$/.test(url) && method === 'GET') {
    const id = url.split('/').pop();
    const order = DEMO_ORDERS.find((o) => o.id === id) || DEMO_ORDERS[0];
    return ok(config, order);
  }

  // POST /orders  (place order)
  if (url.includes('/orders') && method === 'POST') {
    const newOrder = {
      id: `order-demo-${Date.now()}`,
      orderNo: `ORD-${Date.now()}`,
      status: 'ORDER_PLACED',
      ...JSON.parse(config.data || '{}'),
      total: _cart.total,
      items: _cart.items,
      statusHistory: [{ status: 'ORDER_PLACED', at: Date.now() }],
    };
    return ok(config, newOrder);
  }

  // GET /auth/me
  if (url.includes('/auth/me') && method === 'GET') {
    return ok(config, DEMO_USER);
  }

  // GET /notifications
  if (url.includes('/notifications') && method === 'GET') {
    return ok(config, { items: [] });
  }

  return ok(config, {});
}
