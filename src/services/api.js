import { create } from 'axios';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { auth } from './firebase';

function resolvePrimaryApiUrl() {
  // 1. Web environment: use current window hostname (localhost or LAN IP)
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:5000/api';
      }
      return `http://${host}:5000/api`;
    }
    return 'http://localhost:5000/api';
  }

  // 2. Parse host IP from Metro debugger/host URI (works reliably on both real devices and emulators)
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest2?.extra?.expoClient?.hostUri ||
      Constants.manifest?.debuggerHost;

    if (hostUri) {
      const host = hostUri.split(':')[0];
      const isTunnel =
        host.includes('exp.direct') ||
        host.includes('ngrok') ||
        host.includes('loca.lt');

      if (host && !isTunnel && host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:5000/api`;
      }
    }
  } catch (_) {}

  // 3. Environment variable if explicitly specified
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 4. Android Emulator fallback if hostUri was not detectable
  if (Platform.OS === 'android' && !Constants.isDevice) {
    return 'http://10.0.2.2:5000/api';
  }

  // 5. Default fallback to machine LAN IP
  return 'http://10.28.41.35:5000/api';
}

const PRIMARY_API_URL = resolvePrimaryApiUrl();
const FALLBACK_API_URL = 'https://supamart-backend-353k.onrender.com/api';

let activeBaseURL = PRIMARY_API_URL;
let hasLoggedFailover = false;

console.log('Primary API_URL is:', PRIMARY_API_URL, '| Fallback is:', FALLBACK_API_URL);

// 20s timeout to prevent premature aborts during cold starts or cellular hops
const apiClient = create({
  baseURL: activeBaseURL,
  timeout: 20000,
});

apiClient.interceptors.request.use(async (config) => {
  // Always use currently active working baseURL
  if (!config.baseURL || config.baseURL === PRIMARY_API_URL || config.baseURL === FALLBACK_API_URL) {
    config.baseURL = activeBaseURL;
  }

  // A just-completed Firebase sign-in supplies its token before authMode is saved.
  if (config.headers.Authorization) return config;
  try {
    const authMode = await AsyncStorage.getItem('authMode');
    const token =
      authMode === 'firebase' && auth.currentUser
        ? await auth.currentUser.getIdToken()
        : await AsyncStorage.getItem('userToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // proceed without token
  }
  return config;
});

let networkErrorListener = null;
export function setNetworkErrorListener(listener) {
  networkErrorListener = listener;
}

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const config = error.config;
    const isNetworkOrTimeout =
      !error.response &&
      (error.code === 'ERR_NETWORK' ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT' ||
        /Network Error|timeout/i.test(error.message || ''));

    // If local dev server is unreachable, failover immediately and permanently for this session
    if (
      isNetworkOrTimeout &&
      config &&
      !config._retriedWithFallback &&
      activeBaseURL !== FALLBACK_API_URL &&
      !config.__skipFailover
    ) {
      config._retriedWithFallback = true;
      if (!hasLoggedFailover) {
        hasLoggedFailover = true;
        console.warn(`Local backend unreachable (${error.message}). Failing over to cloud backend: ${FALLBACK_API_URL}`);
      }
      activeBaseURL = FALLBACK_API_URL;
      apiClient.defaults.baseURL = FALLBACK_API_URL;
      config.baseURL = FALLBACK_API_URL;
      try {
        return await apiClient(config);
      } catch (fallbackError) {
        error = fallbackError;
      }
    }

    // Cold-start retry tolerance on Cloud Backend (Render free-tier sleep or mobile handoff)
    if (
      isNetworkOrTimeout &&
      config &&
      !config._retriedColdStart &&
      (config.method === 'get' || config.__canRetry) &&
      !config.__skipFailover
    ) {
      config._retriedColdStart = true;
      // Brief pause for Render spinning up
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        return await apiClient(config);
      } catch (retryError) {
        error = retryError;
      }
    }

    // Notify network context if device had transport failure
    if (!error.response && isNetworkOrTimeout) {
      if (typeof networkErrorListener === 'function') {
        networkErrorListener();
      }
    }

    let message;
    if (error.response) {
      if (error.response.status === 429) {
        message = 'Server is busy. Please wait a moment and try again.';
      } else {
        message =
          error.response.data?.error ||
          error.response.data?.message ||
          'Something went wrong. Please try again.';
      }
    } else if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) {
      message = 'The server is taking a bit long to respond. Please try again in a moment.';
    } else {
      message = 'Unable to reach the server. Please check your internet connection and try again.';
    }

    if (!error.config?.__skipErrorToast) {
      Toast.show({ type: 'error', text1: message, visibilityTime: 3000, position: 'top' });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
