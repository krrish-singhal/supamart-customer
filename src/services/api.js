import axios from 'axios';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

// 20s, not 120s — this is the default for every call including the ones on the app's
// boot path (AuthContext.loadToken's /auth/me). A slow/flaky connection with the old
// 120s timeout meant the app could sit on its loading screen for up to two full minutes
// before failing, looking like it had simply hung. Calls that are genuinely slow (e.g.
// EditProfileScreen's avatar upload) pass their own longer `timeout` in the request config,
// which overrides this default.
// eslint-disable-next-line import/no-named-as-default-member -- axios.create is the correct, standard API
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // proceed without token
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';
    Toast.show({ type: 'error', text1: message, visibilityTime: 3000, position: 'top' });
    return Promise.reject(error);
  }
);

export default apiClient;
