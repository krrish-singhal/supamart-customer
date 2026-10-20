import './src/theme/fontSetup';
import './global.css';
import './src/services/backgroundLocation';
import React, { useEffect, useState } from 'react';
import { Platform, LogBox, AppState, View, StyleSheet } from 'react-native';
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
import Navigation from './src/navigation/Navigation';
import { navigationRef } from './src/navigation/navigationRef';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { NotificationsProvider } from './src/context/NotificationsContext';

import { NetworkProvider, useNetwork } from './src/context/NetworkContext';
import OfflineScreen from './src/screens/OfflineScreen';

LogBox.ignoreLogs([
  '@firebase/firestore: Firestore',
  "WebChannelConnection RPC 'Listen' stream",
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
      {isOffline && !offlineDismissed && (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 999999, backgroundColor: '#ffffff' }]}>
          <OfflineScreen onRetry={checkConnection} onGoHome={handleGoHome} />
        </View>
      )}
    </>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter':                      require('./assets/fonts/Inter-Regular.ttf'),
    'Inter-Regular':              require('./assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium':               require('./assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold':             require('./assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold':                 require('./assets/fonts/Inter-Bold.ttf'),
    'Inter-ExtraBold':            require('./assets/fonts/Inter-ExtraBold.ttf'),
    'Inter-Black':                require('./assets/fonts/Inter-Black.ttf'),
    'PlusJakartaSans':            require('./assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Regular':    require('./assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Medium':     require('./assets/fonts/PlusJakartaSans-Medium.ttf'),
    'PlusJakartaSans-SemiBold':   require('./assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-Bold':       require('./assets/fonts/PlusJakartaSans-Bold.ttf'),
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
          <AuthProvider>
            <NotificationsProvider>
              <CartProvider>
                <FavoritesProvider>
                  <AppContent />
                </FavoritesProvider>
              </CartProvider>
            </NotificationsProvider>
          </AuthProvider>
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
