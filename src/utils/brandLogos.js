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
  "786": require("../../assets/Brand_Logos/786.png"),
  "Anus": require("../../assets/Brand_Logos/Anus.png"),
  "AVT": require("../../assets/Brand_Logos/AVT.png"),
  "Bakers": require("../../assets/Brand_Logos/Bakers.png"),
  "Bharath": require("../../assets/Brand_Logos/Bharath.png"),
  "Boost": require("../../assets/Brand_Logos/Boost.png"),
  "Bounty": require("../../assets/Brand_Logos/Bounty.png"),
  "Britannia": require("../../assets/Brand_Logos/Britannia.png"),
  "Bru": require("../../assets/Brand_Logos/Bru.png"),
  "Clear": require("../../assets/Brand_Logos/Clear.png"),
  "Clinic Plus": require("../../assets/Brand_Logos/Clinic Plus.png"),
  "Closeup": require("../../assets/Brand_Logos/Closeup.png"),
  "Comfort": require("../../assets/Brand_Logos/Comfort.png"),
  "Cycle": require("../../assets/Brand_Logos/Cycle.png"),
  "Dabur": require("../../assets/Brand_Logos/Dabur.png"),
  "Devon": require("../../assets/Brand_Logos/Devon.png"),
  "Dolphin": require("../../assets/Brand_Logos/Dolphin.png"),
  "Dove": require("../../assets/Brand_Logos/Dove.png"),
  "Elite": require("../../assets/Brand_Logos/Elite.png"),
  "Exo": require("../../assets/Brand_Logos/Exo.png"),
  "Glow & Lovely": require("../../assets/Brand_Logos/Glow & Lovely.png"),
  "Hamam": require("../../assets/Brand_Logos/Hamam.png"),
  "Hellmann's": require("../../assets/Brand_Logos/Hellmann's.png"),
  "Horlicks": require("../../assets/Brand_Logos/Horlicks.png"),
  "Indulekha": require("../../assets/Brand_Logos/Indulekha.png"),
  "Kellogg's": require("../../assets/Brand_Logos/Kellogg's.png"),
  "Kissan": require("../../assets/Brand_Logos/Kissan.png"),
  "Kit Kat": require("../../assets/Brand_Logos/Kit Kat.png"),
  "Kitchen King": require("../../assets/Brand_Logos/Kitchen King.png"),
  "Knorr": require("../../assets/Brand_Logos/Knorr.png"),
  "KP": require("../../assets/Brand_Logos/KP.png"),
  "Lifebuoy": require("../../assets/Brand_Logos/Lifebuoy.png"),
  "Lipton": require("../../assets/Brand_Logos/Lipton.png"),
  "Liril": require("../../assets/Brand_Logos/Liril.png"),
  "Lux": require("../../assets/Brand_Logos/Lux.png"),
  "Maggi": require("../../assets/Brand_Logos/Maggi.png"),
  "Maharaja": require("../../assets/Brand_Logos/Maharaja.png"),
  "Maxo": require("../../assets/Brand_Logos/Maxo.png"),
  "Medimix": require("../../assets/Brand_Logos/Medimix.png"),
  "Milma": require("../../assets/Brand_Logos/Milma.png"),
  "Munch": require("../../assets/Brand_Logos/Munch.png"),
  "Nescafe": require("../../assets/Brand_Logos/Nescafe.png"),
  "Nirmal": require("../../assets/Brand_Logos/Nirmal.png"),
  "Pavithram": require("../../assets/Brand_Logos/Pavithram.png"),
  "Pears": require("../../assets/Brand_Logos/Pears.png"),
  "Pepsodent": require("../../assets/Brand_Logos/Pepsodent.png"),
  "Pond's": require("../../assets/Brand_Logos/Pond's.png"),
  "Power": require("../../assets/Brand_Logos/Power.png"),
  "Prakrithi": require("../../assets/Brand_Logos/Prakrithi.png"),
  "Pran": require("../../assets/Brand_Logos/Pran.png"),
  "Pringles": require("../../assets/Brand_Logos/Pringles.png"),
  "Pulari": require("../../assets/Brand_Logos/Pulari.png"),
  "Quaker": require("../../assets/Brand_Logos/Quaker.png"),
  "Red Label": require("../../assets/Brand_Logos/Red Label.png"),
  "Rexona": require("../../assets/Brand_Logos/Rexona.png"),
  "Rin": require("../../assets/Brand_Logos/Rin.png"),
  "Ruchi Gold": require("../../assets/Brand_Logos/Ruchi Gold.png"),
  "Sara": require("../../assets/Brand_Logos/Sara.png"),
  "Santoor": require("../../assets/Brand_Logos/Santoor.png"),
  "Sensodyne": require("../../assets/Brand_Logos/Sensodyne.png"),
  "Snickers": require("../../assets/Brand_Logos/Snickers.png"),
  "SSK": require("../../assets/Brand_Logos/SSK.png"),
  "Sunfeast": require("../../assets/Brand_Logos/Sunfeast.png"),
  "Sunlight": require("../../assets/Brand_Logos/Sunlight.png"),
  "Sunsilk": require("../../assets/Brand_Logos/Sunsilk.png"),
  "Surf Excel": require("../../assets/Brand_Logos/Surf Excel.png"),
  "Taaza": require("../../assets/Brand_Logos/Taaza.png"),
  "Taj Mahal": require("../../assets/Brand_Logos/Taj Mahal.png"),
  "TRESemmé": require("../../assets/Brand_Logos/TRESemmé.png"),
  "True Blue": require("../../assets/Brand_Logos/True Blue.png"),
  "TT": require("../../assets/Brand_Logos/TT.png"),
  "Ujala": require("../../assets/Brand_Logos/Ujala.png"),
  "UT": require("../../assets/Brand_Logos/UT.png"),
  "VWash": require("../../assets/Brand_Logos/VWash.png"),
  "Vim": require("../../assets/Brand_Logos/Vim.png"),
  "Wheel": require("../../assets/Brand_Logos/Wheel.png"),
  "Yardley": require("../../assets/Brand_Logos/Yardley.png"),
  "Yippee": require("../../assets/Brand_Logos/Yippee.png"),
};

export default brandLogos;
