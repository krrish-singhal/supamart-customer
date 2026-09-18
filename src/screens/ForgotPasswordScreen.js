import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Hash } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { Input, Button } from '../components/ui';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  
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

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const otpValid = otp.trim().length === 6;
  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword;

  const handleSendEmail = async () => {
    if (!emailValid || loading) return;
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      setStep(2);
      Toast.show({ type: 'success', text1: '6-digit passcode sent to your email.' });
    } catch {
      // api interceptor handles error toast
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValid || loading) return;
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/verify-reset-otp', { email: email.trim(), otp: otp.trim() });
      if (res.data.resetToken) {
        setResetToken(res.data.resetToken);
        setStep(3);
      }
    } catch {
      // api interceptor handles error toast
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordValid || !passwordsMatch || loading) return;
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token: resetToken, password });
      Toast.show({ type: 'success', text1: 'Password changed successfully! You can now log in.' });
      navigation.navigate('Login');
    } catch {
      // api interceptor handles error toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 20 }} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => {
              if (step > 1) setStep(step - 1);
              else navigation.goBack();
            }}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}
          >
            <ArrowLeft size={20} color="#0f172a" />
          </Pressable>

          {step === 1 && (
            <View style={{ paddingTop: 10 }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 8 }}>
                Forgot password?
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b', marginBottom: 28, lineHeight: 20 }}>
                Enter the email linked to your account and we&apos;ll send you a 6-digit passcode.
              </Text>

              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                leftIcon={<Mail size={18} color="#64748b" />}
                onSubmitEditing={handleSendEmail}
              />

              <Button title="Send Passcode" onPress={handleSendEmail} loading={loading} disabled={!emailValid || loading} />
            </View>
          )}

          {step === 2 && (
            <View style={{ paddingTop: 10 }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 8 }}>
                Enter passcode
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b', marginBottom: 28, lineHeight: 20 }}>
                We sent a 6-digit code to {email}. Enter it below to verify your identity.
              </Text>

              <Input
                label="6-Digit Passcode"
                placeholder="123456"
                value={otp}
                onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                leftIcon={<Hash size={18} color="#64748b" />}
                onSubmitEditing={handleVerifyOtp}
              />

              <Button title="Verify Passcode" onPress={handleVerifyOtp} loading={loading} disabled={!otpValid || loading} />
            </View>
          )}

          {step === 3 && (
            <View style={{ paddingTop: 10 }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 8 }}>
                Set new password
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b', marginBottom: 28, lineHeight: 20 }}>
                Your identity has been verified! Choose a new secure password below.
              </Text>

              <Input
                label="New Password"
                placeholder="At least 8 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                leftIcon={<Lock size={18} color="#64748b" />}
                rightIcon={
                  <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                    {showPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                  </Pressable>
                }
              />

              <Input
                label="Confirm New Password"
                placeholder="Repeat your new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                leftIcon={<Lock size={18} color="#64748b" />}
                error={confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : undefined}
                onSubmitEditing={handleResetPassword}
              />

              <Button title="Reset Password" onPress={handleResetPassword} loading={loading} disabled={!passwordValid || !passwordsMatch || loading} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
