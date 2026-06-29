import './global.css';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/ui/ToastConfig';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import Navigation from './src/navigation/Navigation';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'PlusJakartaSans-Regular':  require('./assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Medium':   require('./assets/fonts/PlusJakartaSans-Medium.ttf'),
    'PlusJakartaSans-SemiBold': require('./assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-Bold':     require('./assets/fonts/PlusJakartaSans-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor="#F8F8F8" />
        <AuthProvider>
          <CartProvider>
            <Navigation />
          </CartProvider>
        </AuthProvider>
        <Toast config={toastConfig} topOffset={56} visibilityTime={3500} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
