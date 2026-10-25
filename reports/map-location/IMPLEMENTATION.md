# Keyless delivery map and continuous shop hours — 22 October 2026

Implemented in the customer, backend and admin working trees. Production has not been deployed and no signed APK has been built during this change.

## Delivery map

The previous decorative address map is replaced by a real OpenStreetMap/Leaflet map. The screen follows the supplied layout: floating back/search controls, a green delivery pin with a black tooltip, a store bag marker, GPS recenter control, rounded white location sheet, distance/fee row, red outside-area warning and green/disabled confirmation button.

- Pan the map or drag the marker itself to choose the delivery point. Distance and price refresh as the chosen point changes.
- The store's inclusive 5 km service area is drawn as a dashed geographic circle with a light fill. A separate control fits the whole service area into view.
- A blue GPS position/accuracy indicator is distinct from the selected delivery pin. A late GPS fix cannot replace a point the customer subsequently chose by hand.
- Search uses Expo Location's native geocoder. GPS permission is requested when GPS/native Android search requires it; manual map selection remains available when permission is declined.
- Reverse geocoding is debounced and protected against stale results. If it fails or exceeds five seconds, the exact coordinates are retained and street/PIN details can be entered in the address form.
- An unchanged saved address can be confirmed directly. A newly chosen point opens address details and saves its precise latitude/longitude as the delivery destination. Editing an existing address supports choosing its replacement pin on the same map. Small hand adjustments are preserved without rounding or a distance tolerance.
- Out-of-area points cannot be confirmed. The backend independently rejects orders outside 5 km, including cases where the distance display rounds down to 5.00 km.
- The quote uses the same config and billing function as checkout: ₹20 up to and including 2 km; ₹40 above 2 km through 5 km under the current tiers. Configured free delivery still applies to eligible carts. A missing delivery configuration blocks confirmation rather than inventing a quote.
- Network/map-tile failures have a retry action. OpenStreetMap attribution remains visible. Tiles use HTTPS and WebView caching; there is no offline tile download or prefetch feature.

## Google Maps removal

Removed `react-native-maps`, `react-native-maps-directions`, their lockfile entries and the Google Maps key/configuration from `app.config.js`. Customer tracking and partner delivery maps now use the shared keyless map component as well. Partner navigation opens the device's navigation app, with an OpenStreetMap browser fallback.

Leaflet **1.9.4** is bundled locally with its BSD licence so no JavaScript CDN is required at runtime. Native rendering uses Expo SDK 54's compatible `react-native-webview` **13.15.0**. There is no Google Maps API key to configure. Map tiles require an internet connection.

The dashed line between tracking positions is a straight-line location guide, consistent with the delivery-distance policy; it is not a calculated road route. External navigation provides road directions.

## Hours and slot removal

The canonical daily window is **10:00 AM inclusive to 11:00 PM exclusive, Asia/Kolkata**, every day, without breaks or slots.

- New orders are checked against server time before stock/order writes.
- A closing-time retry of an already-created order remains idempotent and does not create another order or deduct stock again.
- `/api/config` normalizes old stored slots to an empty list and publishes the continuous opening hours, on-demand delivery mode, current server time and shop status. Its cached response recomputes current status/time.
- Checkout no longer picks, displays or submits a delivery slot. Home/checkout show open/closed status and checkout blocks new orders when closed. Client status follows the shop's time zone and uses the config server-time offset when available.
- Existing order fulfilment and payment-claim endpoints remain available for already-placed orders after closing.
- New orders have `deliveryMode: ON_DEMAND` and no slot field. Historical orders retain schema compatibility with their old slot data.
- Seeds and admin settings reflect the continuous opening window. No production reseed or database migration was run or is required to normalize old config reads.

## Verification

- **43 backend tests passed**, including all 1,440 minutes of a day, opening/closing boundaries, uninterrupted midday ordering, old client slots being ignored, new slot-free order schema validation, exact 5 km acceptance, outside rejection, the reference pricing examples, idempotent closing-time retries and exact coordinate preservation.
- Customer lint: **0 errors**; existing warnings remain. New map components, location screen, store-status hook and tracking screen also passed a targeted lint check.
- Android JavaScript/Hermes production export passed. This is not a native signed APK build.
- Full customer web export passed after removal of native Google map imports.
- Admin production build passed.
- `git diff --check` passed in customer, backend and admin repositories.
- Browser interaction checks passed with real Leaflet/OpenStreetMap rendering: map panning, direct marker dragging, GPS recenter callback, dashed boundary presence, ₹20 at 1.5/1.6 km, ₹40 at 3.6 km, and disabled confirmation at 6 km.
- Confirmation forwarded the selected coordinates to address details. The button remained visible without horizontal overflow at **320×568, 360×640, 393×852 and 768×1024**. No browser runtime exceptions were reported.

Browser UI checks use isolated account/config fixtures and mocked Expo GPS/geocoder responses. They exercise the actual map, gesture bridge and screen, but do not establish physical GPS accuracy or native provider behavior. Screenshots and `map-qa.json` are beside this report.

## Activate and test on a phone

Deploy the backend first to activate server-enforced opening hours and the normalized config. Deploy the admin build for the updated settings notice. Rebuild the customer APK for the WebView dependency and native map removal:

```bash
cd customer
npx eas-cli@latest build --platform android --profile preview
```

No Maps API key is needed. EAS already excludes the local generated Android/iOS folders and regenerates native projects from the updated dependencies/configuration.

Native device checks remain: permission denial, GPS accuracy and late fixes, native geocoder search/reverse lookup, WebView loading after network loss, choosing/editing/saving a doorstep pin, checkout using that saved point, UPI return near closing, and customer/partner tracking.

Sources: [Leaflet distribution](https://leafletjs.com/download.html), [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/), [Expo WebView](https://docs.expo.dev/versions/latest/sdk/webview/).
