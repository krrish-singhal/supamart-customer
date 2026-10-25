# App size cleanup — 23 October 2026

Production Android Metro export content fell **58.38 → 26.61 MB**, a **31.77 MB (54.42%)** reduction. These are decimal MB of raw bundled content, not a complete AAB, an installed app size, or a Play Console download measurement.

| Measured component | Before | After |
| --- | ---: | ---: |
| Exported image/font assets | 46.91 MB | 17.09 MB |
| Hermes bytecode | 11.44 MB | 9.49 MB |
| Total with export metadata | 58.38 MB | 26.61 MB |
| Source assets directory | 54.52 MB | 17.89 MB |

`android-export.json` records exact bytes. `assets.json` records each image conversion and removed file. The two exports are at `/tmp/supamart-size-before` and `/tmp/supamart-size-after` for this session.

## Changes

- Optimized 445 referenced catalogue/category/brand images during the pass. Product photographs fit within 640 × 640 pixels, categories within 480 × 480, and brand logos within 320 × 320. Photographs use quality-82 WebP; brand logos use lossless WebP after resizing. Transparency is checked against the resized source. A conversion is retained only if it saves bytes. Seventeen optimized photos subsequently became unused after cleaning overwritten mappings and were removed.
- Removed 77 unused assets, including obsolete Inter fonts, starter icons, old category artwork and redundant product photos. Native application icons, production brand assets, Play listing artwork, banner density variants and the designer splash inputs remain available.
- Removed three unreachable legacy modules: ProductSortModal, homeCategoryImages and homeSections. Kept splashBridge, which the build reads dynamically.
- Removed 21 overwritten product-image entries, retaining the original key order and effective image value for every key. This preserves substring lookup behavior as well as exact matches.
- Replaced full Lucide catalogue imports with a local module exporting only the app's 81 selected icons using Lucide's public per-icon exports. An alias check verifies that existing symbols such as Home and CheckCircle still point to the same library icons.
- Removed unused direct dependencies `@expo-google-fonts/inter`, `@react-navigation/stack` and `@expo/vector-icons`. Expo still retains vector-icons transitively. The package lock was updated offline, without intentional package upgrades. Required payment QR, maps, Firebase, location, image picker and navigation dependencies remain.
- Removed the broken reset-project npm command and stale generated web dist folder. Build inputs for the splash are preserved. Local design documentation and tests are excluded from EAS uploads; reports and generated native projects were already excluded.
- Retained production Android App Bundle output, R8 minification, resource shrinking, Hermes and existing architecture support. These settings already existed. Architecture splits let Play select the appropriate device files; deleting supported architectures would not remove shared images from a device download.

The read-only `npm run size:audit` lists unused asset candidates. `--apply` is deliberately guarded once a conversion report exists, to prevent repeatedly recompressing photographs. Review new changes and preserve their originals before a future optimization pass. The deduplication helper is also safe to rerun and verifies effective map equality.

Original assets and removed legacy modules are backed up under `/tmp/supamart-original-assets`, outside the app. That directory is temporary and should be copied elsewhere if long-term original files are needed. Historical QA reports, the logo kit, designer source and repository history have been preserved.

## Validation

- Production Android export completed after cleanup, resolving every referenced asset and icon module.
- Customer tests: 14 passed, covering asset resolution, icon aliases, designer splash and location search.
- Customer lint: zero errors; 30 existing warnings remain.
- Nodemailer security-email tests: three passed. Email delivery continues through the existing SMTP credentials, with no additional verification API or email provider. Six-digit user authentication remains in place.
- Sample product images and a brand logo were visually compared before/after at normal display sizes. Native device detail views and the final signed release still need device review.

The obsolete reset-link email helper was removed from the backend; password reset and deletion send code emails through Nodemailer only. No deployment, real email send, signing change, Play upload, or release was performed.

To obtain an actual Play download size, build the upload-signed production AAB with the existing EAS production profile and use Play Console or bundletool with a fixed device specification. Native binaries, DEX, Android resources, ZIP compression and device-specific split delivery are not included in the Metro export numbers above.
