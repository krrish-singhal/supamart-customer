// Static require() map for locally-bundled top-level category images, keyed by
// slugify(category.name) -- see src/utils/slugify.js. Metro requires require()
// paths to be static, so this map can only reference files that actually exist
// in assets/categories/. Keys must match the REAL category names in Firestore
// exactly (verified against backend/src/jobs/consolidateCategories.js's merged
// taxonomy, then backend/src/jobs/splitBeveragesAndHealthDrinks.js which split
// "Beverages & Health Drinks" back into two separate top-level categories) --
// the old Detergent/Dishwash/Bathing Soap/Hair Care/Oral-Care/Face Wash/Talc &
// Grooming/Feminine Hygiene/Tea & Coffee/Health Food Drinks/Sauces & Spreads/
// Breakfast categories no longer exist; they were consolidated into
// "Household & Cleaning", "Personal Care", "Beverages", "Health Drinks", and
// "Sauces, Pickles & Condiments". One representative icon from each absorbed
// group is reused for its merged parent below. HomeScreen.js/CategoriesScreen.js
// fall back to the category's own remote `image` URL, then a generic icon, when
// a key isn't present here.

const categoryImages = {
  "household-cleaning": require("../../assets/categories/Detergent.png"),
  "personal-care": require("../../assets/categories/Bath and Hygiene.png"),
  "beverages": require("../../assets/categories/Beverages.png"),
  "health-drinks": require("../../assets/categories/Health Food Drinks.png"),
  "sauces-pickles-condiments": require("../../assets/categories/Packaged Foods.png"),
};

export default categoryImages;
