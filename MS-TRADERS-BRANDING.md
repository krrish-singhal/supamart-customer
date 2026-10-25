# MS Traders branding implementation

Source of truth: `MS-Traders-logo-guide.pdf` and the original `MS-Traders-logo-kit/` (the two supplied guide PDFs are identical).

- App headers use `BrandBadge` with the supplied horizontal colour PNG. The welcome screen uses the reversed lockup on MS Green. The artwork contains the outlined Poppins lettering; no wordmark is rendered as text.
- Admin headers use `BrandMark` with the original SVGs: colour on light surfaces and reversed on MS Green. Both components preserve proportions, reserve at least one handle-height of clear space, and keep horizontal artwork at least 120 px wide. No logo shadows, borders, rotation or recolouring are applied.
- Interface font: bundled Plus Jakarta Sans, ExtraBold for headings and Regular/SemiBold for text. Legacy app `Inter-*` declarations resolve to Jakarta for compatibility; icon fonts and nested text inheritance are preserved. Admin fonts are hosted locally.
- Brand colours: MS Green `#0A7C47`, Handle Amber `#FFB020`, Ink `#121712`, Shelf White `#F3F5F2`. Amber in the artwork is preserved in the original files.
- `assets/icon.png` is the supplied full-bleed app icon. `assets/adaptive-icon.png` is the supplied maskable icon on MS Green. Splash artwork is the supplied colour symbol on Shelf White. Expo configuration points to these files; local generated Android resources have also been refreshed.
- Admin `public/` contains the kit's browser icons, manifest and head links. The notification logo is the supplied small-size colour symbol. App web favicon configuration uses the supplied 48 px favicon.

Native launcher/splash changes require a new app binary. The `android/` directory is generated and ignored by git; future prebuilds regenerate its branding from `app.config.js` and the tracked assets.
