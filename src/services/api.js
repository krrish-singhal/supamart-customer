import axios from 'axios';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './firebase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
console.log('API_URL is:', API_URL);

// 15s global default. Standard production timeout to prevent the app from appearing stuck.
// If the backend is on a free tier that sleeps, the user should upgrade for production.
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config) => {
  try {
    // 'authMode' === 'firebase' means AuthContext.signIn's fast path is active for this
    // session — use a live Firebase ID token instead of a stored one. getIdToken() returns
    // the cached token instantly (no network call) unless it's actually near/past its
    // 1-hour expiry, in which case the SDK silently refreshes it against Firebase's own
    // servers — not our Render backend — so this stays valid indefinitely without ever
    // reading a stale token out of AsyncStorage. backend/src/middleware/auth.js already
    // accepts Firebase ID tokens interchangeably with our own custom JWTs, so every
    // existing endpoint works against this with no server-side change.
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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Prefer the server's own message (e.g. "Incorrect password", "No account found
    // with this email…") whenever the request actually reached the backend. Only fall
    // back to a generic message for genuine transport failures — never surface raw
    // axios strings like "Network Error" / "timeout of 20000ms exceeded" to the user.
    let message;
    if (error.response) {
      message =
        error.response.data?.error ||
        error.response.data?.message ||
        'Something went wrong. Please try again.';
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
