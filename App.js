import './src/theme/fontSetup';
import './global.css';
import './src/services/backgroundLocation';
import React, { useEffect, useState } from 'react';
import { Platform, AppState, View, StyleSheet, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { stopBackgroundTracking } from './src/services/backgroundLocation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/ui/ToastConfig';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { ConfigProvider } from './src/context/ConfigContext';
import Navigation from './src/navigation/Navigation';
import { navigationRef } from './src/navigation/navigationRef';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { NotificationsProvider } from './src/context/NotificationsContext';

import { NetworkProvider, useNetwork } from './src/context/NetworkContext';
import OfflineScreen from './src/screens/OfflineScreen';
import DeliveryDelayNotification from './src/components/DeliveryDelayNotification';
import FreeDeliveryNotification from './src/components/FreeDeliveryNotification';
import ShopClosedNotification from './src/components/ShopClosedNotification';

LogBox.ignoreLogs([
  'Background location is limited in Expo Go',
  'Non-serializable values were found in the navigation state',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
]);

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { isOffline, checkConnection } = useNetwork();
  const [offlineDismissed, setOfflineDismissed] = useState(false);

  useEffect(() => {
    if (!isOffline) {
      setOfflineDismissed(false);
    }
  }, [isOffline]);

  const handleGoHome = () => {
    setOfflineDismissed(true);
    if (navigationRef?.isReady?.()) {
      try {
        navigationRef.navigate('Main', { screen: 'Home' });
      } catch (_e) {}
    }
  };

  return (
    <>
      <Navigation />
      <FreeDeliveryNotification />
      <DeliveryDelayNotification />
      <ShopClosedNotification />
      {isOffline && !offlineDismissed && (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 999999, backgroundColor: '#ffffff' }]}>
          <OfflineScreen onRetry={checkConnection} onGoHome={handleGoHome} />
        </View>
      )}
    </>
  );
}

export default function App() {
  // Legacy Inter keys keep existing screens compatible while rendering Jakarta.
  const [fontsLoaded, fontError] = useFonts({
    'Inter':                      require('./assets/fonts/PlusJakartaSans-Regular.ttf'),
    'Inter-Regular':              require('./assets/fonts/PlusJakartaSans-Regular.ttf'),
    'Inter-Medium':               require('./assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'Inter-SemiBold':             require('./assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'Inter-Bold':                 require('./assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'Inter-ExtraBold':            require('./assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
    'Inter-Black':                require('./assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
    'PlusJakartaSans':            require('./assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Regular':    require('./assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Medium':     require('./assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-SemiBold':   require('./assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-Bold':       require('./assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-ExtraBold':  require('./assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // If not actively delivering, clear any lingering background location or persistent notification
    const checkAndStopTracking = async () => {
      try {
        const partnerId = await AsyncStorage.getItem('@supamart_partner_id');
        if (!partnerId) {
          await stopBackgroundTracking();
        }
      } catch (_e) {}
    };
    checkAndStopTracking();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'inactive' || state === 'background') {
        AsyncStorage.getItem('@supamart_partner_id')
          .then((partnerId) => {
            if (!partnerId) {
              stopBackgroundTracking();
            }
          })
          .catch(() => {});
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor="#F8F8F8" />
        <NetworkProvider>
          <ConfigProvider>
          <AuthProvider>
            <NotificationsProvider>
              <CartProvider>
                <FavoritesProvider>
                  <AppContent />
                </FavoritesProvider>
              </CartProvider>
            </NotificationsProvider>
          </AuthProvider>
          </ConfigProvider>
        </NetworkProvider>
        <Toast
          config={toastConfig}
          topOffset={Platform.OS === 'ios' ? 52 : 44}
          visibilityTime={3000}
          animationConfig={{
            enter: {
              type: 'timing',
              duration: 220,
            },
            exit: {
              type: 'timing',
              duration: 180,
            },
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
