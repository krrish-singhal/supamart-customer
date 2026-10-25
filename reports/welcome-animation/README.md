# Welcome animation verification

Implemented in `src/screens/WelcomeScreen.js` using the existing Expo / React Navigation architecture, Reanimated 4, react-native-svg, Lucide icons, and Plus Jakarta Sans fonts. No dependencies added. The emerald background asset is reused unchanged. The square and M paths come from the existing reversed SVG logo; the handle uses the equivalent arc centerline with a 24-unit stroke.

## Timeline

- 0–0.8 seconds: white square fades, scales, and springs down into position.
- 0.46–0.92 seconds: yellow handle draws behind the square.
- 0.82–1.12 seconds: original vector M fades and scales into place.
- 1.1–1.85 seconds: title, tagline, and yellow underline enter in order.
- 1.65–4.05 seconds: logo colors pass through yellow, dark, and white surfaces and return to the primary green M on white. The background and text retain their readable brand colors.
- 3.5–4.15 seconds: CTA slides and fades in, followed by the login link. The shared intro clock ends at 4.3 seconds.
- Eight low-opacity edge illustrations float continuously with independent delays, durations, horizontal drift, and small rotations. They ignore touches and are hidden from accessibility services.

Reduced motion immediately displays the final branding and controls, disables floating and press scaling, and responds to preference changes during the intro. Animations cancel on unmount and pause when the route loses focus. Returning to the screen shows its completed intro. Scrollable content supports short viewports and larger accessibility text; the button stays near the bottom on ordinary phone sizes.

## Checks

- `npx eslint src/screens/WelcomeScreen.js`: passed with no warnings or errors.
- `npm run lint`: ran; blocked by existing issues elsewhere (12 errors and 29 warnings), including the malformed opening ScrollView tag in `src/screens/HomeScreen.js:566` and unescaped JSX text in other screens. No WelcomeScreen diagnostics.
- Full app web export: attempted; blocked by the same HomeScreen syntax error. Those unrelated files were left untouched.
- Isolated preview web export: passed.
- Isolated preview Android Hermes export: passed. This verifies bundling, rather than native device rendering.
- Chrome browser checks on the actual WelcomeScreen with a real React Navigation native stack and the existing LoginScreen: see `browser-results.json`. Authentication context was stubbed in a temporary preview outside the project; no authentication requests were made and no project environment files were changed.
- Browser checks cover logo formation order, handle stroke drawing, changing SVG fills, final brand colors, eight independently moving icons, default Login navigation from each button, both callback overrides, reduced motion at startup, live reduced-motion changes, layout bounds, and runtime exceptions.
- Layout screenshots: 320×568, 360×640, 393×852, 430×932, 768×1024, and 568×320. Landscape content scrolls vertically. Each viewport was freshly loaded before capture to avoid browser viewport scaling artifacts.
- Background resolution was confirmed visually in the screenshots and by successful asset bundling.

## Remaining device checks

ADB could not start in this environment (`could not install smartsocket listener: Operation not permitted`), so native playback was not verified. Check spring feel, SVG stroke/fill rendering, Android performance, iOS/Android safe areas, system text scaling, screen-reader behavior, and repeated navigation on a device. The existing HomeScreen parse error must be corrected separately before the full application can build.
