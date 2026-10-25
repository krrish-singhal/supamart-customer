# Customer feedback implementation — 22 October 2026

Changes are in the customer and backend working trees. Existing branding and responsive-layout work was preserved. No production deployment, APK build, or store release was performed.

## Changes

- Login uses the usable screen height to size decorative images, typography and spacing. Very short viewports and the keyboard hide the decorative grid. Scrolling remains available for keyboard and accessibility overflow.
- Home daily essentials and best-deal previews show at most four products. See all opens the full product/category view. Search suggestions also show at most four products; See all results opens the full search grid.
- Search starts at one character with a 180 ms debounce. Short prefixes such as `To` are no longer discarded as stopwords. Request sequencing prevents older results replacing the latest query.
- Home, cart, checkout and the top free-delivery notification use one shared `/config` snapshot and the same threshold. Remaining spend decreases toward a fixed target, reaching zero when unlocked. No fictitious extra discount target is advertised.
- A new top notification slides in when free delivery is unlocked, can be dismissed, and automatically hides after 4.5 seconds. Dropping below the threshold resets it for the next crossing.
- Reusing Current Location now updates the existing address's GPS coordinates instead of selecting the old pin. Checkout reloads the current default address, reports the measured distance for an outside pin, and links directly to edit the address/GPS pin. The inclusive 5 km policy is preserved.
- Sign-in checks the account's saved addresses. Returning customers with addresses enter home; accounts without addresses enter onboarding. Temporary address-fetch failure does not force repeat onboarding.
- Home, cart, checkout and payment confirmation format the real address/locality, removing Current Location placeholders and duplicate address components. If geocoding is unavailable, valid coordinates remain visible instead of a fabricated locality.
- Help & Support displays actual account orders and an empty state for new accounts. Order detail and confirmation no longer manufacture sample orders/items/totals.
- Fixed arrival promises were removed from home, cart and checkout. Active orders have a distance-based saved arrival estimate; the display changes with elapsed time and fresh rider location. Overdue estimates say the arrival time is being updated. Delivered/cancelled orders do not produce a home ETA.
- The welcome screen follows the green reference layout, white bag/gold handle logo, yellow progress line and bottom actions. Eight grocery outline icons continuously drift and rotate. Reduced-motion preferences are respected. Native splash configuration uses the matching reversed symbol and green background.
- Buy Again loads the account's complete delivered purchase history, deduplicates product/pack combinations, fetches current products/prices, and supports one-tap add. Products deleted from the catalog are omitted; unavailable packs cannot be added.
- Delivery instructions offer Leave at door, Don't ring the bell, Call when you arrive, and a custom landmark/gate note. They are saved in order notes and shown in order details and the existing partner note area.
- Shopping Lists saves a named snapshot of the cart to the account, supports deleting saved lists, and adds a list's available quantities with one cart update. Current prices/stock apply. Lists are removed on account deletion.
- Delivered order details support overall order stars, individual purchased-product stars and an optional review. Backend validation enforces ownership, delivered status, integer ratings from 1–5, purchased products and no duplicate product ratings.

## Config observed

Read-only verification of `https://supamart-backend-353k.onrender.com/api/config` returned:

- Shop: latitude 8.5636625, longitude 76.860234375, Menamkulam.
- Service radius: 5 km, inclusive, straight-line distance.
- Delivery tiers: ₹20 up to 2 km; ₹40 up to 5 km.
- Minimum order: ₹0. Tax: 18%.
- No free-delivery threshold field was present in the live response.

The backend already used a ₹2,500 free-delivery constant; home incorrectly used ₹200. The implementation preserves ₹2,500 as the default and publishes `freeDeliveryThreshold` in `/config`. A configured nonnegative threshold overrides the default consistently in backend and customer billing. This source change has not modified the live endpoint.

## Verification

- Backend: **37 tests passed**, including HTTP search/list/history/rating tests, account isolation, account-deletion cleanup, client/server delivery parity, real order-service acceptance at 1 km and exactly 5 km, rejection beyond the boundary, and configurable free delivery.
- Customer lint: **0 errors**; existing unrelated warnings remain.
- Android production JavaScript/Hermes export: passed; 4,078 modules and 449 assets resolved. This is an export check, not a signed installable APK.
- Customer and backend `git diff --check`: passed.
- Isolated browser preview of the actual login and welcome components, with mocked sign-in: no runtime exceptions. Login had no horizontal or vertical overflow at 320×568, 360×640, 393×852, 430×932 and 768×1024. All eight background icons changed transform during the motion check. See `visual-qa.json` and the PNG screenshots beside this report.

## Deployment and remaining device verification

Deploy the backend changes before using the new shopping-list, buy-again and ratings endpoints. Then rebuild the Android preview APK so the native splash configuration and customer changes are included:

```bash
cd customer
npx eas-cli@latest build --platform android --profile preview
```

No Android device was connected. Real device verification remains necessary for login/logout with saved addresses, GPS permissions and pin refresh, keyboard/accessibility layouts, free-delivery notification stacking, UPI handoff, partner location updates, delivered-order ratings and list/cart behavior. Browser preview checks do not establish native end-to-end behavior or exact animation timing from a still reference image.
