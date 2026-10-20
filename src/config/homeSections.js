// Structured catalog of home sections and categories matching the exact UI layout
// and category grouping shown in the reference screens, with full fallback routing to
// SupaMart's live Firestore categories, subcategories, and search.

export const HOME_SECTIONS = [
  {
    id: 'grocery-kitchen',
    title: 'Grocery & Kitchen',
    items: [
      {
        id: 'fresh-vegetables',
        name: 'Fresh Vegetables',
        aliases: ['Fresh Vegetables', 'Vegetables', 'Leafy Greens & Herbs'],
        searchFallback: 'Vegetables',
      },
      {
        id: 'fresh-fruits',
        name: 'Fresh Fruits',
        aliases: ['Fruits', 'Fresh Fruits'],
        searchFallback: 'Fruits',
      },
      {
        id: 'dairy-bread-eggs',
        name: 'Dairy, Bread and Eggs',
        aliases: ['Dairy', 'Bakery Items', 'Butter', 'Paneer'],
        searchFallback: 'Dairy',
      },
      {
        id: 'meat-seafood',
        name: 'Meat and Seafood',
        aliases: ['Meat', 'Seafood', 'Fish', 'Chicken'],
        searchFallback: 'Meat',
      },
    ],
  },
  {
    id: 'snacks-drinks',
    title: 'Snacks & drinks',
    items: [
      {
        id: 'cold-drinks-juices',
        name: 'Cold Drinks and Juices',
        aliases: ['Beverages', 'Fruit Drinks & Desserts', 'Tea', 'Coffee'],
        searchFallback: 'Drinks',
      },
      {
        id: 'ice-creams-frozen',
        name: 'Ice Creams and Frozen ...',
        aliases: ['Dairy Sweets', 'Ice Cream', 'Frozen'],
        searchFallback: 'Ice Cream',
      },
      {
        id: 'chips-namkeens',
        name: 'Chips and Namkeens',
        aliases: ['Chips', 'Snacks & Confectionery'],
        searchFallback: 'Chips',
      },
      {
        id: 'chocolates',
        name: 'Chocolates',
        aliases: ['Chocolates & Confectionery'],
        searchFallback: 'Chocolates',
      },
      {
        id: 'noodles-pasta',
        name: 'Noodles, Pasta, Vermi...',
        aliases: ['Noodles & Pasta', 'Rava, Vermicelli & Payasam Mix'],
        searchFallback: 'Noodles',
      },
      {
        id: 'frozen-food',
        name: 'Frozen Food',
        aliases: ['Instant / Ready-to-Cook Mixes', 'Frozen'],
        searchFallback: 'Frozen Food',
      },
      {
        id: 'sweet-corner',
        name: 'Sweet Corner',
        aliases: ['Dairy Sweets', 'Jaggery & Sweeteners', 'Chocolates & Confectionery'],
        searchFallback: 'Sweets',
      },
      {
        id: 'paan-corner',
        name: 'Paan Corner',
        aliases: ['Paan', 'Mouth Freshener'],
        searchFallback: 'Mouth Freshener',
      },
    ],
  },
  {
    id: 'beauty-wellness',
    title: 'Beauty & Wellness',
    items: [
      {
        id: 'bath-body',
        name: 'Bath and Body',
        aliases: ['Soaps', 'Hand Wash', 'Personal Care'],
        searchFallback: 'Soap',
      },
      {
        id: 'hair-care',
        name: 'Hair Care',
        aliases: ['Shampoo', 'Hair Oil', 'Conditioner'],
        searchFallback: 'Shampoo',
      },
      {
        id: 'skin-care',
        name: 'Skin care',
        aliases: ['Face Wash Men', 'Face Wash Women', 'Talc'],
        searchFallback: 'Face Wash',
      },
      {
        id: 'makeup',
        name: 'Makeup',
        aliases: ['Talc', 'Cosmetics'],
        searchFallback: 'Cosmetics',
      },
      {
        id: 'oral-care',
        name: 'Oral Care',
        aliases: ['Oral Care', 'Toothpaste'],
        searchFallback: 'Toothpaste',
      },
      {
        id: 'grooming',
        name: 'Grooming',
        aliases: ['Personal Care', 'Talc'],
        searchFallback: 'Grooming',
      },
      {
        id: 'baby-care',
        name: 'Baby Care',
        aliases: ['Baby Care', 'Personal Care'],
        searchFallback: 'Baby Care',
      },
      {
        id: 'fragrances',
        name: 'Fragrances',
        aliases: ['Talc', 'Personal Care'],
        searchFallback: 'Fragrance',
      },
      {
        id: 'protein-supplements',
        name: 'Protein and Supplements',
        aliases: ['Health Drinks', 'Health & Energy Drinks'],
        searchFallback: 'Health Drink',
      },
      {
        id: 'feminine-hygiene',
        name: 'Feminine Hygiene',
        aliases: ['Feminine Hygiene'],
        searchFallback: 'Hygiene',
      },
      {
        id: 'sexual-wellness',
        name: 'Sexual Wellness',
        aliases: ['Personal Care'],
        searchFallback: 'Wellness',
      },
      {
        id: 'health-pharma',
        name: 'Health and Pharma',
        aliases: ['Health Drinks', 'Health & Energy Drinks'],
        searchFallback: 'Health',
      },
    ],
  },
  {
    id: 'household-lifestyle',
    title: 'Household & Lifestyle',
    items: [
      {
        id: 'home-furnishing',
        name: 'Home and Furnishing',
        aliases: ['Household & Cleaning', 'Home'],
        searchFallback: 'Home',
      },
      {
        id: 'kitchen-dining',
        name: 'Kitchen and Dining',
        aliases: ['Cooking Oils & Ghee', 'Spices & Masala', 'Rice, Atta & Grains', 'Sauces, Pickles & Condiments'],
        searchFallback: 'Kitchen',
      },
      {
        id: 'cleaning-essentials',
        name: 'Cleaning Essentials',
        aliases: ['Household & Cleaning', 'Detergent Powder', 'Dishwash Bars', 'Dishwash Liquid', 'Detergent Bars', 'Detergent Liquid'],
        searchFallback: 'Cleaning',
      },
      {
        id: 'clothing',
        name: 'Clothing',
        aliases: ['Clothing', 'Apparel'],
        searchFallback: 'Clothing',
      },
      {
        id: 'mobiles-electronics',
        name: 'Mobiles and Electronics',
        aliases: ['Electronics'],
        searchFallback: 'Electronics',
      },
      {
        id: 'appliances',
        name: 'Appliances',
        aliases: ['Appliances'],
        searchFallback: 'Appliances',
      },
      {
        id: 'books-stationery',
        name: 'Books and Stationery',
        aliases: ['Stationery', 'Books'],
        searchFallback: 'Stationery',
      },
      {
        id: 'jewellery-accessories',
        name: 'Jewellery and Accessories',
        aliases: ['Accessories', 'Jewellery'],
        searchFallback: 'Accessories',
      },
      {
        id: 'puja',
        name: 'Puja',
        aliases: ['Pooja & Devotional Items', 'Pooja Flowers'],
        searchFallback: 'Pooja',
      },
      {
        id: 'toys-games',
        name: 'Toys and Games',
        aliases: ['Toys', 'Games'],
        searchFallback: 'Toys',
      },
      {
        id: 'sports-fitness',
        name: 'Sports and Fitness',
        aliases: ['Sports', 'Fitness'],
        searchFallback: 'Fitness',
      },
      {
        id: 'pet-supplies',
        name: 'Pet Supplies',
        aliases: ['Pet Supplies', 'Pet Food'],
        searchFallback: 'Pet',
      },
    ],
  },
];
