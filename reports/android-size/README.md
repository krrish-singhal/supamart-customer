# MS Traders Android size audit — 17 October 2026

Work is on branch `chore/android-size-audit`. No branch was pushed, AAB uploaded,
Play track modified or release published. All sizes below use decimal MB unless
explicitly marked MiB. This report distinguishes measured artifacts from pending
production verification.

**Measured result:** fixed-device estimated download **220.50 → 52.17 MB
(76.34% reduction)**; AAB upload **266.00 → 97.64 MB (63.29%)**. See
[before/after measurements](MEASUREMENTS.md), [exact changed files](changed-files.json),
[image replacements](image-conversion.json) and [build/device-test commands](RELEASE-TESTING.md).
The local release AAB uses a test signing key; Play measurements and device tests
are still pending.

## Baseline and root cause

The latest completed EAS production build is
`fc3fac68-f06e-4163-bb2c-0e195bdfc6b6`, created 13 October 2026, version `1.0.0`,
Android code `3`. Its actual AAB was downloaded from the EAS artifact URL and
inspected. EAS history is not evidence of the current Play track or of reserved
codes in other tracks/drafts. The candidate `1.0.1` / `4` needs that final check.

EAS records commit `d9e2a02` for the baseline, while this checkout starts at
`3cf3c66`. The recorded commit still has code 1 and predates the version 3/R8
configuration, but the downloaded artifact has code 3, R8 mappings and the same
permissions as the current generated manifest. The recorded commit therefore
does not reconstruct the uploaded working tree. Comparisons here use the actual
version 3 artifact, not a rebuild of that commit; see `provenance.json`.

| Version 3 component | Uncompressed entries | ZIP-compressed entries |
| --- | ---: | ---: |
| Android resources | 210.257 MB | 208.072 MB |
| Product fallback PNGs (292) | 185.906 MB | 184.684 MB |
| Brand fallback PNGs (78) | 11.732 MB | 11.621 MB |
| Subcategory fallback PNGs (27) | 7.260 MB | 7.226 MB |
| Category fallback PNGs (5) | 1.566 MB | 1.561 MB |
| Other mapped UI images (5) | 1.959 MB | 1.957 MB |
| Fonts (4) | 0.378 MB | 0.173 MB |
| Hermes bundle | 5.729 MB | 2.313 MB |
| DEX (2 files) | 9.217 MB | 3.795 MB |
| Native libraries, arm64 | 19.387 MB | 6.328 MB |
| Native libraries, all four ABIs | 74.341 MB | 25.613 MB |
| Metadata/other, including mappings and debug symbols | 115.942 MB | 25.889 MB |

Indented concepts in this table overlap: product/brand/category/UI/font rows
describe resources and must not be added to the resource total. ARM64 is included
in the all-ABI total. See the raw JSON for exact byte counts and every entry.

The AAB upload is **266,002,732 bytes**. Bundletool 1.18.2 estimates a device APK
download range of **219,531,525–221,149,506 bytes**. The fixed ARM64/API 35/English/
480 dpi specification in this report gives **220,500,894 bytes**. These are local
bundletool estimates, not fresh Play Console measurements.

The main measured cause is the catalogue fallback images. `productImages.js`
statically requires them, so Metro bundles every map entry even when a remote
photo overrides it at runtime. R8 and resource shrinking cannot remove assets
that the application references. The actual AAB resource paths confirm the
catalogue's contribution; this conclusion does not rely on npm directory sizes.
PNG crunching slightly changed many files, so raw-file hash matching alone
under-counts their presence; `v3-resource-groups.json` groups actual artifact paths.

The largest local asset is `assets/images/banner.png` (2,450,585 bytes), followed
by QK Multigrain Oats (2,049,675), Long Beans Payeru (1,959,841), Knorr vegetable
soup (1,678,613), and Cashew Split (1,583,404). Full rankings, dimensions and modes
are in `assets-before.json`; references, hashes, package versions and dependency
inventories are in `local-before.json`.

The largest ARM64 native libraries are React Native (5,878,432 bytes), Hermes
(2,136,264), Reanimated (1,429,280), generated app modules (1,405,856), Expo core
(1,334,176), and libc++ (1,292,904). AVIF/WebP/GIF decoding libraries are separately
listed in `v3-arm64-libraries.json`. Generated modules and DEX combine multiple
dependencies, so no unsupported per-package size attribution is made.

## Changes and decisions

