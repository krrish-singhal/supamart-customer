# Release verification (pending physical-device execution)

Use a disposable test account and test orders. Account deletion is irreversible;
only delete the account created for this test. Do not trigger a real payment or
delete a customer's account as an automated smoke test.

1. Install the release APK splits on a physical Android device with at least one
   UPI app. Test a fresh install and an upgrade from the published version using
   compatible signing. A debug-signed local measurement build cannot upgrade the
   Play-signed app. Use a separate test device/profile or Play internal testing
   after the owner explicitly approves an upload.
2. Cold launch offline, then online. Check splash completion, font rendering,
   image loading and navigation. Record startup timing on the same device for
   baseline and candidate (multiple cold launches).
3. Sign in using Firebase. Restart and confirm session persistence. Sign out
   and sign back in. Verify password reset if applicable.
4. Choose a profile picture using the system photo picker; save, reopen the
   profile and check the uploaded image. Cancel the picker once as well.
5. Browse categories, brands, search results, product grid/list and details.
   Check local fallback photos, remote admin photos, missing-image placeholders,
   transparent edges and product packaging text at detail size. Repeat offline
   for bundled fallbacks. Compare with version 3 on the same display.
6. Add/remove cart items, change quantities and restart. Compare subtotal,
   discounts, delivery fees and checkout total with the baseline/server.
7. Complete a test COD checkout. For UPI, verify the payee, INR amount and note
   before handing off. Test installed-app handoff, generic fallback and return
   to the app. Cancelling or returning must not imply verified payment.
8. Open order history/details/tracking; confirm live Firestore updates.
9. On a disposable account, exercise cancellation of deletion, then successful
   in-app deletion/re-authentication. Confirm sign-out and backend result.
10. Deny location permission, grant approximate location, then precise location.
    Verify address entry, delivery-location detection and delivery map/routes.
    Confirm required permissions remain present in the release manifest.

No device was connected during the initial audit (`adb devices` returned an empty
list). Source checks and compilation do not establish that these flows pass.

## Build the upload-signed AAB without publishing

From `customer/`, verify the highest used version code in every Play Console
track/draft. The candidate is `1.0.1` / `4`, based on EAS history ending at `3`.
Use a higher unused code if Play has already reserved `4`.

```bash
npm ci
npx expo-doctor
npx expo install --check
npm run lint
node scripts/check-image-sources.cjs
mkdir -p /tmp/mstraders-release
eas build --platform android --profile production --local --output /tmp/mstraders-release/ms-traders-v4.aab
```

This uses the existing EAS production profile and signing credentials. It does
not submit to Play. Do not add `--auto-submit`. The profile's build type must
remain `app-bundle`. `.easignore` excludes generated local native projects so
EAS regenerates the production configuration from `app.config.js`.

## Reproduce the local size-measurement build

The generated Expo native project's default release configuration uses its
debug key. This build is for measurement/testing, not uploading to Google Play.
Run these commands from `customer/`:

```bash
CI=1 npx expo prebuild --platform android --no-install
ANDROID_HOME=/usr/lib/android-sdk JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 GRADLE_USER_HOME=/tmp/mstraders-gradle node scripts/build-android-size-release.cjs
python3 scripts/android-size-audit.py --artifact android/app/build/outputs/bundle/release/app-release.aab --output /tmp/mstraders-release/local-aab.json
```

Prebuild rewrites npm's `android`/`ios` convenience scripts; restore their original
`expo start --android` and `expo start --ios` values after local measurement.

## Measure and test device splits

Obtain bundletool from the official Google release page and set its path below.
Use the same bundletool version, signing key and device specification for both
artifacts. Bundletool-generated APKs use a test key here; do not upload them.

```bash
java -jar /tmp/bundletool.jar validate --bundle=/tmp/mstraders-release/ms-traders-v4.aab
java -jar /tmp/bundletool.jar build-apks --bundle=/tmp/mstraders-release/ms-traders-v4.aab --output=/tmp/mstraders-release/v4.apks --ks="$HOME/.android/debug.keystore" --ks-key-alias=androiddebugkey --ks-pass=pass:android --key-pass=pass:android
java -jar /tmp/bundletool.jar get-size total --apks=/tmp/mstraders-release/v4.apks
java -jar /tmp/bundletool.jar get-size total --apks=/tmp/mstraders-release/v4.apks --device-spec=reports/android-size/device-arm64-api35.json
adb devices
java -jar /tmp/bundletool.jar get-device-spec --output=/tmp/mstraders-release/connected-device.json
java -jar /tmp/bundletool.jar install-apks --apks=/tmp/mstraders-release/v4.apks
adb shell am force-stop in.mstraders.grocery
adb shell am start -W -n in.mstraders.grocery/.MainActivity
adb logcat -b crash -d
```

Installation and launch commands above are instructions for the tester; they
were not executed against a device during this audit.

## Play evidence still required

After an owner-approved future upload to a test track, compare versions 3 and 4
in App bundle explorer using the same device/ABI, Android version, language and
density. Record app download size and size on device separately. Save the
screenshots/export and highest reserved version code with this report. No Play
upload or publication is authorized by this checklist.

An AAB's upload bytes include all ABIs, mappings and debug symbols. Bundletool's
download estimate models compressed device APK delivery. Installed disk usage
also includes code extraction/compilation, data and caches and must be measured
on a device. None of these three numbers is interchangeable.
