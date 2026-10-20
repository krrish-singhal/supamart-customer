import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  cancelAnimation,
} from 'react-native-reanimated';
import { fonts } from '../theme/typography';

function AnimatedSplashDot({ delay = 0, isAnimating = false, defaultSize = 5.5, defaultOpacity = 0.45 }) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(defaultOpacity);

  useEffect(() => {
    if (isAnimating) {
      scale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1.3, { duration: 300 }),
            withTiming(0.75, { duration: 300 })
          ),
          -1,
          true
        )
      );
      translateY.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-5.5, { duration: 300 }),
            withTiming(0, { duration: 300 })
          ),
          -1,
          true
        )
      );
      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 300 }),
            withTiming(0.4, { duration: 300 })
          ),
          -1,
          true
        )
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(translateY);
      cancelAnimation(opacity);
      scale.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(defaultOpacity, { duration: 200 });
    }
  }, [isAnimating, delay, defaultOpacity, opacity, scale, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: defaultSize,
          height: defaultSize,
          borderRadius: defaultSize / 2,
          backgroundColor: '#ffffff',
        },
        animStyle,
      ]}
    />
  );
}

export default function WelcomeScreen({ navigation, isSplash = false, onFinish, onLogin }) {
  const insets = useSafeAreaInsets();
  const [isStarting, setIsStarting] = useState(false);
  const onFinishRef = useRef(onFinish);
  const onLoginRef = useRef(onLogin);
  const timeoutRef = useRef(null);

  useEffect(() => {
    onFinishRef.current = onFinish;
    onLoginRef.current = onLogin;
  }, [onFinish, onLogin]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleGetStarted = () => {
    if (isStarting) return;
    setIsStarting(true);

    timeoutRef.current = setTimeout(() => {
      if (onFinishRef.current) {
        onFinishRef.current();
      } else if (navigation?.navigate) {
        navigation.navigate('LocationPrompt');
      }
    }, 850);
  };

  const handleLogin = () => {
    if (isStarting) return;
    if (onLoginRef.current) {
      onLoginRef.current();
    } else if (navigation?.navigate) {
      navigation.navigate('Login');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a7942' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a7942" />

      {/* Main Center Branding Section matching Image 1 (17 Splash) */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        {/* White squircle with official MS Traders system logo */}
        <Animated.View
          entering={FadeInDown.duration(400).springify().damping(12)}
          style={{
            width: 104,
            height: 104,
            borderRadius: 28,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.16,
            shadowRadius: 16,
            elevation: 8,
            marginBottom: 24,
            padding: 12,
          }}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
          />
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={FadeInDown.duration(400).delay(80)}
          style={{
            fontFamily: fonts.extraBold,
            fontSize: 28,
            fontWeight: 'normal',
            color: '#ffffff',
            textAlign: 'center',
            letterSpacing: -0.5,
            marginBottom: 8,
          }}
        >
          MS Traders
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          entering={FadeInDown.duration(400).delay(150)}
          style={{
            fontFamily: fonts.medium,
            fontSize: 14.5,
            fontWeight: 'normal',
            color: 'rgba(255, 255, 255, 0.88)',
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          Groceries at trader prices
        </Animated.Text>

        {/* Middle Loading Three Dots (Animated when starting) */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(220)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            height: 32,
          }}
        >
          <AnimatedSplashDot
            delay={0}
            isAnimating={isStarting}
            defaultSize={5.5}
            defaultOpacity={0.45}
          />
          <AnimatedSplashDot
            delay={150}
            isAnimating={isStarting}
            defaultSize={6.5}
            defaultOpacity={0.95}
          />
          <AnimatedSplashDot
            delay={300}
            isAnimating={isStarting}
            defaultSize={5.5}
            defaultOpacity={0.45}
          />
        </Animated.View>
      </View>

      {/* Bottom Action Area matching Image 1 */}
      <Animated.View
        entering={FadeInUp.duration(400).delay(250)}
        style={{
          paddingHorizontal: 24,
          paddingBottom: Math.max(insets.bottom, 20),
          width: '100%',
        }}
      >
        {/* Get Started Button - invisible when starting without any Loading text */}
        <Pressable
          onPress={handleGetStarted}
          disabled={isStarting}
          hitSlop={8}
          pointerEvents={isStarting ? 'none' : 'auto'}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 10,
            elevation: 4,
            marginBottom: 16,
            opacity: isStarting ? 0 : 1,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: 16,
              fontWeight: 'normal',
              color: '#0a7942',
            }}
          >
            Get started
          </Text>
        </Pressable>

        {/* Log In Link */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 4,
            opacity: isStarting ? 0 : 1,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.medium,
              fontSize: 14,
              fontWeight: 'normal',
              color: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            Have an account?{' '}
          </Text>
          <Pressable onPress={handleLogin} hitSlop={8} disabled={isStarting}>
            <Text
              style={{
                fontFamily: fonts.bold,
                fontSize: 14,
                fontWeight: 'normal',
                color: '#ffffff',
                textDecorationLine: 'underline',
              }}
            >
              Log in
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

