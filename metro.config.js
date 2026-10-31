const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const fs = require("node:fs");
const path = require("node:path");

const bundleSplashScript = path.join(__dirname, "scripts", "bundle-splash.cjs");
if (fs.existsSync(bundleSplashScript)) {
  try {
    const { bundleSplash } = require(bundleSplashScript);
    bundleSplash();
  } catch (_e) {
    // Non-fatal if designer splash source assets are omitted
  }
}

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
