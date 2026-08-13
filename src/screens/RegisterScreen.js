import React, { useState, useContext } from 'react';
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, Lock, Eye, EyeOff, Smartphone, ArrowLeft } from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';
import { Input, Button } from '../components/ui';

export default function RegisterScreen({ navigation }) {
  const { register } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const mobileValid = /^[0-9]{10}$/.test(mobile.trim());
  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword;
  const canSubmit = name.trim().length > 0 && emailValid && mobileValid && passwordValid && passwordsMatch && !loading;

  const handleRegister = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), mobile: mobile.trim(), password });
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
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => navigation.goBack()}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}
          >
            <ArrowLeft size={20} color="#0f172a" />
          </Pressable>

          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <Image source={require('../../assets/logo.png')} style={{ width: 110, height: 55, marginBottom: 20 }} contentFit="contain" />
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 6, textAlign: 'center' }}>
              Create your account
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b', textAlign: 'center' }}>
              Register to start shopping on MS Traders
            </Text>
          </View>

          <Input
            label="Full Name"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            leftIcon={<User size={18} color="#64748b" />}
          />

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
            label="Mobile Number"
            placeholder="10-digit mobile number"
            value={mobile}
            onChangeText={(v) => setMobile(v.replace(/[^0-9]/g, '').slice(0, 10))}
            keyboardType="number-pad"
            maxLength={10}
            leftIcon={<Smartphone size={18} color="#64748b" />}
            error={mobile.length > 0 && !mobileValid ? 'Enter a valid 10-digit mobile number' : undefined}
          />

          <Input
            label="Password"
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
            label="Confirm Password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            leftIcon={<Lock size={18} color="#64748b" />}
            error={confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : undefined}
            onSubmitEditing={handleRegister}
          />

          <Button title="Create Account" onPress={handleRegister} loading={loading} disabled={!canSubmit} />

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
            <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '500' }}>Already have an account? </Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#16a34a' }}>Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
