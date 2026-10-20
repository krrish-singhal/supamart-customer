import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { fonts } from '../theme/typography';
import { useNetwork } from '../context/NetworkContext';
import { navigationRef } from '../navigation/navigationRef';

export default function OfflineScreen({ navigation, onRetry, onGoHome }) {
  const [checking, setChecking] = useState(false);
  const { checkConnection } = useNetwork();

  async function handleRetry() {
    setChecking(true);
    try {
      const isOnline = await checkConnection();
      if (isOnline) {
        Toast.show({ type: 'success', text1: 'Back online!' });
        if (onRetry) {
          onRetry();
        } else if (navigation?.canGoBack()) {
          navigation.goBack();
        }
      } else {
        Toast.show({ type: 'error', text1: 'Still offline. Please check connection.' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Still offline. Please check connection.' });
    } finally {
      setChecking(false);
    }
  }

  function handleGoHome() {
    if (onGoHome) {
      onGoHome();
    } else if (navigation?.canGoBack()) {
      navigation.goBack();
    } else if (navigation) {
      navigation.navigate('Main', { screen: 'Home' });
    } else if (navigationRef?.isReady?.()) {
      try {
        navigationRef.navigate('Main', { screen: 'Home' });
      } catch (_e) {}
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* CENTERED OFFLINE CONTENT matching Image 1 */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 28,
        }}
      >
        <Animated.View entering={FadeInDown.duration(320)} style={{ alignItems: 'center' }}>
          {/* Circular Off-grid Badge matching Image 1 */}
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <WifiOff size={44} color="#475569" strokeWidth={2.4} />
          </View>

          {/* Title matching Image 1 */}
          <Text
            style={{
              fontFamily: fonts.extraBold,
              fontSize: 22,
              fontWeight: '900',
              color: '#0f172a',
              letterSpacing: -0.4,
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            {"You're offline"}
          </Text>

          {/* Subtitle matching Image 1 */}
          <Text
            style={{
              fontFamily: fonts.medium,
              fontSize: 14,
              fontWeight: '500',
              color: '#64748b',
              textAlign: 'center',
              lineHeight: 22,
              maxWidth: 290,
            }}
          >
            Check your mobile data or Wi-Fi and try again.{'\n'}Your cart is saved.
          </Text>
        </Animated.View>
      </View>

      {/* BOTTOM BUTTONS matching Image 1 */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 24, gap: 12 }}>
        <Pressable
          onPress={handleRetry}
          disabled={checking}
          style={{
            height: 52,
            borderRadius: 16,
            backgroundColor: '#047857',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#047857',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: 15.5,
              fontWeight: '800',
              color: '#ffffff',
            }}
          >
            {checking ? 'Checking...' : 'Try again'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleGoHome}
          style={{
            paddingVertical: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: 14.5,
              fontWeight: '800',
              color: '#047857',
            }}
          >
            Go to home
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
