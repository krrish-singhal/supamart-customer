# Changelog

## Unreleased

### Added
- UPI payment flow: new `PaymentScreen` reached from Checkout when "Pay via UPI" is selected. Shows the server-computed order total, three UPI app buttons (Google Pay, PhonePe, Paytm) that open app-specific deep links with a generic `upi://pay` fallback, a QR code (`assets/images/qr.png`), and copy-to-clipboard UPI ID/phone. "I've Paid" marks the order `AWAITING_CONFIRMATION`; a secondary action lets the customer switch to Cash on Delivery instead. COD remains a one-tap checkout option, unchanged.
- Checkout now has a Payment Method selector (Cash on Delivery / Pay via UPI).
- New `CategoriesScreen` (Brands tab + Categories tab with an accordion of brands and sub-categories per category), reachable from Home's "Top Categories → View More" and via product-filter navigation into `ProductListScreen`.
- `getBrandLogo()` helper (`src/utils/getBrandLogo.js`) + `<BrandLogo>` component: brand.logoUrl → Simple Icons CDN guess → local placeholder, with `onError` fallback chaining so a missing logo never renders broken.
- Home screen restyled: single default `assets/images/banner.png` when no backend banners are configured, "Top Categories" 2x3 grid (top-level categories only) with a "View More" link to Categories.

### Changed
- `paymentMethod` enum: `UPI` (client-side test-flow that auto-marked orders PAID) renamed to `UPI_MANUAL`, which now starts `PENDING` and never auto-confirms — matches how UPI deep links actually work (no reliable success callback).
- `ProductListScreen` accepts an optional `brandId` param to filter by brand.
- Fixed a pre-existing bug in `CheckoutScreen` where `Image` (expo-image) and `ShoppingBag` (lucide) were used but never imported, which would have crashed the cart-items list whenever an item had no image.

### Backend (see `backend/CHANGELOG.md`)
- New `brands` collection + `/api/brands` CRUD, `category.parentId` (sub-categories), `product.brandId`, `/api/products?brandId=` filter, `PATCH /api/orders/:id/payment-claimed`.
