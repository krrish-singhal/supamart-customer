import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { Input, Button } from '../components/ui';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSend = async () => {
    if (!emailValid || loading) return;
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch {
      Toast.show({ type: 'error', text1: 'Something went wrong. Please try again.' });
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
            onPress={() => navigation.goBack()}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}
          >
            <ArrowLeft size={20} color="#0f172a" />
          </Pressable>

          {sent ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <MailCheck size={32} color="#16a34a" />
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 10, textAlign: 'center' }}>
                Check your email
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 32 }}>
                If an account exists for {email.trim()}, we&apos;ve sent a link to reset your password.
              </Text>
              <Button title="Back to Sign In" onPress={() => navigation.navigate('Login')} />
            </View>
          ) : (
            <View style={{ paddingTop: 10 }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 8 }}>
                Forgot password?
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b', marginBottom: 28, lineHeight: 20 }}>
                Enter the email linked to your account and we&apos;ll send you a link to reset your password.
              </Text>

              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                leftIcon={<Mail size={18} color="#64748b" />}
                onSubmitEditing={handleSend}
              />

              <Button title="Send Reset Link" onPress={handleSend} loading={loading} disabled={!emailValid || loading} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
