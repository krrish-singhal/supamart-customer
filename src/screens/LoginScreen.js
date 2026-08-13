import React, { useState, useContext } from 'react';
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';
import { Input, Button } from '../components/ui';

export default function LoginScreen({ navigation }) {
  const { signIn } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = emailValid && password.length > 0 && !loading;

  const handleSignIn = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch {
      // api.js interceptor already shows the error toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Image source={require('../../assets/logo.png')} style={{ width: 120, height: 60, marginBottom: 24 }} contentFit="contain" />
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 6, textAlign: 'center' }}>
              Welcome back
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b', textAlign: 'center' }}>
              Sign in to continue shopping
            </Text>
          </View>

          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            leftIcon={<Mail size={18} color="#64748b" />}
          />

          <Input
            label="Password"
            placeholder="Enter your password"
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
            onSubmitEditing={handleSignIn}
          />

          <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end', marginBottom: 24, marginTop: -8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#16a34a' }}>Forgot password?</Text>
          </Pressable>

          <Button title="Sign In" onPress={handleSignIn} loading={loading} disabled={!canSubmit} />

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '500' }}>Don&apos;t have an account? </Text>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#16a34a' }}>Register</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
