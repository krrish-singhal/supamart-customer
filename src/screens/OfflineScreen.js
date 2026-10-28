import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WifiOff } from '../components/icons';
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
        <Animated.View entering={FadeInDown.duration(300)} style={{ alignItems: 'center' }}>
          {/* Circular Off-grid Badge matching Image 1 */}
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <WifiOff size={44} color="#8c95a3" strokeWidth={2} />
          </View>

          {/* Title matching Image 1 */}
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: 22,
              fontWeight: '700',
              color: '#111827',
              letterSpacing: -0.3,
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            {"You're offline"}
          </Text>

          {/* Subtitle matching Image 1 */}
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 13.5,
              fontWeight: '400',
              color: '#64748b',
              textAlign: 'center',
              lineHeight: 20,
              maxWidth: 280,
            }}
          >
            Check your mobile data or Wi-Fi and try again.{'\n'}Your cart is saved.
          </Text>
        </Animated.View>
      </View>

      {/* BOTTOM BUTTONS matching Image 1 */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 28, gap: 12 }}>
        <Pressable
          onPress={handleRetry}
          disabled={checking}
          style={({ pressed }) => ({
            height: 50,
            borderRadius: 12,
            backgroundColor: '#0d7a46',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.9 : (checking ? 0.75 : 1),
          })}
        >
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: 15.5,
              fontWeight: '700',
              color: '#ffffff',
            }}
          >
            {checking ? 'Checking...' : 'Try again'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleGoHome}
          style={({ pressed }) => ({
            paddingVertical: 10,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: 14.5,
              fontWeight: '700',
              color: '#0d7a46',
            }}
          >
            Go to home
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
