# Responsive layout verification

Checked the actual shared React Native banner/product-card components with sample products, plus the admin login, navigation shell, page actions, stat cards and modal. No production sign-in or data changes were made.

Browser viewports: 320×568, 360×800, 390×844, 414×896, 768×1024, 1024×768, 1440×900 and 844×390. All 32 viewport/component combinations passed readiness, runtime-error, horizontal-overflow and unintended text-clipping checks. An additional 360 px case simulated a 1.5 font scale and larger rendered text; its layout also fit. Results are in `browser-results.json`.

Grid sizing also passed 40 combinations of pane widths (240–1440 px) and font scales (1, 1.3, 1.5 and 2). Checks verify that columns fit their pane and larger text reduces column count when needed.

Changes include content-sized hero banners, measured responsive grids, scalable product labels and badges, cart controls that stack on narrow cards, more space for enlarged tab/cart text, rotation-aware product photos, and wrapping/scrolling admin layouts. Original logo artwork is preserved.

These checks cover shared components and representative layouts. Physical Android/iOS devices, native keyboards, authenticated live-data screens and every possible device/font configuration have not been exhaustively tested.

Final validation: admin production build passed; Android and iOS production JavaScript/Hermes exports passed; 138 source files parsed successfully; both repositories passed `git diff --check`.
