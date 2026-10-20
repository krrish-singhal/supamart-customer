// Static require() map for locally-bundled sub-category images, keyed by
// slugify(parentCategoryName) + "-" + slugify(subCategoryName) -- see
// src/utils/slugify.js. Metro requires require() paths to be static, and the
// target file must exist at bundle time, so this map can only reference files
// that actually exist in assets/sub-categories/ or assets/Cleaned_Products/.
// Keys must match the REAL parent/sub-category names in Firestore after the
// taxonomy consolidation (backend/src/jobs/consolidateCategories.js: 28 top-level
// categories merged down to 14) -- e.g. "Detergent"/"Dishwash" are now "Household
// & Cleaning", "Hair Care"/"Oral-Care"/"Face Wash"/"Feminine Hygiene"/"Bathing
// Soap"/"Talc & Grooming" are now "Personal Care", and "Sauces & Spreads"/
// "Breakfast" are now "Sauces, Pickles & Condiments". "Tea & Coffee"/"Health
// Food Drinks" were briefly merged into "Beverages & Health Drinks" and then
// split back into two separate top-level categories, "Beverages" and "Health
// Drinks" (backend/src/jobs/splitBeveragesAndHealthDrinks.js), per the
// client's correction that they're different categories to the shop. The
// underlying image files were never touched by any of this -- only the
// lookup keys needed updating to the current parent/sub names.
//
// The sub-categories added by backend/src/jobs/subcategorizeRemaining.js (Cooking
// Oils & Ghee, Dairy, Spices & Masala, Rice/Atta/Grains, Instant/Ready-to-Cook
// Mixes, Dry Fruits & Nuts, Fresh Vegetables) have no dedicated icon shoot --
// there's no assets/sub-categories/ file for "Cooking Oils" or "Masala
// Powders" etc. Per the client, that's fine: reuse an actual product photo that
// already lives in that sub-category as its icon (require()'d straight from
// assets/Cleaned_Products/, same as productImages.js) rather than leaving it
// blank until a dedicated icon is shot.
//
// The "skin-care-*" entries have no real parent category yet (kept in case one's
// added later with matching sub-category names) -- CategoriesScreen.js falls
// back to the sub-category's own remote `image` URL, then a generic icon, when
// a key isn't present here.

