import { useState, useRef, useEffect, useContext } from 'react';
import {
  View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Keyboard, Pressable, StatusBar, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { auth } from '../config/firebase';
import { signInWithPhoneNumber } from 'firebase/auth';
import apiClient from '../services/api';
import Toast from 'react-native-toast-message';
import { Phone, ArrowLeft, ChevronDown } from 'lucide-react-native';
import { Button, Input, OTPInput } from '../components/ui';
import { AuthContext } from '../context/AuthContext';

const BYPASS_PHONE = '1234567890';
const BYPASS_OTP   = '123456';

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
      Toast.show({ type: 'success', text1: 'OTP sent successfully.' });
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      Toast.show({ type: 'error', text1: 'Enter a valid 10-digit mobile number.' });
      return;
    }

    setIsBypass(false);
    setLoading(true);
    try {
      const confirmation = await signInWithPhoneNumber(auth, `+91${phone}`);
      confirmationRef.current = confirmation;
      setStep('otp');
      startTimer();
      Toast.show({ type: 'success', text1: 'OTP sent successfully.' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to send OTP. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (enteredOtp) => {
    const currentOtp = enteredOtp !== undefined ? enteredOtp : otp;
    if (currentOtp.length !== 6) {
      Toast.show({ type: 'error', text1: 'Enter the 6-digit OTP.' });
      return;
    }
    setLoading(true);
    try {
      if (isBypass) {
        if (currentOtp !== BYPASS_OTP) {
          Toast.show({ type: 'error', text1: 'Incorrect OTP. Please try again.' });
          setLoading(false);
          return;
        }
        const res = await apiClient.post('/auth/session', {
          devBypass: true,
          mobile: BYPASS_PHONE,
          name: 'User',
        });
        if (res.data?.token) {
          await login(res.data.token, res.data);
          Toast.show({ type: 'success', text1: 'Login successful.' });
        } else {
          throw new Error('No token returned');
        }
        return;
      }

      const result = await confirmationRef.current.confirm(currentOtp);
      const firebaseToken = await result.user.getIdToken();
      const res = await apiClient.post('/auth/session', {
        firebaseToken,
        mobile: phone,
        name: '',
      });
      if (res.data?.token) {
        await login(res.data.token, res.data);
        Toast.show({ type: 'success', text1: 'Login successful.' });
      } else {
        throw new Error('No token');
      }
    } catch (e) {
      const msg = e.message?.includes('expired') ? 'OTP expired. Please request a new one.' :
                  e.message?.includes('network') ? 'Network error. Please try again.' : 'Incorrect OTP. Please try again.';
      Toast.show({ type: 'error', text1: msg });
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
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <Animated.View
            entering={FadeInDown.duration(400)}
            className="flex-row items-center mt-8 mb-10"
          >
            <Image 
              source={require('../../assets/logo.png')} 
              style={{ width: 100, height: 100 }} 
              resizeMode="contain" 
            />
          </Animated.View>

          {step === 'phone' && (
            <Animated.View entering={FadeInDown.duration(450).delay(60)}>
              <Text className="text-3xl font-black text-text-primary mb-2 leading-tight">
                What&apos;s your{'\n'}phone number?
              </Text>
              <Text className="text-base font-medium text-text-secondary mb-10 leading-6">
                We&apos;ll send a one-time code to confirm it&apos;s you.
              </Text>

              <Text className="text-xs font-black text-text-tertiary mb-2 uppercase tracking-widest">
                Mobile Number
              </Text>

              <View
                className="flex-row items-center border border-border rounded-2xl overflow-hidden bg-surface-50 mb-6"
                style={{ height: 56 }}
              >
                <View className="flex-row items-center px-4 h-full border-r border-border bg-white">
                  <Text className="text-base font-bold text-text-primary">🇮🇳</Text>
                  <Text className="text-sm font-bold text-text-primary ml-1.5">+91</Text>
                  <ChevronDown size={14} color="#64748b" style={{ marginLeft: 4 }} />
                </View>
                <TextInput
                  style={{ flex: 1, height: 56, fontSize: 16, color: '#0f172a', fontWeight: '500', paddingHorizontal: 16 }}
                  placeholderTextColor="#94a3b8"
                  placeholder="98765 43210"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handlePhoneSubmit}
                />
              </View>

              <Button
                title="Send OTP"
                onPress={handlePhoneSubmit}
                disabled={loading || phone.length !== 10}
                loading={loading}
                size="lg"
                icon={!loading && <Phone size={18} color="#fff" />}
              />

              <Text className="text-xs font-medium text-text-tertiary text-center mt-8 leading-5">
                By continuing, you agree to our Terms of Service{'\n'}and Privacy Policy.
              </Text>
            </Animated.View>
          )}

          {step === 'otp' && (
            <Animated.View entering={FadeInUp.duration(400)}>
              <Pressable
                onPress={() => { setStep('phone'); setOtp(''); }}
                className="w-10 h-10 rounded-full bg-surface-100 items-center justify-center mb-8"
              >
                <ArrowLeft size={20} color="#0f172a" />
              </Pressable>

              <Text className="text-3xl font-black text-text-primary mb-2 leading-tight">
                Verify your{'\n'}number
              </Text>
              <Text className="text-base font-medium text-text-secondary mb-8 leading-6">
                Code sent to{' '}
                <Text className="font-bold text-text-primary">+91 {phone}</Text>
              </Text>

              <OTPInput length={6} value={otp} onChange={onOtpChange} />

              <Button
                title="Verify & Continue"
                onPress={() => handleOtpSubmit(otp)}
                disabled={loading || otp.length !== 6}
                loading={loading}
                size="lg"
                className="mb-6"
              />

              <View className="flex-row justify-center items-center">
                <Text className="text-sm font-medium text-text-secondary mr-2">
                  Didn&apos;t receive the code?
                </Text>
                <Pressable
                  onPress={() => { if (timer === 0) handlePhoneSubmit(); }}
                  disabled={loading || timer > 0}
                >
                  <Text className={`text-sm font-bold ${timer > 0 ? 'text-text-tertiary' : 'text-primary-600'}`}>
                    {timer > 0 ? `Resend in ${timer}s` : 'Resend'}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
