const { html } = require('../vendor/splashBundle');
function createSplashDocument({ reducedMotion = false, paused = false } = {}) {
  return html.replace('<html lang="en">', `<html lang="en" data-reduced-motion="${Boolean(reducedMotion)}" data-paused="${Boolean(paused)}">`);
}
module.exports = { createSplashDocument };