const subCategoryImages = {
  // Household & Cleaning (formerly Detergent + Dishwash)
  "household-cleaning-detergent-powder": require("../../assets/sub-categories/Powder.webp"),
  "household-cleaning-detergent-bars": require("../../assets/sub-categories/Detergent Bars.webp"),
  "household-cleaning-detergent-liquid": require("../../assets/sub-categories/Detergent Liquid.webp"),
  "household-cleaning-fabric-conditioner": require("../../assets/sub-categories/Fabric Conditioner.webp"),
  "household-cleaning-bleach": require("../../assets/sub-categories/Bleach.webp"),
  "household-cleaning-dishwash-bars": require("../../assets/sub-categories/Dishwash Bars.webp"),
  "household-cleaning-dishwash-liquid": require("../../assets/sub-categories/Dishwash Liquid.webp"),
  "household-cleaning-fabric-whitener": require("../../assets/Cleaned_Products/Ujala Crystal White Liquid.webp"),
  "household-cleaning-mosquito-repellent": require("../../assets/Cleaned_Products/Maxo Coil Mosquito Repellent.webp"),

  // Personal Care (formerly Bathing Soap + Hair Care + Oral-Care + Face Wash + Feminine Hygiene)
  "personal-care-soaps": require("../../assets/sub-categories/Soaps.webp"),
  "personal-care-hand-wash": require("../../assets/sub-categories/Hand Wash.webp"),
  "personal-care-shampoo": require("../../assets/sub-categories/Shampoo.webp"),
  "personal-care-hair-oil": require("../../assets/sub-categories/Hair Oil.webp"),
  "personal-care-conditioner": require("../../assets/sub-categories/Conditioner.webp"),
  "personal-care-oral-care": require("../../assets/sub-categories/Toothpaste.webp"),
  "personal-care-face-wash-men": require("../../assets/sub-categories/Men.webp"),
  "personal-care-face-wash-women": require("../../assets/sub-categories/Women.webp"),
  "personal-care-feminine-hygiene": require("../../assets/sub-categories/Intimate Wash.webp"),

  // Beverages (formerly Tea & Coffee, folded into "Beverages & Health Drinks",
  // then split back out as its own top-level category)
  "beverages-tea": require("../../assets/sub-categories/Tea.webp"),
  "beverages-coffee": require("../../assets/sub-categories/Coffee.webp"),

  // Health Drinks (formerly Health Food Drinks, folded into "Beverages & Health
  // Drinks", then split back out as its own top-level category)
  "health-drinks-health-energy-drinks": require("../../assets/sub-categories/Health Drink and Supplements.webp"),

  // Sauces, Pickles & Condiments (formerly Sauces & Spreads + Breakfast)
  "sauces-pickles-condiments-sauces-ketchup": require("../../assets/sub-categories/Sauces and Ketchup.webp"),
  "sauces-pickles-condiments-soup": require("../../assets/sub-categories/Soup.webp"),
  "sauces-pickles-condiments-chutneys-jam": require("../../assets/sub-categories/Jam.webp"),
  "sauces-pickles-condiments-pickles": require("../../assets/Cleaned_Products/Anus Mango Pickle.webp"),

  // Snacks & Confectionery — icons borrowed from a representative product photo
  "snacks-confectionery-chips": require("../../assets/Cleaned_Products/Pringles Original.webp"),
  "snacks-confectionery-noodles-pasta": require("../../assets/Cleaned_Products/Maggi 2-Minute Noodles.webp"),
  "snacks-confectionery-biscuits-cookies": require("../../assets/Cleaned_Products/Good Day Chocochip.webp"),
  "snacks-confectionery-chocolates-confectionery": require("../../assets/Cleaned_Products/Kit Kat Miniatures.webp"),

  // Beverages — icon borrowed from a representative product photo
  "beverages-fruit-drinks-desserts": require("../../assets/Cleaned_Products/Pran Litchi Drink.webp"),

  // Cooking Oils & Ghee — icons borrowed from a representative product photo
  "cooking-oils-ghee-cooking-oils": require("../../assets/Cleaned_Products/Prakrithi Coconut Oil.webp"),
  "cooking-oils-ghee-ghee": require("../../assets/Cleaned_Products/Milma Ghee.webp"),

  // Dairy — icons borrowed from a representative product photo
  "dairy-butter": require("../../assets/Cleaned_Products/Milma Butter.webp"),
  "dairy-paneer": require("../../assets/Cleaned_Products/Milma Paneer.webp"),
  "dairy-dairy-sweets": require("../../assets/Cleaned_Products/Milma Ghee Cake Choco Brownie.webp"),

  // Spices & Masala — icons borrowed from a representative product photo
  "spices-masala-masala-powders": require("../../assets/Cleaned_Products/Turmeric Powder.webp"),
  "spices-masala-asafoetida": require("../../assets/Cleaned_Products/TT Asafoetida Cake.webp"),
  "spices-masala-herbs-pastes": require("../../assets/Cleaned_Products/Ginger Garlic Paste.webp"),

  // Rice, Atta & Grains — icons borrowed from a representative product photo
  "rice-atta-grains-rice": require("../../assets/Cleaned_Products/SSK Ponni Rice 1st.webp"),
  "rice-atta-grains-atta-maida-flour": require("../../assets/Cleaned_Products/Elite Atta.webp"),
  "rice-atta-grains-pulses-dals": require("../../assets/Cleaned_Products/Kadala Paruppu Chana Dal.webp"),
  "rice-atta-grains-jaggery-sweeteners": require("../../assets/Cleaned_Products/Sarkara Jaggery.webp"),

  // Instant / Ready-to-Cook Mixes — icons borrowed from a representative product photo
  "instant-ready-to-cook-mixes-idiyappam-puttu-mixes": require("../../assets/Cleaned_Products/UT Puttu Podi.webp"),
  "instant-ready-to-cook-mixes-breakfast-cereals": require("../../assets/Cleaned_Products/Kellogg's Corn Flakes.webp"),
  "instant-ready-to-cook-mixes-rava-vermicelli-payasam-mix": require("../../assets/Cleaned_Products/UT Uppuma Rava.webp"),
  "instant-ready-to-cook-mixes-health-traditional-mixes": require("../../assets/Cleaned_Products/DH Roast Ragi Powder.webp"),

  // Dry Fruits & Nuts — icons borrowed from a representative product photo
  "dry-fruits-nuts-nuts-raisins": require("../../assets/Cleaned_Products/Gold Walnut.webp"),
  "dry-fruits-nuts-flours-syrups": require("../../assets/Cleaned_Products/Dates Syrup.webp"),

  // Fresh Vegetables — icons borrowed from a representative product photo
  "fresh-vegetables-vegetables": require("../../assets/Cleaned_Products/Potato.webp"),
  "fresh-vegetables-leafy-greens-herbs": require("../../assets/Cleaned_Products/Curry Leaves K. Leaves.webp"),
  "fresh-vegetables-fruits": require("../../assets/Cleaned_Products/Mango.webp"),
  "fresh-vegetables-pooja-flowers": require("../../assets/Cleaned_Products/Flowers assorted, for pooja.webp"),

  // No real parent category yet — kept in case one's added later with matching sub-category names
  "skin-care-body-lotion": require("../../assets/sub-categories/Body Lotion.webp"),
  "skin-care-cream": require("../../assets/sub-categories/Cream.webp"),
  "skin-care-moisturiser": require("../../assets/sub-categories/Moisturiser.webp"),
  "skin-care-petroleum-jelly": require("../../assets/sub-categories/Petroleum Jelly.webp"),
  "skin-care-sunscreen": require("../../assets/sub-categories/Sunscreen.webp"),
};

export default subCategoryImages;
