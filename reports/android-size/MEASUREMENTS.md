# Before/after Android measurements

Decimal MB; exact bytes are retained in `measurements.json`, `v3-aab.json` and `v4-aab.json`.

| Metric | Version 3 | Candidate 4 |
| --- | ---: | ---: |
| AAB upload | 266.003 MB | 97.640 MB |
| Estimated download, fixed ARM64 device | 220.501 MB | 52.168 MB |
| Resources, ZIP bytes | 208.072 MB | 39.759 MB |
| Hermes, uncompressed | 5.729 MB | 5.729 MB |
| DEX, uncompressed | 9.217 MB | 9.152 MB |
| Native ARM64, uncompressed | 19.387 MB | 19.387 MB |
| Local assets, all files | 215.906 MB | 42.919 MB |

The fixed-device estimated download saves **168.333 MB (76.34%)**. AAB upload saves **168.363 MB (63.29%)**.

All-device estimated download range: **219.532–221.150 MB → 51.199–52.816 MB**. The same bundletool 1.18.2 and test signing key were used for both APK sets. Fixed device: ARM64, API 35, English, 480 dpi (`device-arm64-api35.json`).

Almost all measured savings come from resources. Hermes and native libraries are effectively unchanged; aggregate DEX decreases by 65,112 uncompressed bytes. That aggregate is not a precise per-package attribution. The four unused module removals are secondary to image compression.

The final release build succeeded (`:app:bundleRelease`, 14m 48s, 586 tasks). It uses a **local test/debug signing key**, release optimization and production values from `eas.json`. It is a measurement AAB, not the upload-signed production artifact. Build the upload-signed AAB with the EAS command in `RELEASE-TESTING.md`.

Artifact: `android/app/build/outputs/bundle/release/app-release.aab`. SHA-256: `8c45db48b3d135f8d30f4a990cd386bf09671743d40235c5af0af0fcd9148880`. Bundletool validation passed. All 407 replacement image hashes were found in its packaged resources. `v4-bundle-config.json` and the generated APK set confirm ABI, language and density split delivery remains available.

Installed disk usage and new Play Console values are **not measured**. APK file/entry sizes in the device APK reports are diagnostic archive sizes, not installed disk usage. Physical-device smoke tests remain pending. No AAB was uploaded and no release was published.
