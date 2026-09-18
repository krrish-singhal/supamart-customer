import 'dotenv/config';

export default {
  "name": "MS Traders",
  "slug": "supamart-customer",
  "version": "1.0.0",
  "orientation": "portrait",
  "icon": "./assets/icon.png",
  "scheme": "supamart",
  "userInterfaceStyle": "automatic",
  "newArchEnabled": true,
  "splash": {
    "image": "./assets/logo.png",
    "resizeMode": "contain",
    "backgroundColor": "#ffffff"
  },
  "ios": {
    "supportsTablet": true,
    "bundleIdentifier": "in.makewithus.supamart",
    "infoPlist": {
      "NSLocationWhenInUseUsageDescription": "MS Traders uses your location to find stores near you and deliver to your address.",
      "NSLocationAlwaysAndWhenInUseUsageDescription": "MS Traders uses your location to find stores near you and deliver to your address.",
      "NSCameraUsageDescription": "MS Traders uses your camera to let you update your profile photo.",
      "NSPhotoLibraryUsageDescription": "MS Traders accesses your photos to let you update your profile photo."
    }
  },
  "android": {
    "package": "in.makewithus.supamart",
    "versionCode": 1,
    "adaptiveIcon": {
      "foregroundImage": "./assets/adaptive-icon.png",
      "backgroundColor": "#ffffff"
    },
    "edgeToEdgeEnabled": true,
    "permissions": [
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.CAMERA",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.RECORD_AUDIO"
    ],
    "config": {
      "googleMaps": {
        "apiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ""
      }
    }
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
        "image": "./assets/logo.png",
        "imageWidth": 200,
        "resizeMode": "contain",
        "backgroundColor": "#ffffff"
      }
    ],
    [
      "expo-location",
      {
        "locationAlwaysAndWhenInUsePermission": "MS Traders uses your location to find stores near you and deliver to your address."
      }
    ],
    [
      "expo-image-picker",
      {
        "photosPermission": "MS Traders accesses your photos to let you update your profile photo.",
        "cameraPermission": "MS Traders uses your camera to let you update your profile photo."
      }
    ],
    "@react-native-community/datetimepicker"
  ],
  "owner": "krrish-singhal-17"
};
