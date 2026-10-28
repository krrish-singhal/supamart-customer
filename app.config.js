import 'dotenv/config';

export default {
  "name": "MS Traders",
  "slug": "supamart-customer",
  "version": "1.0.1",
  "orientation": "portrait",
  "icon": "./assets/icon.png",
  "scheme": "mstraders",
  "userInterfaceStyle": "light",
  "newArchEnabled": true,
  "notification": {
    "icon": "./assets/notification-icon.png",
    "color": "#0A7C47"
  },
  "splash": {
    "image": "./assets/branding/transparent-splash.png",
    "resizeMode": "contain",
    "backgroundColor": "#0A7C47"
  },
  "ios": {
    "supportsTablet": true,
    "bundleIdentifier": "in.mstraders.grocery",
    "infoPlist": {
      "NSLocationWhenInUseUsageDescription": "MS Traders uses your location to find stores near you and deliver to your address.",
      "NSLocationAlwaysAndWhenInUseUsageDescription": "MS Traders uses your location to find stores near you and deliver to your address.",
      "NSCameraUsageDescription": "MS Traders uses your camera to let you update your profile photo.",
      "NSPhotoLibraryUsageDescription": "MS Traders accesses your photos to let you update your profile photo."
    }
  },
  "android": {
    "package": "in.mstraders.grocery",
    "versionCode": 4,
    "usesCleartextTraffic": true,
    "adaptiveIcon": {
      "foregroundImage": "./assets/adaptive-icon.png",
      "backgroundColor": "#0A7C47"
    },
    "edgeToEdgeEnabled": true,
    "permissions": [
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_BACKGROUND_LOCATION",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_LOCATION",
      "android.permission.POST_NOTIFICATIONS"
    ],
    "blockedPermissions": [
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.RECORD_AUDIO",
      "android.permission.CAMERA"
    ]
  },
  "web": {
    "favicon": "./assets/branding/favicon-48.png",
    "name": "MS Traders",
    "themeColor": "#0A7C47",
    "backgroundColor": "#0A7C47"
  },
  "extra": {
    "eas": {
      "projectId": "9f2328a5-f93a-4047-976d-a9f5ffba5139"
    }
  },
  "plugins": [
    [
      "expo-splash-screen",
      {
        "image": "./assets/branding/transparent-splash.png",
        "resizeMode": "contain",
        "backgroundColor": "#0A7C47"
      }
    ],
    [
      "expo-location",
      {
        "locationAlwaysAndWhenInUsePermission": "MS Traders uses your location to find stores near you and deliver to your address.",
        "isAndroidForegroundServiceEnabled": true,
        "isAndroidBackgroundLocationEnabled": true
      }
    ],
    [
      "expo-image-picker",
      {
        "photosPermission": "MS Traders accesses your photos to let you update your profile photo.",
        "cameraPermission": false,
        "microphonePermission": false
      }
    ],
    [
      "expo-build-properties",
      {
        "android": {
          "enableMinifyInReleaseBuilds": true,
          "enableShrinkResourcesInReleaseBuilds": true
        }
      }
    ],
    "@react-native-community/datetimepicker"
  ],
  "owner": "krrish-singhal-17"
};
