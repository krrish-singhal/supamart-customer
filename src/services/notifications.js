import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import { navigationRef } from '../navigation/navigationRef';
import apiClient from './api';

// Detect whether running inside Expo Go client
export const isExpoGo = typeof isRunningInExpoGo === 'function' ? isRunningInExpoGo() : false;

// Dynamically require expo-notifications only in production/standalone builds.
// In Expo Go, requiring expo-notifications triggers SDK 53 deprecation warnings/errors.
let _Notifications = null;
function getNotifications() {
  if (isExpoGo) return null;
  if (!_Notifications) {
    try {
      _Notifications = require('expo-notifications');
    } catch (_) {
      _Notifications = null;
    }
  }
  return _Notifications;
}

// In production, configure notification handling behavior safely
const Notifications = getNotifications();
if (Notifications?.setNotificationHandler) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (_) {}
}

let isInitialized = false;

/**
 * Initialize system notifications, channels, and permissions.
 * Skipped completely in Expo Go (where remote notifications are removed in SDK 53+).
 * In production builds, safely initializes channels and attempts push token sync without crashing.
 */
export async function setupSystemNotifications() {
  if (isExpoGo) {
    return;
  }

  const notif = getNotifications();
  if (!notif) return;

  if (isInitialized) return;
  isInitialized = true;

  try {
    if (Platform.OS === 'android' && notif.setNotificationChannelAsync) {
      await notif.setNotificationChannelAsync('order_updates', {
        name: 'Order Updates',
        description: 'Real-time order tracking, status, and delivery delay alerts',
        importance: notif.AndroidImportance?.MAX ?? 5,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#059669',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      }).catch(() => null);
    }

    if (notif.getPermissionsAsync && notif.requestPermissionsAsync) {
      const { status: existingStatus } = await notif.getPermissionsAsync().catch(() => ({ status: 'undetermined' }));
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const permRes = await notif.requestPermissionsAsync().catch(() => ({ status: 'denied' }));
        finalStatus = permRes?.status || 'denied';
      }

      if (finalStatus !== 'granted') {
        return;
      }
    }

    // Try fetching push token for backend FCM sync in production builds
    // Wrapped in strict try/catch so missing google-services.json will NEVER crash production
    if (notif.getDevicePushTokenAsync) {
      try {
        const tokenObj = await notif.getDevicePushTokenAsync().catch(() => null);
        const pushToken = tokenObj?.data;
        if (pushToken && typeof pushToken === 'string') {
          apiClient.post('/auth/fcm-token', { token: pushToken }).catch(() => {});
        }
      } catch (_) {}
    }
  } catch (_err) {
    // Fail-safe: ensure setup error never bubbles up or crashes the app
  }
}

/**
 * Post an immediate notification to the system notification panel (drawer)
 * so it appears like WhatsApp, Swiggy, Zomato etc.
 * In Expo Go, this is a no-op to avoid unsupported warnings; in production,
 * it schedules a local notification with sound and vibration.
 */
export async function postSystemNotification({ title, body, data = {} }) {
  if (isExpoGo) {
    return;
  }

  const notif = getNotifications();
  if (!notif?.scheduleNotificationAsync) return;

  try {
    await notif.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        priority: notif.AndroidNotificationPriority?.MAX ?? 2,
        channelId: 'order_updates',
      },
      trigger: null, // immediate
    });
  } catch (_) {
    // Failsafe: never crash or show unhandled rejection
  }
}

// Add tap listener to handle clicks from system notification panel in production
if (Notifications?.addNotificationResponseReceivedListener) {
  try {
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data?.orderId && navigationRef?.isReady?.()) {
        navigationRef.navigate('OrderTracking', {
          orderId: data.orderId,
          orderNo: data.orderNo,
        });
      }
    });
  } catch (_) {}
}
