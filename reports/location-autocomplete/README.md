# Delivery-location autocomplete

## Behavior

- Suggestions start automatically at three trimmed characters, after a 600 ms typing pause.
- Search uses Photon with OpenStreetMap place data, biased toward the existing Menamkulam store coordinates. Named suggestions include address context and distance from the store.
- Selecting a suggestion dismisses the keyboard and dropdown, recenters the existing Leaflet map, and places its delivery marker at the exact returned latitude/longitude. The selected place name remains visible in the address sheet; reverse geocoding can fill address details without moving the point.
- GPS permission is not required for autocomplete. Existing GPS, manual pin movement, address confirmation, pricing, and delivery-radius validation remain in place.
- Searches cancel when the input changes, clears, the screen loses focus, or unmounts. Generation checks suppress responses from stale requests. Requests time out after eight seconds and repeated queries use a bounded five-minute memory cache.
- Loading, empty, and error states appear inline. Failed requests offer Retry. The scrollable suggestions list allows selection while the keyboard is open.

## Files

- `src/screens/DeliveryLocationScreen.js`: automatic search, suggestions UI, exact marker selection, and selected-name preservation.
- `src/services/locationSearch.js`: Photon client, coordinate validation, named address normalization, cancellation, timeout, and cache.
- `test/location-search.test.js`: seven service regression tests using Node's built-in test runner. Run `node test/location-search.test.js` from `customer`.
- This directory contains browser results and screenshots.

No dependencies, API keys, or environment changes were added. Photon supports [search-as-you-type and location bias](https://github.com/komoot/photon), with [API parameters documented here](https://github.com/komoot/photon/blob/master/docs/api-v1.md). Its public service is best-effort; the UI handles unavailability without preventing manual map selection.

## Verification

- Targeted ESLint for the screen, service, and tests: passed.
- Seven service tests: passed (threshold, exact coordinates/address labels, invalid/duplicate features, bounded results, cache, HTTP/malformed response failures, and request cancellation).
- Existing delivery-area regression tests: 14 passed.
- Live public-place lookups for `men` and `Menamkulam`: returned named local suggestions, including Menamkulam, Menamkulam Flyover, and Menamkulam road.
- Isolated web and Android Hermes exports of the actual delivery screen and map: passed. The temporary preview stubs account/configuration and Expo GPS/reverse-geocoder responses, without changing project configuration.
- Headless Chrome checks: three-character threshold, debounce, named addresses, exact map recenter/marker coordinates, selected place name, cleared/stale result suppression, empty/error/retry UI, existing outside-radius blocking, and suggestion bounds at 320×568, 393×852, and 430×932. See `browser-results.json`. Browser autocomplete checks use deterministic provider responses; live provider lookups were checked separately.
- Full `npm run lint`: ran; 11 errors and 29 warnings remain in unrelated existing files. No diagnostics in the changed screen, service, or tests.

Native Android/iOS keyboard behavior and physical-device rendering still require device verification; Hermes export is a bundle check, not an emulator run.
