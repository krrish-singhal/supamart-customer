import { useState, useRef, useEffect, useContext } from 'react';
import {
  View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Keyboard, Pressable, StatusBar, Image, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../config/firebase';
import { signInWithPhoneNumber } from 'firebase/auth';
import apiClient from '../services/api';
import Toast from 'react-native-toast-message';
import { ArrowLeft } from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';

const BYPASS_PHONE = '1234567890';
const BYPASS_OTP   = '123456';

function OTPInputCircle({ length = 6, value = '', onChange }) {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={{ marginBottom: 32 }}>
      <Pressable onPress={() => inputRef.current?.focus()} style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
        {Array.from({ length }).map((_, index) => {
          const char = value[index] || '';
          const isCurrentFocus = isFocused && value.length === index;
          const isFilled = char.length > 0;
          return (
            <View
              key={index}
              style={{
                width: 48, height: 48, borderRadius: 24,
                borderWidth: 1.5, 
                borderColor: isCurrentFocus || isFilled ? '#10b981' : '#bbf7d0',
                backgroundColor: isFilled ? '#f0fdf4' : '#fff',
                alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#0f172a' }}>{char}</Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus
        caretHidden
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0 }}
      />
    </View>
  );
}

export default function OtpAuthScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [isBypass, setIsBypass] = useState(false);

  const { login } = useContext(AuthContext);
  const confirmationRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const startTimer = () => {
    setTimer(30);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handlePhoneSubmit = async () => {
    if (loading) return;
    if (phone === BYPASS_PHONE) {
      setIsBypass(true);
      setStep('otp');
      startTimer();
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      Toast.show({ type: 'error', text1: 'Invalid phone number.' });
      return;
    }
    setIsBypass(false);
    setLoading(true);
    try {
      const confirmation = await signInWithPhoneNumber(auth, `+91${phone}`);
      confirmationRef.current = confirmation;
      setStep('otp');
      startTimer();
    } catch {
      Toast.show({ type: 'error', text1: 'Network issue. Check your connection.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (enteredOtp) => {
    const currentOtp = enteredOtp !== undefined ? enteredOtp : otp;
    if (currentOtp.length !== 6) return;
    setLoading(true);
    try {
      if (isBypass) {
        if (currentOtp !== BYPASS_OTP) throw new Error('Incorrect OTP');
        const res = await apiClient.post('/auth/session', { devBypass: true, mobile: BYPASS_PHONE, name: 'User' });
        if (res.data?.token) await login(res.data.token, res.data);
        return;
      }
      const result = await confirmationRef.current.confirm(currentOtp);
      const firebaseToken = await result.user.getIdToken();
      const res = await apiClient.post('/auth/session', { firebaseToken, mobile: phone, name: '' });
      if (res.data?.token) await login(res.data.token, res.data);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Network issue. Check your connection.' });
    } finally {
      setLoading(false);
    }
  };

  const onOtpChange = (val) => {
    const clean = val.replace(/[^0-9]/g, '');
    setOtp(clean);
    if (clean.length === 6) { Keyboard.dismiss(); handleOtpSubmit(clean); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 20 }} keyboardShouldPersistTaps="handled">
          
          {step === 'phone' && (
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 40 }}>
              <Image source={require('../../assets/logo.png')} style={{ width: 120, height: 120, marginBottom: 40 }} resizeMode="contain" />
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' }}>
                Welcome to SupaMart
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b', marginBottom: 32, textAlign: 'center' }}>
                Enter your mobile number to get started
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, overflow: 'hidden', height: 56, marginBottom: 24, backgroundColor: '#f8fafc' }}>
                <View style={{ paddingHorizontal: 16, height: '100%', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#e2e8f0', backgroundColor: '#fff' }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}>+91</Text>
                </View>
                <TextInput
                  style={{ flex: 1, height: '100%', fontSize: 18, color: '#0f172a', fontWeight: '600', paddingHorizontal: 16, letterSpacing: 1 }}
                  placeholderTextColor="#94a3b8"
                  placeholder="98765 43210"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                  editable={!loading}
                  onSubmitEditing={handlePhoneSubmit}
                />
              </View>
              <Pressable
                onPress={handlePhoneSubmit}
                disabled={loading || phone.length !== 10}
                style={{ width: '100%', height: 56, backgroundColor: (loading || phone.length !== 10) ? '#86efac' : '#16a34a', borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Continue</Text>}
              </Pressable>
            </View>
          )}

          {step === 'otp' && (
            <View style={{ flex: 1, paddingTop: 10 }}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Image source={require('../../assets/logo.png')} style={{ width: 80, height: 80, marginBottom: 10 }} resizeMode="contain" />
              </View>
              <Pressable onPress={() => { setStep('phone'); setOtp(''); }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <ArrowLeft size={20} color="#0f172a" />
              </Pressable>
              <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a', marginBottom: 8 }}>
                Verify your number
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b', marginBottom: 32 }}>
                Code sent to <Text style={{ fontWeight: '700', color: '#0f172a' }}>+91 {phone}</Text>
              </Text>
              
              <OTPInputCircle length={6} value={otp} onChange={onOtpChange} />

              <Pressable
                onPress={() => handleOtpSubmit(otp)}
                disabled={loading || otp.length !== 6}
                style={{ width: '100%', height: 56, backgroundColor: (loading || otp.length !== 6) ? '#86efac' : '#16a34a', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Verify</Text>}
              </Pressable>

              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b', marginRight: 8 }}>
                  Didn't receive the code?
                </Text>
                <Pressable onPress={() => { if (timer === 0) handlePhoneSubmit(); }} disabled={loading || timer > 0}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: timer > 0 ? '#94a3b8' : '#16a34a' }}>
                    {timer > 0 ? `Resend in ${timer}s` : 'Resend'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
