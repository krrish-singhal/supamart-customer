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
  "household-cleaning-detergent-powder": require("../../assets/sub-categories/Powder.png"),
  "household-cleaning-detergent-bars": require("../../assets/sub-categories/Detergent Bars.png"),
  "household-cleaning-detergent-liquid": require("../../assets/sub-categories/Detergent Liquid.png"),
  "household-cleaning-fabric-conditioner": require("../../assets/sub-categories/Fabric Conditioner.png"),
  "household-cleaning-bleach": require("../../assets/sub-categories/Bleach.png"),
  "household-cleaning-dishwash-bars": require("../../assets/sub-categories/Dishwash Bars.png"),
  "household-cleaning-dishwash-liquid": require("../../assets/sub-categories/Dishwash Liquid.png"),
  "household-cleaning-fabric-whitener": require("../../assets/Cleaned_Products/Ujala Crystal White Liquid.png"),
  "household-cleaning-mosquito-repellent": require("../../assets/Cleaned_Products/Maxo Coil Mosquito Repellent.png"),

  // Personal Care (formerly Bathing Soap + Hair Care + Oral-Care + Face Wash + Feminine Hygiene)
  "personal-care-soaps": require("../../assets/sub-categories/Soaps.png"),
  "personal-care-hand-wash": require("../../assets/sub-categories/Hand Wash.png"),
  "personal-care-shampoo": require("../../assets/sub-categories/Shampoo.png"),
  "personal-care-hair-oil": require("../../assets/sub-categories/Hair Oil.png"),
  "personal-care-conditioner": require("../../assets/sub-categories/Conditioner.png"),
  "personal-care-oral-care": require("../../assets/sub-categories/Toothpaste.png"),
  "personal-care-face-wash-men": require("../../assets/sub-categories/Men.png"),
  "personal-care-face-wash-women": require("../../assets/sub-categories/Women.png"),
  "personal-care-feminine-hygiene": require("../../assets/sub-categories/Intimate Wash.png"),

  // Beverages (formerly Tea & Coffee, folded into "Beverages & Health Drinks",
  // then split back out as its own top-level category)
  "beverages-tea": require("../../assets/sub-categories/Tea.png"),
  "beverages-coffee": require("../../assets/sub-categories/Coffee.png"),

  // Health Drinks (formerly Health Food Drinks, folded into "Beverages & Health
  // Drinks", then split back out as its own top-level category)
  "health-drinks-health-energy-drinks": require("../../assets/sub-categories/Health Drink and Supplements.png"),

  // Sauces, Pickles & Condiments (formerly Sauces & Spreads + Breakfast)
  "sauces-pickles-condiments-sauces-ketchup": require("../../assets/sub-categories/Sauces and Ketchup.png"),
  "sauces-pickles-condiments-soup": require("../../assets/sub-categories/Soup.png"),
  "sauces-pickles-condiments-chutneys-jam": require("../../assets/sub-categories/Jam.png"),
  "sauces-pickles-condiments-pickles": require("../../assets/Cleaned_Products/Anus Mango Pickle.png"),

  // Snacks & Confectionery — icons borrowed from a representative product photo
  "snacks-confectionery-chips": require("../../assets/Cleaned_Products/Pringles Original.png"),
  "snacks-confectionery-noodles-pasta": require("../../assets/Cleaned_Products/Maggi 2-Minute Noodles.png"),
  "snacks-confectionery-biscuits-cookies": require("../../assets/Cleaned_Products/Good Day Chocochip.png"),
  "snacks-confectionery-chocolates-confectionery": require("../../assets/Cleaned_Products/Kit Kat Miniatures.png"),

  // Beverages — icon borrowed from a representative product photo
  "beverages-fruit-drinks-desserts": require("../../assets/Cleaned_Products/Pran Litchi Drink.png"),

  // Cooking Oils & Ghee — icons borrowed from a representative product photo
  "cooking-oils-ghee-cooking-oils": require("../../assets/Cleaned_Products/Prakrithi Coconut Oil.png"),
  "cooking-oils-ghee-ghee": require("../../assets/Cleaned_Products/Milma Ghee.png"),

  // Dairy — icons borrowed from a representative product photo
  "dairy-butter": require("../../assets/Cleaned_Products/Milma Butter.png"),
  "dairy-paneer": require("../../assets/Cleaned_Products/Milma Paneer.png"),
  "dairy-dairy-sweets": require("../../assets/Cleaned_Products/Milma Ghee Cake Choco Brownie.png"),

  // Spices & Masala — icons borrowed from a representative product photo
  "spices-masala-masala-powders": require("../../assets/Cleaned_Products/Turmeric Powder.png"),
  "spices-masala-asafoetida": require("../../assets/Cleaned_Products/TT Asafoetida Cake.png"),
  "spices-masala-herbs-pastes": require("../../assets/Cleaned_Products/Ginger Garlic Paste.png"),

  // Rice, Atta & Grains — icons borrowed from a representative product photo
  "rice-atta-grains-rice": require("../../assets/Cleaned_Products/SSK Ponni Rice 1st.png"),
  "rice-atta-grains-atta-maida-flour": require("../../assets/Cleaned_Products/Elite Atta.png"),
  "rice-atta-grains-pulses-dals": require("../../assets/Cleaned_Products/Kadala Paruppu Chana Dal.png"),
  "rice-atta-grains-jaggery-sweeteners": require("../../assets/Cleaned_Products/Sarkara Jaggery.png"),

  // Instant / Ready-to-Cook Mixes — icons borrowed from a representative product photo
  "instant-ready-to-cook-mixes-idiyappam-puttu-mixes": require("../../assets/Cleaned_Products/UT Puttu Podi.png"),
  "instant-ready-to-cook-mixes-breakfast-cereals": require("../../assets/Cleaned_Products/Kellogg's Corn Flakes.png"),
  "instant-ready-to-cook-mixes-rava-vermicelli-payasam-mix": require("../../assets/Cleaned_Products/UT Uppuma Rava.png"),
  "instant-ready-to-cook-mixes-health-traditional-mixes": require("../../assets/Cleaned_Products/DH Roast Ragi Powder.png"),

  // Dry Fruits & Nuts — icons borrowed from a representative product photo
  "dry-fruits-nuts-nuts-raisins": require("../../assets/Cleaned_Products/Gold Walnut.png"),
  "dry-fruits-nuts-flours-syrups": require("../../assets/Cleaned_Products/Dates Syrup.png"),

  // Fresh Vegetables — icons borrowed from a representative product photo
  "fresh-vegetables-vegetables": require("../../assets/Cleaned_Products/Potato.png"),
  "fresh-vegetables-leafy-greens-herbs": require("../../assets/Cleaned_Products/Curry Leaves K. Leaves.png"),
  "fresh-vegetables-fruits": require("../../assets/Cleaned_Products/Mango.png"),
  "fresh-vegetables-pooja-flowers": require("../../assets/Cleaned_Products/Flowers assorted, for pooja.png"),

  // No real parent category yet — kept in case one's added later with matching sub-category names
  "skin-care-body-lotion": require("../../assets/sub-categories/Body Lotion.png"),
  "skin-care-cream": require("../../assets/sub-categories/Cream.png"),
  "skin-care-moisturiser": require("../../assets/sub-categories/Moisturiser.png"),
  "skin-care-petroleum-jelly": require("../../assets/sub-categories/Petroleum Jelly.png"),
  "skin-care-sunscreen": require("../../assets/sub-categories/Sunscreen.png"),
};

export default subCategoryImages;
