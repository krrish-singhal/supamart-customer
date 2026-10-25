import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { isRunningInExpoGo } from 'expo';

export const BACKGROUND_LOCATION_TASK = 'SUPAMART_DELIVERY_BG_LOCATION';

export const isExpoGo =
  Constants?.appOwnership === 'expo' ||
  Constants?.executionEnvironment === ExecutionEnvironment?.StoreClient ||
  (typeof isRunningInExpoGo === 'function' && isRunningInExpoGo());

async function canTrackInBackground() {
  if (Platform.OS === 'web' || isExpoGo) return false;
  try {
    return await TaskManager.isAvailableAsync();
  } catch {
    return false;
  }
}

// Safely register background location task handler outside Expo Go
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
          const token = await AsyncStorage.getItem('userToken');

          if (partnerId && token) {
            const payload = {
              lat: latest.coords.latitude,
              lng: latest.coords.longitude,
              heading: latest.coords.heading ?? 0,
              speed: latest.coords.speed ?? 0,
            };

            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
            await fetch(`${apiUrl}/delivery-partners/${partnerId}/location`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            });
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
 * Start background location tracking with persistent Android notification banner
 */
export async function startBackgroundTracking({ orderNo, partnerId }) {
  try {
    if (!(await canTrackInBackground())) {
      return { success: false, reason: 'Background tracking requires a development or production native build.' };
    }
    if (partnerId) {
      await AsyncStorage.setItem('@supamart_partner_id', String(partnerId));
    }

    // 1. Request foreground permission first
    const fgRes = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }));
    if (fgRes?.status !== 'granted') {
      return { success: false, reason: 'Foreground location permission not granted' };
    }

    // 2. Safely verify background permission on native Android / iOS
    if (Platform.OS !== 'web') {
      try {
        let bgStatus = (await Location.getBackgroundPermissionsAsync().catch(() => ({ status: 'undetermined' }))).status;
        if (bgStatus !== 'granted') {
          const reqBg = await Location.requestBackgroundPermissionsAsync().catch(() => ({ status: 'denied' }));
          bgStatus = reqBg.status;
        }
        if (bgStatus !== 'granted') {
          console.warn('[BackgroundLocation] Background permission not granted. Skipping foreground service update.');
          return { success: false, reason: 'Background location permission not granted' };
        }
      } catch (bgPermErr) {
        console.warn('[BackgroundLocation] Background permission check failed:', bgPermErr?.message);
        return { success: false, reason: 'Background permission check failed' };
      }
    }

    // 3. Check if already running
    const isStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
    if (isStarted) {
      return { success: true, alreadyRunning: true };
    }

    // 4. Start location updates with foreground service notification (wrapped to prevent native fatal crashes)
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

