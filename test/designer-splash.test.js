const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { bundleSplash } = require('../scripts/bundle-splash.cjs');
const { createSplashDocument } = require('../src/utils/splashDocument');
const root = path.resolve(process.cwd(), process.cwd().endsWith('customer') ? '.' : 'customer');

test('designer source, vendor scripts and fonts produce a current offline bundle', () => {
  assert.doesNotThrow(() => bundleSplash({ check: true }));
  const html = createSplashDocument();
  assert.doesNotMatch(html, /<script\s+src=/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com/);
  assert.match(html, /data:font\/ttf;base64,/);
  assert.match(html, /react\.production\.min\.js/);
  assert.match(html, /react-dom\.production\.min\.js/);
  assert.match(html, /dc-runtime/);
  assert.equal([...html.matchAll(/<script\b/g)].length, [...html.matchAll(/<\/script>/g)].length, 'Embedded HTML strings must not swallow script closing tags');
  const source = fs.readFileSync(path.join(root, 'Splash.dc.html'), 'utf8');
  for (const match of source.matchAll(/\bd="([^"]+)"/g)) assert.ok(html.includes(match[0]), 'Designer SVG path changed');
  for (const name of ['bagDrop', 'swing', 'drawM', 'ripple', 'letter', 'rise', 'fill', 'drift', 'cut', 'glow']) assert.ok(html.includes(`@keyframes ${name}`));
});

test('motion preferences are in the document before its first render', () => {
  assert.match(createSplashDocument({ reducedMotion: true, paused: true }), /<html lang="en" data-reduced-motion="true" data-paused="true">/);
});

function bridge(native = false) {
  const messages = [];
  const links = ['Locate.dc.html', 'Login.dc.html'].map(href => ({ getAttribute: () => href, setAttribute() {}, style: {} }));
  let click;
  const window = { parent: { postMessage: value => messages.push(JSON.parse(value)) }, requestAnimationFrame() {} };
  if (native) window.ReactNativeWebView = { postMessage: value => messages.push(JSON.parse(value)) };
  const document = { documentElement: { dataset: {} }, querySelector: () => ({}), querySelectorAll: () => links, addEventListener: (_name, handler) => { click = handler; } };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'src/utils/splashBridge.js'), 'utf8'), { window, document });
  const tap = link => { let prevented = false; click({ target: { closest: () => link }, preventDefault: () => { prevented = true; } }); return prevented; };
  return { window, document, messages, links, tap };
}

for (const native of [false, true]) test(`${native ? 'WebView' : 'iframe'} links dispatch app actions and prevent duplicate or unknown navigation`, () => {
  const b = bridge(native);
  assert.equal(b.messages[0].action, 'ready');
  assert.equal(b.tap(b.links[0]), true);
  assert.equal(b.messages.at(-1).action, 'start');
  b.tap(b.links[0]);
  assert.equal(b.messages.length, 2);
  b.window.__MSSplash.reset();
  b.tap(b.links[1]);
  assert.equal(b.messages.at(-1).action, 'login');
  b.window.__MSSplash.reset();
  b.tap({ getAttribute: () => 'Unknown.dc.html' });
  assert.equal(b.messages.length, 3);
  assert.ok(b.messages.every(message => message.channel === 'ms-traders-splash'));
});

test('leaving the screen pauses decorative motion and returning restores usable links', () => {
  const b = bridge();
  b.tap(b.links[0]);
  b.window.__MSSplash.setState({ paused: true, reducedMotion: true });
  assert.equal(b.document.documentElement.dataset.paused, 'true');
  assert.equal(b.document.documentElement.dataset.introComplete, 'true');
  b.window.__MSSplash.setState({ paused: false, reducedMotion: false });
  b.tap(b.links[1]);
  assert.equal(b.messages.at(-1).action, 'login');
});
