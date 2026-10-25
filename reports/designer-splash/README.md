# Designer splash integration

The welcome route now renders the actual `Splash.dc.html` markup, CSS, SVGs, and DC logic. The previous separately drawn React Native welcome design has been replaced.

## Source and packaging

- `Splash.dc.html` remains the design source. Its bag drop, handle swing, M stroke drawing, ripple rings, staggered letters, color overlays, floating SVG icons, progress bar, and link styling are reused.
- Small source changes make the fixed 390×844 layout responsive: the root fills its viewport, icon positions scale proportionally, narrow screens reduce the title size, wide screens cap the CTA width, and short landscape screens can scroll. The app wraps the document in its existing safe-area provider.
- `vendor/react.js`, `vendor/react-dom.js`, and `support.js` run inside an isolated WebView (Android/iOS) or iframe (web). They do not replace or mix with the app's React runtime. The supplied vendor files and license headers remain intact.
- `scripts/bundle-splash.cjs` embeds the source, vendor scripts, runtime, and existing local Plus Jakarta Sans fonts into `src/vendor/splashBundle.js`. HTML parser control tokens inside embedded JavaScript are escaped without changing their runtime values. No CDN/font network request is needed.
- Metro regenerates the bundle at startup. After editing the designer source while Metro is running, use `npm run bundle:splash`, or restart Metro. Check freshness with `node scripts/bundle-splash.cjs --check`. Do not edit the generated bundle directly.
- `src/utils/splashDocument.js` applies motion preferences before the first frame. `src/utils/splashBridge.js` routes prototype link clicks back to the app and pauses animations off-screen.
- `src/components/welcome/DesignerSplash.js` and `.web.js` host the document. `src/screens/WelcomeScreen.js` retains navigation callbacks and native error recovery.

## Links

- `Locate.dc.html` / Get started invokes the existing `onFinish` override when supplied; otherwise it navigates to the actual `Login` route. The app requires sign-in before address setup; its existing AuthContext/Navigation flow then sends new customers to delivery setup.
- `Login.dc.html` / Log in invokes `onLogin` when supplied, or opens the actual `Login` route.
- Prototype filenames are never loaded as app pages. Duplicate taps and unknown document links are ignored. Web messages are accepted only from the splash iframe; native messages use the same action/channel allowlist.

## Validation

- Five Node regression tests passed: source/bundle parity, offline scripts/fonts, exact designer SVG/keyframes, script-tag boundaries, first-frame motion state, browser/native action dispatch, duplicate/unknown link suppression, and pause/resume state. Run `node test/designer-splash.test.js` from `customer`.
- Targeted ESLint passed for all changed JavaScript/config files.
- The VS Code CSS language service reported zero diagnostics across the stylesheet and 22 ordinary inline style blocks. DC-bound styles continue to use the runtime-supported `sc-camel-style` attribute.
- Isolated web and Android Hermes exports of the actual welcome and login screens passed. The preview uses the real React Navigation stack with a stub authentication context and does not send authentication requests.
- Browser integration results and screenshots are in this directory. Checks cover the original ten icons and ten animated letters, exact designer M path, animated floaters, final color-overlay settling, CTA reveal, local font availability, zero splash HTTP resource requests, six viewport sizes including landscape/tablet, both real Login redirects, callback overrides, and reduced motion.
- Full project lint still reports 11 existing errors and 29 warnings in unrelated files, including the existing HomeScreen parse error. Those files were not modified by this task.

Physical Android/iOS WebView playback, device back navigation, screen-reader navigation, and safe areas still need device verification. Hermes export verifies native bundling, not device rendering.
