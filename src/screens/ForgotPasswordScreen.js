import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Hash,
  KeyRound,
  LockKeyholeOpen,
  Info,
} from '../components/icons';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import BrandBadge from '../components/BrandBadge';
import { fonts } from '../theme/typography';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: Email, 2: Passcode, 3: New Password

  // State for step 1
  const [email, setEmail] = useState('');

  // State for step 2
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');

  // State for step 3
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const busy = useRef(false);
  const cooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const startCooldown = () => { setNow(Date.now()); setCooldownUntil(Date.now() + 30000); };
  const handleBack = () => {
    if (busy.current) return;
    setResetToken(''); setOtp(''); setPassword(''); setConfirmPassword('');
    if (step > 1) setStep(1);
    else navigation.goBack();
  };

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const otpValid = /^\d{6}$/.test(otp);
  const passwordValid = password.length >= 8 && Array.from(password).reduce((bytes, char) => { const point = char.codePointAt(0); return bytes + (point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4); }, 0) <= 72;
  const passwordsMatch = password === confirmPassword;

  const handleSendEmail = async () => {
    if (!emailValid || busy.current || cooldown > 0) return;
    busy.current = true;
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      setOtp(''); setResetToken(''); startCooldown();
      setStep(2);
      Toast.show({ type: 'success', text1: '6-digit passcode sent to your email.' });
    } catch {
      // api interceptor handles error toast
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (busy.current || cooldown > 0) return;
    busy.current = true;
    setResending(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      setOtp(''); setResetToken(''); startCooldown();
      Toast.show({ type: 'success', text1: 'New passcode sent to your email.' });
    } catch {
      // api interceptor handles error toast
    } finally {
      busy.current = false;
      setResending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValid || busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/verify-reset-otp', {
        email: email.trim(),
        otp: otp.trim(),
      });
      if (res.data.resetToken) {
        setResetToken(res.data.resetToken);
        setStep(3);
      }
    } catch {
      // api interceptor handles error toast
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordValid || !passwordsMatch || busy.current || !resetToken) return;
    busy.current = true;
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { email: email.trim().toLowerCase(), token: resetToken, password, confirmPassword });
      Toast.show({
        type: 'success',
        text1: 'Password changed successfully! You can now log in.',
      });
      setResetToken(''); setPassword(''); setConfirmPassword(''); setOtp('');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch {
      // api interceptor handles error toast
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header matching reference: Chevron on left, MS Traders logo on right */}
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            disabled={loading || resending}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
          >
            <ChevronLeft size={26} color="#18181b" strokeWidth={2.4} />
          </Pressable>

          <BrandBadge size={28} showName />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && (
            <View style={styles.stepContainer}>
              {/* Icon Box: Mint rounded square with LockKeyholeOpen in green */}
              <View style={styles.iconBox}>
                <LockKeyholeOpen size={26} color="#047857" strokeWidth={2.3} />
              </View>

              {/* Headline */}
              <Text style={styles.title}>Forgot your password?</Text>

              {/* Subtitle */}
              <Text style={styles.subtitle}>
                Enter the email you signed up with. We’ll send you a six-digit code to verify your email.
              </Text>

              {/* Email Form Field */}
              <Text style={styles.label}>Email address</Text>
              <View style={styles.inputContainer}>
                <Mail size={18} color="#64748b" strokeWidth={2} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="you@example.com"
                  placeholderTextColor="#64748b"
                  value={email}
                  editable={!loading}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSendEmail}
                />
              </View>

              {/* Action Button: Light sage when disabled, Emerald when enabled */}
              <Pressable
                onPress={handleSendEmail}
                disabled={!emailValid || loading || cooldown > 0}
                style={[
                  styles.submitBtn,
                  emailValid && !loading && cooldown === 0 ? styles.submitBtnActive : styles.submitBtnDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={emailValid ? '#ffffff' : '#047857'} size="small" />
                ) : (
                  <Text
                    style={[
                      styles.submitBtnText,
                      emailValid && styles.submitBtnTextActive,
                    ]}
                  >
                    {cooldown > 0 ? `Send code in ${cooldown}s` : 'Send verification code'}
                  </Text>
                )}
              </Pressable>

              {/* Spacer pushing info card and footer to the bottom */}
              <View style={styles.spacer} />

              {/* Mobile OTP notice box */}
              <View style={styles.infoBox}>
                <Info size={17} color="#059669" strokeWidth={2.2} style={styles.infoIcon} />
                <Text style={styles.infoText}>
                  Codes expire in 15 minutes. You can request up to three per hour. After three incorrect attempts, verification is locked until the three-hour security window resets.
                </Text>
              </View>

              {/* Footer navigation link */}
              <View style={styles.footerRow}>
                <Text style={styles.footerPrompt}>Remembered it? </Text>
                <Pressable onPress={() => navigation.navigate('Login')} disabled={loading} hitSlop={8}>
                  <Text style={styles.footerLink}>Log In</Text>
                </Pressable>
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconBox}>
                <KeyRound size={26} color="#047857" strokeWidth={2.3} />
              </View>

              <Text style={styles.title}>Enter passcode</Text>
              <Text style={styles.subtitle}>
                If {email} has an account, a six-digit code will arrive shortly. Only the latest code works; it expires in 15 minutes.
              </Text>

              <Text style={styles.label}>6-digit passcode</Text>
              <View style={styles.inputContainer}>
                <Hash size={18} color="#64748b" strokeWidth={2} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="123456"
                  placeholderTextColor="#64748b"
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyOtp}
                />
              </View>

              <Pressable
                onPress={handleVerifyOtp}
                disabled={!otpValid || loading || resending}
                style={[
                  styles.submitBtn,
                  otpValid && !loading ? styles.submitBtnActive : styles.submitBtnDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={otpValid ? '#ffffff' : '#047857'} size="small" />
                ) : (
                  <Text
                    style={[
                      styles.submitBtnText,
                      otpValid && styles.submitBtnTextActive,
                    ]}
                  >
                    Verify passcode
                  </Text>
                )}
              </Pressable>

              <View style={styles.spacer} />

              <View style={styles.resendRow}>
                <Text style={styles.footerPrompt}>Didn’t receive the code? </Text>
                <Pressable onPress={handleResendOtp} disabled={resending || loading || cooldown > 0} hitSlop={8}>
                  <Text style={styles.footerLink}>
                    {resending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend passcode'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconBox}>
                <Lock size={26} color="#047857" strokeWidth={2.3} />
              </View>

              <Text style={styles.title}>Set new password</Text>
              <Text style={styles.subtitle}>
                Your identity has been verified! Choose a new secure password below.
              </Text>

              <Text style={styles.label}>New password</Text>
              <View style={[styles.inputContainer, { marginBottom: 16 }]}>
                <Lock size={18} color="#64748b" strokeWidth={2} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#64748b"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  {showPassword ? (
                    <EyeOff size={18} color="#64748b" />
                  ) : (
                    <Eye size={18} color="#64748b" />
                  )}
                </Pressable>
              </View>

              <Text style={styles.label}>Confirm new password</Text>
              <View style={styles.inputContainer}>
                <Lock size={18} color="#64748b" strokeWidth={2} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Repeat your new password"
                  placeholderTextColor="#64748b"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                />
              </View>

              {confirmPassword.length > 0 && !passwordsMatch && (
                <Text style={styles.errorText}>Passwords do not match</Text>
              )}

              <Pressable
                onPress={handleResetPassword}
                disabled={!passwordValid || !passwordsMatch || loading}
                style={[
                  styles.submitBtn,
                  passwordValid && passwordsMatch && !loading
                    ? styles.submitBtnActive
                    : styles.submitBtnDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator
                    color={passwordValid && passwordsMatch ? '#ffffff' : '#047857'}
                    size="small"
                  />
                ) : (
                  <Text
                    style={[
                      styles.submitBtnText,
                      passwordValid && passwordsMatch && styles.submitBtnTextActive,
                    ]}
                  >
                    Reset password
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 20,
  },
  stepContainer: {
    flex: 1,
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#e6f4ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 26,
    lineHeight: 32,
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14.5,
    lineHeight: 22,
    color: '#4b5563',
    marginBottom: 26,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#1f2937',
    marginBottom: 8,
  },
  inputContainer: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: 0,
  },
  submitBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  submitBtnDisabled: {
    backgroundColor: '#dbe5dd',
  },
  submitBtnActive: {
    backgroundColor: '#047857',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  submitBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#55685d',
  },
  submitBtnTextActive: {
    color: '#ffffff',
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
    marginLeft: 2,
  },
  spacer: {
    flex: 1,
    minHeight: 60,
  },
  infoBox: {
    backgroundColor: '#f1f5f2',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#374151',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 6,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 12,
    marginTop: 14,
  },
  footerPrompt: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#4b5563',
  },
  footerLink: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#047857',
  },
});
