// Measurement build only: generated Expo Android project uses its debug signing key.
// The upload-signed production AAB must be built with EAS and the existing credentials.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const profile = require('../eas.json').build.production;
const root = path.resolve(__dirname, '..');
const result = spawnSync('./gradlew', [':app:bundleRelease', '--no-daemon', '--max-workers=2'], {
  cwd: path.join(root, 'android'),
  env: { ...process.env, ...profile.env, NODE_ENV: 'production' },
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