- Convert referenced catalogue/category photographs to WebP quality 90. Keep
  original dimensions and verify every alpha sample after decoding. Brand logos
  and other small UI graphics use lossless WebP and must retain all RGBA samples.
  Keep a PNG whenever WebP would be larger. `image-conversion.json` records exact
  paths, original/replacement hashes, byte sizes and validation for each change.
- Preserve local fallbacks: the code explicitly documents products whose remote
  image array is empty. Deleting their map would remove useful production images.
  No catalogue images were copied from a remote service into the bundle. Remote
  admin image precedence and Cloudinary URL handling remain unchanged.
- Remove `expo-clipboard`, `expo-haptics`, `expo-symbols`, `expo-web-browser`.
  None is imported, dynamically loaded, configured as a plugin or depended on by
  another installed package. Keep required image picker, crypto, maps/directions,
  location, Firebase, navigation and animation modules. No remaining dependency
  version is intentionally upgraded.
- Keep all four font weights: they are loaded in `App.js` and exposed through
  the existing Tailwind font families. Their combined local cost is only
  378,140 bytes. No vector-icon fonts appear in the baseline bundled resources.
- Keep GIF and WebP decoders. Remote content formats are not constrained by this
  audit, and local fallbacks now require WebP. Animated WebP remains disabled by
  Expo's existing generated default. Avoid changing decoding behavior for a
  small secondary gain.
- Keep R8 and resource shrinking enabled. Leave bundle compression at its default
  false: the AAB already compresses Hermes from 5.729 to 2.313 MB, and Hermes is
  a small fraction of the download. No measured startup trade-off warrants a
  configuration change. Compression-on/off startup benchmarking was not possible
  without a device.
- Unreferenced local assets are listed as candidates, not automatically deleted.
  The Android export excludes them; deleting them would save zero measured
  download bytes. Some are store artwork or historical payment assets. The old
  `dist/` web export is stale and excluded from EAS uploads.
- Keep production `buildType: app-bundle`, all supported ABIs and default split
  delivery. `.easignore` now explicitly excludes local generated native projects
  and reports, preserving EAS's configuration-generated build and signing flow.

App identity, Firebase/Render/UPI configuration, checkout logic, Firestore rules,
account deletion and location permissions were not changed. See
`production-invariants.json` for source-file equality checks. The four image maps
change extensions only; lookup keys and resolution behavior are identical.
The generated merged release manifest also confirms `in.mstraders.grocery`,
`1.0.1` / `4`, and an identical permission set to the version 3 artifact; see
`candidate-manifest-check.json`.

## Verification and limits

All **407** conversions completed: their original files totaled **212,044,763**
bytes and replacements total **39,057,306** bytes. Including unchanged artwork
and fonts, the complete local assets tree fell from **215,906,399** to
**42,918,942** bytes, a **172,987,457-byte (80.12%)** reduction. These source-tree
measurements are distinct from the release-artifact and download measurements.

The baseline Android/Hermes export completed. Source-level checks verify every
image-map path, remote priority, local fallback, generic seed fallback and empty
states. Conversion verifies dimensions and alpha, plus exact RGBA for lossless
outputs. Sample images were visually compared (`quality-comparison.jpg`). Lossy
photo compression still needs human review at production detail-view size.

`npm run lint` completed successfully. `git diff --check` passed. The first native
attempt ran while conversion was still changing assets and failed at Metro's
asset resolution. The follow-up release build against the completed asset tree
succeeded, and bundletool validated its AAB. All 407 replacement image hashes
match packaged resources. See `MEASUREMENTS.md` and `release-build.log`.

Expo Doctor returned **16/18 checks passed**, before and after dependency removal.
Its schema check timed out connecting to `exp.host`; the React Native Directory
check received an unexpected server response. These are unresolved online checks,
not an 18/18 pass. `expo install --check` found dependencies up to date against
the installed SDK's local map, with an offline-validation warning.

No Android device was connected. Startup, sign-in, photo selection, browsing,
cart, checkout, UPI handoff, history, deletion and delivery location have not been
proven on a release device. Use `RELEASE-TESTING.md` for the exact test matrix and
build/install/measurement commands. Production readiness remains conditional on
those tests and Play Console evidence.

Upload size includes all architectures and build metadata. Play's download is a
compressed device-specific APK set. Installed size additionally depends on
extraction, ART, data and caches. The user's approximately 217/226 MB figures
cannot be directly subtracted from an AAB's size, or compared without the same
device and metric. No installed disk measurement or new Play Console number is
available from this environment.

Reference: [Google's bundletool commands](https://developer.android.com/tools/bundletool)
and [Expo local app version management](https://docs.expo.dev/build-reference/app-versions/).
