// Rewrites a Cloudinary delivery URL to request a resized, auto-quality/auto-format
// variant instead of the original full-resolution upload. This is the actual fix for the
// app-wide slow-image-loading complaint: every admin-uploaded photo (products, category
// tiles, brand logos, banners, avatars) was being served as Cloudinary's raw secure_url —
// whatever resolution the admin's phone/camera produced, often several MB — and decoded
// at that full size for a UI element that's rendered at maybe 60-150px on screen.
//
// Cloudinary applies url-embedded transforms on the fly and caches the transformed
// variant on its CDN after the first request — this needs no re-upload and works
// retroactively on every photo already in Firestore, not just new uploads.
//
// `width` should be the largest size that image is ever actually rendered at in this app
// (a bit more than the CSS/layout size to stay crisp on 2-3x pixel-density phones), not the
// literal on-screen box size.
export function optimizeCloudinaryUrl(url, width = 400) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url; // not Cloudinary (or a bundled asset)
  if (/\/upload\/[a-z0-9_,]*w_\d/.test(url)) return url; // already has a width transform — don't stack
  return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto,c_limit/`);
}

// Standard size buckets so the same admin-uploaded photo requests the SAME transformed
// URL everywhere it's shown at a similar on-screen size — that means expo-image's
// memory/disk cache is actually shared across screens (e.g. a category's icon on
// CategoriesScreen and the same category elsewhere) instead of every screen fetching its
// own slightly-different-width copy of the same photo. Pick the bucket that's just above
// the largest box that image ever renders in.
export const THUMB_ICON = 200;   // small tiles/icons, ~40-70px on screen (category/sub-category rows, avatars)
export const THUMB_CARD = 320;   // product/brand cards, ~100-150px on screen
export const THUMB_HERO = 800;   // full-width hero/detail images
