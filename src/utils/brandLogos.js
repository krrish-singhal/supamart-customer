// Static require() map for locally-bundled brand logos, keyed by the exact brand `name`
// string in the Firestore `brands` collection. Metro requires require() paths to be
// static, and the target file must exist at bundle time, so this map can only reference
// files that actually exist in assets/Brand_Logos/.
//
// Two source batches, both from client-supplied folders with real brand photos (no
// online fetching, ever -- see below):
//  1. assets/brands/ (35 files, already brand-named, e.g. "bru.png", "hellman's.png").
//  2. assets/Remaining_Brands/ (53 files, meaningless "image copy N.png" names --
//     identified one-by-one by inspecting the actual logo/packaging in each image and
//     cross-checking against the brand names + product names already in Firestore).
//     This batch also replaced the original Pepsodent logo with a client-supplied
//     replacement, and is where "R.G." (deleted -- not a real brand) and "Lia" (merged
//     into the existing "Cycle" brand) got cleaned up in Firestore (see
//     backend/src/jobs/fixBrandIssues.js).
//
// Each image was either background-removed (deterministic flood-fill from the edges,
// not AI -- these are flat logo graphics, and flood-fill is more reliable for
// solid-color wordmarks/badges than AI segmentation) or, for logos whose background IS
// the actual brand badge design (e.g. Rin's blue square, Munch's purple square, Elite's
// red card) -- left untouched, just trimmed of any existing transparent margin and
// padded evenly, so removing "the background" wouldn't have destroyed the real logo. A
// few source images were literal photos of product packaging rather than a clean logo
// (SSK, Bharath, Sara, True Blue) -- those were just center-cropped square, no
// transparency introduced, same treatment "Horlicks" got in the first batch.
//
// Some source images were deliberately NOT mapped to any brand -- a "Double Horse"
// logo with no matching brand/product in the catalog, a duplicate second Glow & Lovely
// logo (already had one), and one unreadably low-resolution (73x51px) unidentifiable
// image. Three brands (DH, E-fee, KPR) still have no confidently-matched image and are
// deliberately left without one rather than guessed -- see admin-portal's mirror of
// this file for the same note.
//
// This is a NAME-KEYED LOCAL FALLBACK -- it deliberately replaces the old real-time
// Wikipedia/Simple-Icons online lookup (deleted: utils/getBrandLogo.js). No network calls,
// no guessing: a brand either has a real bundled photo here, or it falls through to the
// generic placeholder.
//
// Priority used by callers (see components/ui/BrandLogo.js): an admin-uploaded
// `brand.logoUrl` (a live Firestore field, set via the admin portal's Brand form) always
// overrides this bundled default -- same pattern as product/category images -- so admins
// retain full control to replace any of these later without a rebuild.

