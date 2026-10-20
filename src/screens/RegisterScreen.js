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
import { ChevronLeft, User, Mail, Lock, Eye, EyeOff, Check } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import BrandBadge from '../components/BrandBadge';
import { AuthContext } from '../context/AuthContext';

const GROCERY_ROW = [
  { id: 'apples', source: require('../../assets/categories/home/fresh-fruits.webp') },
  { id: 'rice', source: require('../../assets/Cleaned_Products/SSK Ponni Rice 1st.webp') },
  { id: 'tomatoes', source: require('../../assets/categories/home/fresh-vegetables.webp') },
  { id: 'oil', source: require('../../assets/Cleaned_Products/Ruchi Gold Palm Oil.webp') },
];

export default function RegisterScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 480);
  const { register } = useContext(AuthContext);
  const scrollViewRef = useRef(null);

  const initialMobile = route.params?.prefillMobile || '';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState(initialMobile);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (route.params?.prefillMobile) {
      setMobile(route.params.prefillMobile);
    }
  }, [route.params?.prefillMobile]);

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

  const cleanMobile = mobile.trim().replace(/[^0-9]/g, '');
  const emailTrimmed = email.trim();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed);
  const mobileValid = cleanMobile.length === 10;
  const passwordValid = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const nameValid = name.trim().length === 0 || name.trim().length >= 2;

  const canSubmit =
    emailValid &&
    mobileValid &&
    passwordValid &&
    passwordsMatch &&
    nameValid &&
    agreedToTerms &&
    !loading;

  const handleRegister = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const derivedName = name.trim() || emailTrimmed.split('@')[0] || 'Customer';
      await register({
        name: derivedName,
        email: emailTrimmed.toLowerCase(),
        mobile: cleanMobile,
        password,
      });
    } catch {
      // api.js interceptor handles error alerts/toasts
    } finally {
      setLoading(false);
    }
  };

  // 4 items evenly spaced in the top row matching Screen 02
  const rowItemSize = Math.floor((contentWidth - 40 - 24) / 4);

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
            paddingBottom: keyboardVisible ? 260 : Math.max(insets.bottom, 16) + 16,
            width: '100%',
            maxWidth: 480,
            alignSelf: 'center',
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* TOP SECTION: BACK BUTTON, LOGO & 4 GROCERY ITEMS matching Screen 02 */}
          <View style={{ backgroundColor: '#e2ece4', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
            {/* Header: Back Arrow on left, Brand badge on right */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 22,
              }}
            >
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={12}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronLeft size={24} color="#0f172a" strokeWidth={2.6} />
              </Pressable>

              <BrandBadge size={32} showName />
            </View>

            {/* Row of 4 Grocery Images matching Screen 02 */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {GROCERY_ROW.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInDown.duration(420).delay(index * 60).springify().damping(12)}
                  style={{
                    width: rowItemSize,
                    height: rowItemSize,
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

          {/* BOTTOM WHITE CARD FORM matching Screen 02 */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(80)}
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 24,
              paddingTop: 28,
              paddingBottom: Math.max(insets.bottom, 16) + 16,
            }}
          >
            {/* Title: "Create your account" */}
            <Text
              style={{
                fontFamily: 'Inter-ExtraBold',
                fontSize: 27,
                fontWeight: '800',
                color: '#0f172a',
                letterSpacing: -0.6,
              }}
            >
              Create your account
            </Text>

            {/* Subtitle: "Shop groceries at trader prices in minutes." */}
            <Text
              style={{
                fontFamily: 'Inter-Regular',
                fontSize: 14,
                fontWeight: '400',
                color: '#64748b',
                marginTop: 6,
                marginBottom: 20,
                letterSpacing: -0.2,
              }}
            >
              Shop groceries at trader prices in minutes.
            </Text>

            {/* Field 1: Full name */}
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
                Full name
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderWidth: 1.2,
                  borderColor: focusedInput === 'name' ? '#047857' : '#e2e8f0',
                  borderRadius: 14,
                  height: 48,
                  paddingHorizontal: 14,
                }}
              >
                <User
                  size={18}
                  color={focusedInput === 'name' ? '#047857' : '#94a3b8'}
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
                  placeholder="Enter your name"
                  placeholderTextColor="#94a3b8"
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {/* Field 2: Email address */}
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
                  height: 48,
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
                  placeholder="you@example.com"
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

            {/* Field 3: Phone number */}
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
                Phone number
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderWidth: 1.2,
                  borderColor: focusedInput === 'mobile' ? '#047857' : '#e2e8f0',
                  borderRadius: 14,
                  height: 48,
                  paddingHorizontal: 14,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Inter-Bold',
                    fontSize: 15,
                    fontWeight: '700',
                    color: '#0f172a',
                    marginRight: 10,
                  }}
                >
                  +91
                </Text>
                <View style={{ width: 1, height: 22, backgroundColor: '#e2e8f0', marginRight: 10 }} />
                <TextInput
                  style={{
                    flex: 1,
                    fontFamily: 'Inter-Regular',
                    fontSize: 14,
                    fontWeight: '400',
                    color: '#0f172a',
                    paddingVertical: 0,
                  }}
                  placeholder="10-digit number"
                  placeholderTextColor="#94a3b8"
                  value={mobile}
                  onChangeText={(v) => setMobile(v.replace(/[^0-9]/g, '').slice(0, 10))}
                  keyboardType="number-pad"
                  maxLength={10}
                  onFocus={() => setFocusedInput('mobile')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {/* Field 4: Password */}
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
                  height: 48,
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
                  placeholder="At least 8 characters"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => {
                    setFocusedInput('password');
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 160, animated: true });
                    }, 100);
                  }}
                  onBlur={() => setFocusedInput(null)}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                  {showPassword ? (
                    <EyeOff size={18} color="#94a3b8" />
                  ) : (
                    <Eye size={18} color="#94a3b8" />
                  )}
                </Pressable>
              </View>
              {password.length > 0 && password.length < 8 && (
                <Text
                  style={{
                    fontFamily: 'Inter-Medium',
                    fontSize: 11.5,
                    fontWeight: '500',
                    color: '#ef4444',
                    marginTop: 4,
                  }}
                >
                  Password must be at least 8 characters
                </Text>
              )}
            </View>

            {/* Field 5: Confirm password */}
            <View style={{ marginBottom: 18 }}>
              <Text
                style={{
                  fontFamily: 'Inter-Bold',
                  fontSize: 13.5,
                  fontWeight: '700',
                  color: '#0f172a',
                  marginBottom: 6,
                }}
              >
                Confirm password
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderWidth: 1.2,
                  borderColor:
                    focusedInput === 'confirmPassword'
                      ? '#047857'
                      : confirmPassword.length > 0 && !passwordsMatch
                      ? '#ef4444'
                      : '#e2e8f0',
                  borderRadius: 14,
                  height: 48,
                  paddingHorizontal: 14,
                }}
              >
                <Lock
                  size={18}
                  color={
                    confirmPassword.length > 0 && !passwordsMatch
                      ? '#ef4444'
                      : focusedInput === 'confirmPassword'
                      ? '#047857'
                      : '#94a3b8'
                  }
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
                  placeholder="Re-enter password"
                  placeholderTextColor="#94a3b8"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  onFocus={() => {
                    setFocusedInput('confirmPassword');
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 220, animated: true });
                    }, 100);
                  }}
                  onBlur={() => setFocusedInput(null)}
                  onSubmitEditing={handleRegister}
                />
                <Pressable onPress={() => setShowConfirmPassword((v) => !v)} hitSlop={10}>
                  {showConfirmPassword ? (
                    <EyeOff size={18} color="#94a3b8" />
                  ) : (
                    <Eye size={18} color="#94a3b8" />
                  )}
                </Pressable>
              </View>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <Text
                  style={{
                    fontFamily: 'Inter-Medium',
                    fontSize: 11.5,
                    fontWeight: '500',
                    color: '#ef4444',
                    marginTop: 4,
                  }}
                >
                  Passwords do not match
                </Text>
              )}
            </View>

            {/* Checkbox: Terms of Service & Privacy Policy */}
            <Pressable
              onPress={() => setAgreedToTerms((v) => !v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  backgroundColor: agreedToTerms ? '#047857' : '#ffffff',
                  borderWidth: agreedToTerms ? 0 : 1.5,
                  borderColor: '#cbd5e1',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                {agreedToTerms && <Check size={14} color="#ffffff" strokeWidth={3} />}
              </View>

              <Text style={{ flex: 1, fontSize: 12.5, lineHeight: 18 }}>
                <Text
                  style={{
                    fontFamily: 'Inter-Regular',
                    fontWeight: '400',
                    color: '#334155',
                  }}
                >
                  I agree to the{' '}
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter-Bold',
                    fontWeight: '700',
                    color: '#047857',
                  }}
                >
                  Terms of Service
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter-Regular',
                    fontWeight: '400',
                    color: '#334155',
                  }}
                >
                  {' '}and{' '}
                </Text>
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
            </Pressable>

            {/* Create account button */}
            <Pressable
              onPress={handleRegister}
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
                  Create account
                </Text>
              )}
            </Pressable>

            {/* Bottom Link: "Already have an account? Log In" */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 26,
                paddingBottom: 12,
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
                Already have an account?{' '}
              </Text>
              <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8}>
                <Text
                  style={{
                    fontFamily: 'Inter-Bold',
                    fontSize: 13.5,
                    fontWeight: '700',
                    color: '#047857',
                  }}
                >
                  Log In
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
