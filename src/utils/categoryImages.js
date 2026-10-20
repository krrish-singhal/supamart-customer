import slugify from './slugify';
import { optimizeCloudinaryUrl } from './cloudinaryImage';
import subCategoryImages from './subCategoryImages';

// Static require() map for locally-bundled top-level category images, keyed by
// slugify(category.name) -- see src/utils/slugify.js.
// Keys match the REAL category names in Firestore / SupaMart catalog.

const categoryImages = {
  // Fresh Vegetables & Produce
  "fresh-vegetables": require("../../assets/categories/home/fresh-vegetables.webp"),
  "vegetables": require("../../assets/categories/home/fresh-vegetables.webp"),
  "vegetable": require("../../assets/categories/home/fresh-vegetables.webp"),
  "onion-potato": require("../../assets/Cleaned_Products/Onion.webp"),
  "fruits": require("../../assets/categories/home/fresh-fruits.webp"),
  "fresh-fruits": require("../../assets/categories/home/fresh-fruits.webp"),
  "gourds": require("../../assets/Cleaned_Products/Bottle Gourd.webp"),
  "corn-greens": require("../../assets/Cleaned_Products/Sweet Corn.webp"),
  "chillies": require("../../assets/Cleaned_Products/Green Chilly.webp"),
  "fresh": require("../../assets/categories/home/fresh-vegetables.webp"),

  // Dairy & Breakfast
  "dairy": require("../../assets/Brand_Logos/Milma.webp"),
  "dairy-bread-eggs": require("../../assets/categories/home/dairy-bread-eggs.webp"),
  "bakery-items": require("../../assets/categories/Breakfast.png"),

  // Snacks & Beverages
  "snacks-confectionery": require("../../assets/categories/home/chips-namkeens.webp"),
  "snacks": require("../../assets/categories/home/chips-namkeens.webp"),
  "beverages": require("../../assets/categories/Beverages.webp"),
  "beverage": require("../../assets/categories/Beverages.webp"),
  "drinks": require("../../assets/categories/Beverages.webp"),
  "cold-drinks": require("../../assets/categories/home/cold-drinks-juices.webp"),
  "cold-drinks-juices": require("../../assets/categories/home/cold-drinks-juices.webp"),
  "tea-coffee-beverages": require("../../assets/categories/Beverages.webp"),
  "health-drinks": require("../../assets/categories/home/protein-supplements.webp"),

  // Personal Care & Hygiene
  "personal-care": require("../../assets/categories/home/bath-body.webp"),

  // Household & Cleaning
  "household-cleaning": require("../../assets/categories/home/cleaning-essentials.webp"),
  "household": require("../../assets/categories/home/cleaning-essentials.webp"),
  "home": require("../../assets/categories/home/cleaning-essentials.webp"),

  // Cooking & Kitchen Staples
  "cooking-oils-ghee": require("../../assets/Cleaned_Products/Ruchi Gold Palm Oil.webp"),
  "oils": require("../../assets/Cleaned_Products/Ruchi Gold Palm Oil.webp"),
  "spices-masala": require("../../assets/Cleaned_Products/Turmeric Powder.webp"),
  "spices": require("../../assets/Cleaned_Products/Turmeric Powder.webp"),
  "rice-atta-grains": require("../../assets/Cleaned_Products/SSK Ponni Rice 1st.webp"),
  "staples": require("../../assets/Cleaned_Products/SSK Ponni Rice 1st.webp"),
  "instant-ready-to-cook-mixes": require("../../assets/categories/home/noodles-pasta.webp"),
  "instant": require("../../assets/categories/home/noodles-pasta.webp"),
  "dry-fruits-nuts": require("../../assets/Cleaned_Products/Gold Walnut.webp"),
  "sauces-pickles-condiments": require("../../assets/categories/Packaged Foods.webp"),

  // Devotional & Puja
  "pooja-devotional-items": require("../../assets/categories/home/puja.webp"),
};

/**
 * Resolves the visual image source for a category or subcategory consistently across the app.
 *
 * Priority order:
 * 1. Admin-uploaded image (category.image remote URL from Firestore/backend)
 * 2. Bundled asset by category.imageKey (from subCategoryImages)
 * 3. Bundled asset by category.name slug (from categoryImages or subCategoryImages)
 * 4. Fallback null
 */
export function getCategoryVisual(category, size = 150) {
  if (!category) return null;

  // Direct asset passed in
  if (typeof category === 'number') return category;
  if (typeof category === 'object' && category.uri) return category;

  // 1. Admin-uploaded image URL (live Firestore field `category.image`).
  // Always takes priority so admin edits in the admin portal immediately show up.
  const img = category.image;
  if (img) {
    if (typeof img === 'number') return img;
    if (typeof img === 'object' && img.uri) return img;
    if (typeof img === 'string' && img.trim().length > 0) {
      const trimmed = img.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return { uri: optimizeCloudinaryUrl(trimmed, size) };
      }
    }
  }

  // 2. Bundled sub-category imageKey if present
  if (category.imageKey && subCategoryImages[category.imageKey]) {
    return subCategoryImages[category.imageKey];
  }

  // 3. Bundled top-level category image lookup by slugified category name
  const name = (typeof category === 'string' ? category : category.name || category.label || '').trim();
  const slug = slugify(name);
  if (slug && categoryImages[slug]) {
    return categoryImages[slug];
  }

  // 4. Check subCategoryImages by parent-slug + slug or plain slug
  if (category.parentName) {
    const parentSlug = slugify(category.parentName);
    const combinedKey = `${parentSlug}-${slug}`;
    if (subCategoryImages[combinedKey]) {
      return subCategoryImages[combinedKey];
    }
  }
  if (slug && subCategoryImages[slug]) {
    return subCategoryImages[slug];
  }

  return null;
}

export const getCategoryImageSource = getCategoryVisual;

export default categoryImages;