const brandLogos = {
  "786": require("../../assets/Brand_Logos/786.webp"),
  "Anus": require("../../assets/Brand_Logos/Anus.webp"),
  "AVT": require("../../assets/Brand_Logos/AVT.webp"),
  "Bakers": require("../../assets/Brand_Logos/Bakers.webp"),
  "Bharath": require("../../assets/Brand_Logos/Bharath.webp"),
  "Boost": require("../../assets/Brand_Logos/Boost.webp"),
  "Bounty": require("../../assets/Brand_Logos/Bounty.webp"),
  "Britannia": require("../../assets/Brand_Logos/Britannia.webp"),
  "Bru": require("../../assets/Brand_Logos/Bru.webp"),
  "Clear": require("../../assets/Brand_Logos/Clear.webp"),
  "Clinic Plus": require("../../assets/Brand_Logos/Clinic Plus.webp"),
  "Closeup": require("../../assets/Brand_Logos/Closeup.webp"),
  "Comfort": require("../../assets/Brand_Logos/Comfort.webp"),
  "Cycle": require("../../assets/Brand_Logos/Cycle.webp"),
  "Dabur": require("../../assets/Brand_Logos/Dabur.webp"),
  "Devon": require("../../assets/Brand_Logos/Devon.webp"),
  "Dolphin": require("../../assets/Brand_Logos/Dolphin.webp"),
  "Dove": require("../../assets/Brand_Logos/Dove.webp"),
  "Elite": require("../../assets/Brand_Logos/Elite.webp"),
  "Exo": require("../../assets/Brand_Logos/Exo.webp"),
  "Glow & Lovely": require("../../assets/Brand_Logos/Glow & Lovely.webp"),
  "Hamam": require("../../assets/Brand_Logos/Hamam.webp"),
  "Hellmann's": require("../../assets/Brand_Logos/Hellmann's.webp"),
  "Horlicks": require("../../assets/Brand_Logos/Horlicks.webp"),
  "Indulekha": require("../../assets/Brand_Logos/Indulekha.webp"),
  "Kellogg's": require("../../assets/Brand_Logos/Kellogg's.webp"),
  "Kissan": require("../../assets/Brand_Logos/Kissan.webp"),
  "Kit Kat": require("../../assets/Brand_Logos/Kit Kat.webp"),
  "Kitchen King": require("../../assets/Brand_Logos/Kitchen King.webp"),
  "Knorr": require("../../assets/Brand_Logos/Knorr.webp"),
  "KP": require("../../assets/Brand_Logos/KP.webp"),
  "Lifebuoy": require("../../assets/Brand_Logos/Lifebuoy.webp"),
  "Lipton": require("../../assets/Brand_Logos/Lipton.webp"),
  "Liril": require("../../assets/Brand_Logos/Liril.webp"),
  "Lux": require("../../assets/Brand_Logos/Lux.webp"),
  "Maggi": require("../../assets/Brand_Logos/Maggi.webp"),
  "Maharaja": require("../../assets/Brand_Logos/Maharaja.webp"),
  "Maxo": require("../../assets/Brand_Logos/Maxo.webp"),
  "Medimix": require("../../assets/Brand_Logos/Medimix.webp"),
  "Milma": require("../../assets/Brand_Logos/Milma.webp"),
  "Munch": require("../../assets/Brand_Logos/Munch.webp"),
  "Nescafe": require("../../assets/Brand_Logos/Nescafe.webp"),
  "Nirmal": require("../../assets/Brand_Logos/Nirmal.webp"),
  "Pavithram": require("../../assets/Brand_Logos/Pavithram.webp"),
  "Pears": require("../../assets/Brand_Logos/Pears.webp"),
  "Pepsodent": require("../../assets/Brand_Logos/Pepsodent.webp"),
  "Pond's": require("../../assets/Brand_Logos/Pond's.webp"),
  "Power": require("../../assets/Brand_Logos/Power.webp"),
  "Prakrithi": require("../../assets/Brand_Logos/Prakrithi.webp"),
  "Pran": require("../../assets/Brand_Logos/Pran.webp"),
  "Pringles": require("../../assets/Brand_Logos/Pringles.webp"),
  "Pulari": require("../../assets/Brand_Logos/Pulari.webp"),
  "Quaker": require("../../assets/Brand_Logos/Quaker.webp"),
  "Red Label": require("../../assets/Brand_Logos/Red Label.webp"),
  "Rexona": require("../../assets/Brand_Logos/Rexona.webp"),
  "Rin": require("../../assets/Brand_Logos/Rin.webp"),
  "Ruchi Gold": require("../../assets/Brand_Logos/Ruchi Gold.webp"),
  "Sara": require("../../assets/Brand_Logos/Sara.webp"),
  "Santoor": require("../../assets/Brand_Logos/Santoor.webp"),
  "Sensodyne": require("../../assets/Brand_Logos/Sensodyne.webp"),
  "Snickers": require("../../assets/Brand_Logos/Snickers.webp"),
  "SSK": require("../../assets/Brand_Logos/SSK.webp"),
  "Sunfeast": require("../../assets/Brand_Logos/Sunfeast.webp"),
  "Sunlight": require("../../assets/Brand_Logos/Sunlight.webp"),
  "Sunsilk": require("../../assets/Brand_Logos/Sunsilk.webp"),
  "Surf Excel": require("../../assets/Brand_Logos/Surf Excel.webp"),
  "Taaza": require("../../assets/Brand_Logos/Taaza.webp"),
  "Taj Mahal": require("../../assets/Brand_Logos/Taj Mahal.webp"),
  "TRESemmé": require("../../assets/Brand_Logos/TRESemmé.webp"),
  "True Blue": require("../../assets/Brand_Logos/True Blue.webp"),
  "TT": require("../../assets/Brand_Logos/TT.webp"),
  "Ujala": require("../../assets/Brand_Logos/Ujala.webp"),
  "UT": require("../../assets/Brand_Logos/UT.webp"),
  "VWash": require("../../assets/Brand_Logos/VWash.webp"),
  "Vim": require("../../assets/Brand_Logos/Vim.webp"),
  "Wheel": require("../../assets/Brand_Logos/Wheel.webp"),
  "Yardley": require("../../assets/Brand_Logos/Yardley.webp"),
  "Yippee": require("../../assets/Brand_Logos/Yippee.webp"),
};

export default brandLogos;
