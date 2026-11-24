import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { auth } from './firebase';

export const BACKGROUND_LOCATION_TASK = 'SUPAMART_DELIVERY_BG_LOCATION';

export const isExpoGo =
  Constants?.appOwnership === 'expo' ||
  Constants?.executionEnvironment === ExecutionEnvironment?.StoreClient ||
  (typeof isRunningInExpoGo === 'function' && isRunningInExpoGo());

export async function canTrackInBackground() {
  if (Platform.OS === 'web' || isExpoGo) return false;
  try {
    return await TaskManager.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Retrieve a valid authorization token for background operations.
 * Auto-refreshes Firebase ID token if expired or near expiry,
 * while safely falling back to stored backend JWT tokens (30d duration).
 */
async function getValidAuthToken({ forceRefresh = false } = {}) {
  try {
    const authMode = await AsyncStorage.getItem('authMode');
    if (authMode === 'firebase' && auth?.currentUser) {
      try {
        const freshIdToken = await auth.currentUser.getIdToken(forceRefresh);
        if (freshIdToken) {
          await AsyncStorage.setItem('userToken', freshIdToken).catch(() => {});
          return freshIdToken;
        }
      } catch (_fbErr) {
        // Fall back to stored token
      }
    }
  } catch (_e) {}
  return await AsyncStorage.getItem('userToken');
}

// Register headless background location task
try {
  if (!isExpoGo && TaskManager && typeof TaskManager.isTaskDefined === 'function' && !TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
      if (error) {
        console.warn('[BackgroundLocation] Task error:', error.message);
        return;
      }
      if (data && data.locations && data.locations.length > 0) {
        const latest = data.locations[data.locations.length - 1];
        if (!latest?.coords) return;

        try {
          const partnerId = await AsyncStorage.getItem('@supamart_partner_id');
          if (!partnerId) return;

          let token = await getValidAuthToken({ forceRefresh: false });
          if (!token) return;

          const payload = {
            lat: latest.coords.latitude,
            lng: latest.coords.longitude,
            heading: latest.coords.heading ?? 0,
            speed: latest.coords.speed ?? 0,
          };

          const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
          const res = await fetch(`${apiUrl}/delivery-partners/${partnerId}/location`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });

          // If unauthorized (e.g. Firebase token expired after 60 min), refresh token and retry once
          if (res.status === 401) {
            const freshToken = await getValidAuthToken({ forceRefresh: true });
            if (freshToken && freshToken !== token) {
              await fetch(`${apiUrl}/delivery-partners/${partnerId}/location`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${freshToken}`,
                },
                body: JSON.stringify(payload),
              });
            }
          }
        } catch (_err) {
          // Silent fail in background to avoid disrupting OS task runner
        }
      }
    });
  }
} catch (taskDefErr) {
  console.warn('[BackgroundLocation] defineTask registration skipped:', taskDefErr?.message);
}

/**
 * Check location permission statuses cleanly
 */
export async function checkLocationPermissions() {
  try {
    const fg = await Location.getForegroundPermissionsAsync().catch(() => ({ status: 'undetermined' }));
    let bg = { status: 'undetermined' };
    if (Platform.OS !== 'web') {
      bg = await Location.getBackgroundPermissionsAsync().catch(() => ({ status: 'undetermined' }));
    }
    return {
      foregroundGranted: fg?.status === 'granted',
      backgroundGranted: bg?.status === 'granted',
      foregroundStatus: fg?.status || 'undetermined',
      backgroundStatus: bg?.status || 'undetermined',
    };
  } catch {
    return {
      foregroundGranted: false,
      backgroundGranted: false,
      foregroundStatus: 'undetermined',
      backgroundStatus: 'undetermined',
    };
  }
}

/**
 * Request Foreground Permission (Step 1 of Android sequence)
 */
export async function requestForegroundLocationPermission() {
  try {
    const res = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }));
    return res?.status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Request Background Permission (Step 2 of Android sequence, after Prominent Disclosure)
 */
export async function requestBackgroundLocationPermission() {
  try {
    if (Platform.OS === 'web') return true;
    const res = await Location.requestBackgroundPermissionsAsync().catch(() => ({ status: 'denied' }));
    return res?.status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Start background location tracking with persistent Android notification banner
 */
export async function startBackgroundTracking({ orderNo, partnerId } = {}) {
  try {
    if (!(await canTrackInBackground())) {
      return { success: false, reason: 'Background tracking requires a development or production native build.' };
    }
    if (partnerId) {
      await AsyncStorage.setItem('@supamart_partner_id', String(partnerId));
    }
    if (orderNo) {
      await AsyncStorage.setItem('@supamart_active_order_no', String(orderNo));
    }

    // 1. Verify foreground permission first
    const { foregroundGranted } = await checkLocationPermissions();
    if (!foregroundGranted) {
      const granted = await requestForegroundLocationPermission();
      if (!granted) {
        return { success: false, reason: 'Foreground location permission not granted' };
      }
    }

    // 2. Check if updates are already started
    const isStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
    if (isStarted) {
      return { success: true, alreadyRunning: true };
    }

    // 3. Start location updates with foreground service notification
    try {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000, // 10 seconds
        distanceInterval: 8, // 8 meters
        deferredUpdatesInterval: 10000,
        showsBackgroundLocationIndicator: false,
        foregroundService: {
          notificationTitle: 'MS Traders Delivery Partner',
          notificationBody: orderNo
            ? `Live tracking active for Order #${orderNo}`
            : 'Live location tracking active for active delivery',
          notificationColor: '#059669',
          killServiceOnDestroy: true,
        },
      });
      return { success: true };
    } catch (startErr) {
      console.warn('[BackgroundLocation] startLocationUpdatesAsync failed safely:', startErr?.message);
      return { success: false, error: startErr?.message };
    }
  } catch (err) {
    console.warn('[BackgroundLocation] startBackgroundTracking error:', err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Stop background location tracking and dismiss the persistent notification
 */
export async function stopBackgroundTracking() {
  try {
    if (!(await canTrackInBackground())) {
      await AsyncStorage.removeItem('@supamart_partner_id').catch(() => {});
      await AsyncStorage.removeItem('@supamart_active_order_no').catch(() => {});
      return { success: true };
    }
    const isStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
    if (isStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => {});
    }
    if (TaskManager && typeof TaskManager.isTaskRegisteredAsync === 'function') {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
      if (isRegistered) {
        await TaskManager.unregisterTaskAsync(BACKGROUND_LOCATION_TASK).catch(() => {});
      }
    }
    await AsyncStorage.removeItem('@supamart_partner_id').catch(() => {});
    await AsyncStorage.removeItem('@supamart_active_order_no').catch(() => {});
    return { success: true };
  } catch (err) {
    console.warn('[BackgroundLocation] stopBackgroundTracking error:', err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Check if background tracking is currently running
 */
export async function isTrackingActive() {
  try {
    if (!(await canTrackInBackground())) return false;
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
  } catch {
    return false;
  }
}
