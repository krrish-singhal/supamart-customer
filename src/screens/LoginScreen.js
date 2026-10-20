import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import BrandBadge from '../components/BrandBadge';
import { AuthContext } from '../context/AuthContext';

const GROCERY_GRID = [
  { id: 'tomatoes', source: require('../../assets/categories/home/fresh-vegetables.webp') },
  { id: 'apples', source: require('../../assets/categories/home/fresh-fruits.webp') },
  { id: 'atta', source: require('../../assets/Cleaned_Products/Elite Atta.webp') },
  { id: 'rice', source: require('../../assets/Cleaned_Products/SSK Ponni Rice 1st.webp') },
  { id: 'oil', source: require('../../assets/Cleaned_Products/Ruchi Gold Palm Oil.webp') },
  { id: 'dal', source: require('../../assets/Cleaned_Products/Kadala Paruppu Chana Dal.webp') },
];

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 480);
  const { signIn } = useContext(AuthContext);
  const scrollViewRef = useRef(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const emailTrimmed = email.trim();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed);
  const canSubmit = emailValid && password.length > 0 && !loading;

  const handleSignIn = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await signIn({ email: emailTrimmed, password });
    } catch {
      // api.js interceptor handles error alerts/toasts
    } finally {
      setLoading(false);
    }
  };

  // 3-column card sizing for the grocery grid
  const gridWidth = Math.min(contentWidth - 44, 296);
  const gridItemSize = Math.floor((gridWidth - 20) / 3);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#e2ece4' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#e2ece4" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: keyboardVisible ? 24 : 0,
            width: '100%',
            maxWidth: 480,
            alignSelf: 'center',
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* TOP BRAND & GROCERY HERO SECTION */}
          <View style={{ backgroundColor: '#e2ece4', paddingHorizontal: 22, paddingTop: 10, paddingBottom: 22 }}>
            {/* Header: Official App Logo + MS Traders Wordmark */}
            <Animated.View
              entering={FadeInDown.duration(400)}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}
            >
              <BrandBadge size={34} showName />
            </Animated.View>

            {/* 6 Grid Items (3 cols x 2 rows) matching Screen 01 */}
            <View
              style={{
                width: gridWidth,
                alignSelf: 'center',
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                rowGap: 10,
              }}
            >
              {GROCERY_GRID.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInDown.duration(420).delay(index * 50).springify().damping(12)}
                  style={{
                    width: gridItemSize,
                    height: gridItemSize,
                    borderRadius: 16,
                    backgroundColor: '#ffffff',
                    overflow: 'hidden',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 1,
                    borderWidth: 1,
                    borderColor: '#d5e3d8',
                  }}
                >
                  <Image
                    source={item.source}
                    style={{ width: '100%', height: '100%', borderRadius: 15 }}
                    contentFit="cover"
                  />
                </Animated.View>
              ))}
            </View>
          </View>

          {/* BOTTOM WHITE CARD FORM matching Screen 01 typography */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(80)}
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 24,
              paddingTop: 28,
              paddingBottom: Math.max(insets.bottom, 16) + 12,
            }}
          >
            {/* Main Headline: "Groceries at trader prices ," \n "delivered fast" */}
            <Text
              style={{
                fontFamily: 'Inter-ExtraBold',
                fontSize: 27,
                fontWeight: '800',
                color: '#0f172a',
                lineHeight: 34,
                letterSpacing: -0.6,
              }}
            >
              Groceries at trader prices ,{'\n'}delivered fast
            </Text>

            {/* Subtitle: "Log in with your email and password." */}
            <Text
              style={{
                fontFamily: 'Inter-Regular',
                fontSize: 14,
                fontWeight: '400',
                color: '#64748b',
                marginTop: 8,
                marginBottom: 20,
                letterSpacing: -0.2,
              }}
            >
              Log in with your email and password.
            </Text>

            {/* Field: Email */}
            <View style={{ marginBottom: 14 }}>
              <Text
                style={{
                  fontFamily: 'Inter-Bold',
                  fontSize: 13.5,
                  fontWeight: '700',
                  color: '#0f172a',
                  marginBottom: 6,
                }}
              >
                Email address
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderWidth: 1.2,
                  borderColor: focusedInput === 'email' ? '#047857' : '#e2e8f0',
                  borderRadius: 14,
                  height: 50,
                  paddingHorizontal: 14,
                }}
              >
                <Mail
                  size={18}
                  color={focusedInput === 'email' ? '#047857' : '#94a3b8'}
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  style={{
                    flex: 1,
                    fontFamily: 'Inter-Regular',
                    fontSize: 14,
                    fontWeight: '400',
                    color: '#0f172a',
                    paddingVertical: 0,
                  }}
                  placeholder="Enter your email"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {/* Field: Password */}
            <View style={{ marginBottom: 8 }}>
              <Text
                style={{
                  fontFamily: 'Inter-Bold',
                  fontSize: 13.5,
                  fontWeight: '700',
                  color: '#0f172a',
                  marginBottom: 6,
                }}
              >
                Password
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderWidth: 1.2,
                  borderColor: focusedInput === 'password' ? '#047857' : '#e2e8f0',
                  borderRadius: 14,
                  height: 50,
                  paddingHorizontal: 14,
                }}
              >
                <Lock
                  size={18}
                  color={focusedInput === 'password' ? '#047857' : '#94a3b8'}
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  style={{
                    flex: 1,
                    fontFamily: 'Inter-Regular',
                    fontSize: 14,
                    fontWeight: '400',
                    color: '#0f172a',
                    paddingVertical: 0,
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => {
                    setFocusedInput('password');
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 180, animated: true });
                    }, 100);
                  }}
                  onBlur={() => setFocusedInput(null)}
                  onSubmitEditing={handleSignIn}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                  {showPassword ? (
                    <EyeOff size={18} color="#94a3b8" />
                  ) : (
                    <Eye size={18} color="#94a3b8" />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Forgot Password Link */}
            <Pressable
              onPress={() => navigation.navigate('ForgotPassword')}
              hitSlop={8}
              style={{ alignSelf: 'flex-end', marginBottom: 18, marginTop: 4 }}
            >
              <Text
                style={{
                  fontFamily: 'Inter-Bold',
                  fontSize: 13,
                  fontWeight: '700',
                  color: '#047857',
                }}
              >
                Forgot password?
              </Text>
            </Pressable>

            {/* Continue / Log In Button */}
            <Pressable
              onPress={handleSignIn}
              disabled={!canSubmit}
              style={{
                backgroundColor: canSubmit ? '#047857' : '#d8e4db',
                borderRadius: 14,
                height: 52,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: canSubmit ? '#047857' : 'transparent',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.15,
                shadowRadius: 6,
                elevation: canSubmit ? 3 : 0,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text
                  style={{
                    fontFamily: 'Inter-Bold',
                    fontSize: 16,
                    fontWeight: '700',
                    color: canSubmit ? '#ffffff' : '#5c6d62',
                    letterSpacing: -0.2,
                  }}
                >
                  Continue
                </Text>
              )}
            </Pressable>

            {/* Middle Prompt: "New to MS Traders? Create an account" */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 22,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter-Regular',
                  fontSize: 13.5,
                  fontWeight: '400',
                  color: '#334155',
                }}
              >
                New to MS Traders?{' '}
              </Text>
              <Pressable
                onPress={() => navigation.navigate('Register')}
                hitSlop={8}
              >
                <Text
                  style={{
                    fontFamily: 'Inter-Bold',
                    fontSize: 13.5,
                    fontWeight: '700',
                    color: '#047857',
                  }}
                >
                  Create an account
                </Text>
              </Pressable>
            </View>

            {/* Footer Terms & Privacy Policy matching Screen 01 */}
            <View style={{ marginTop: 'auto', paddingTop: 28, alignItems: 'center' }}>
              <Text
                style={{
                  fontFamily: 'Inter-Regular',
                  fontSize: 11.5,
                  fontWeight: '400',
                  color: '#64748b',
                  textAlign: 'center',
                  lineHeight: 18,
                  paddingHorizontal: 16,
                }}
              >
                By continuing, you agree to our{' '}
                <Text
                  style={{
                    fontFamily: 'Inter-Bold',
                    fontWeight: '700',
                    color: '#047857',
                  }}
                >
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text
                  style={{
                    fontFamily: 'Inter-Bold',
                    fontWeight: '700',
                    color: '#047857',
                  }}
                >
                  Privacy Policy
                </Text>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
