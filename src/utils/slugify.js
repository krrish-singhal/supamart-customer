// Turns a category/sub-category `name` into a stable lookup key, e.g. "Bath & Hygiene" ->
// "bath-hygiene", "Matic Liquid" -> "matic-liquid". Used instead of the DB `imageKey` field
// because only the originally-seeded categories have one set — anything created later via
// the admin portal's category manager never gets an imageKey (that UI only sets name/image),
// so name-based slugs are the only lookup that works for every category, seeded or not.
export default function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
