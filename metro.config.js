const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { bundleSplash } = require("./scripts/bundle-splash.cjs");

bundleSplash();

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
