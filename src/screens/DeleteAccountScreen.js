import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Trash2,
  Check,
  AlertTriangle,
  Bell,
} from '../components/icons';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../services/api';
import { fonts } from '../theme/typography';

const REASONS = [
  "I don't use the app any more",
  "Delivery took too long",
  "Prices were higher than expected",
  "I'm worried about my privacy",
  "Something else",
];

export default function DeleteAccountScreen({ navigation }) {
  const { userProfile, deleteAccount, logout } = useContext(AuthContext);

  const [step, setStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState('');
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusData, setStatusData] = useState({
    hasActiveOrders: false,
    hasActiveRefunds: false,
    msClubActive: false,
    msClubExpiryDate: null,
    email: '',
  });

  // Step 2 State
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [targetEmail, setTargetEmail] = useState(userProfile?.email || '');
  const [deletionSuccess, setDeletionSuccess] = useState(false);
  const [deletionDateStr, setDeletionDateStr] = useState('');

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  // Fetch deletion pre-flight status
  useEffect(() => {
    let active = true;
    apiClient
      .get('/users/me/deletion-status', { __skipErrorToast: true })
      .then(({ data }) => {
        if (active) {
          setStatusData(data);
          if (data.email) setTargetEmail(data.email);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingStatus(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleContinueToDelete = async () => {
    if (statusData.hasActiveOrders) {
      Toast.show({
        type: 'error',
        text1: 'Active orders in progress',
        text2: 'Please wait until current orders are delivered or cancelled.',
      });
      return;
    }

    setSendingOtp(true);
    try {
      const { data } = await apiClient.post('/users/me/delete-otp');
      if (data.email) setTargetEmail(data.email);
      setStep(2);
      setResendCooldown(30);
      setOtpDigits(['', '', '', '', '', '']);
      Toast.show({
        type: 'success',
        text1: 'Verification code sent',
        text2: `A 6-digit code was sent to ${data.email || 'your email'}.`,
      });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Could not send confirmation email.';
      Toast.show({ type: 'error', text1: msg });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || sendingOtp) return;
    setSendingOtp(true);
    try {
      const { data } = await apiClient.post('/users/me/delete-otp');
      if (data.email) setTargetEmail(data.email);
      setResendCooldown(30);
      setOtpDigits(['', '', '', '', '', '']);
      Toast.show({
        type: 'success',
        text1: 'Code resent',
        text2: `A new 6-digit code was sent to ${data.email || 'your email'}.`,
      });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Could not resend email.';
      Toast.show({ type: 'error', text1: msg });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpChange = (val, idx) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    const next = [...otpDigits];
    next[idx] = cleaned.slice(-1);
    setOtpDigits(next);

    if (cleaned && idx < 5) {
      inputRefs[idx + 1]?.current?.focus();
    }
  };

  const handleOtpKeyPress = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      inputRefs[idx - 1]?.current?.focus();
    }
  };

  const isOtpComplete = otpDigits.every((d) => d.trim().length > 0);
  const canDelete = isOtpComplete && confirmedCheckbox && !deleting;

  const handleConfirmDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    const code = otpDigits.join('').trim();
    try {
      await deleteAccount({ otp: code, reason: selectedReason }, { deferLogout: true });
      const targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const day = targetDate.getDate();
      const month = targetDate.toLocaleDateString('en-US', { month: 'long' });
      const year = targetDate.getFullYear();
      setDeletionDateStr(`${day} ${month} ${year}`);
      setDeletionSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to delete account. Please try again.';
      Toast.show({ type: 'error', text1: msg });
      setDeleting(false);
    }
  };

  const handleFinalDone = async () => {
    try {
      await logout();
    } catch {}
    if (navigation.canGoBack()) {
      navigation.popToTop();
    }
  };

  const handleKeepAccount = () => {
    // Explicit user instruction: "keep my account should redirect to the account screen"
    navigation.navigate('Account');
  };

  if (deletionSuccess) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#ffffff' }]} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.successScreenContainer}>
          <View style={styles.successCenterWrap}>
            <View style={styles.successBadge}>
              <Check size={42} color="#047857" strokeWidth={3.5} />
            </View>

            <Text style={styles.successTitle}>Account deletion requested</Text>

            <Text style={styles.successSubtitle}>
              You’ve been logged out. We’ll permanently delete your data on{' '}
              <Text style={{ fontFamily: fonts.bold, color: '#0f172a' }}>{deletionDateStr}</Text>, 30 days from today.
            </Text>

            <View style={styles.successInfoCard}>
              <Text style={styles.successInfoText}>
                Changed your mind? Log in with the same number before that date and your account will be restored.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleFinalDone}
            style={({ pressed }) => [
              styles.doneBtn,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (step === 2) {
              setStep(1);
            } else {
              handleKeepAccount();
            }
          }}
          hitSlop={12}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
        </Pressable>
        <Text style={styles.headerTitle}>Delete account</Text>
        <Text style={styles.headerStep}>{step === 1 ? 'Step 1 of 2' : 'Step 2 of 2'}</Text>
      </View>

      {step === 1 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Red Alert Header Card */}
          <View style={styles.warningCard}>
            <View style={styles.trashIconBox}>
              <Trash2 size={20} color="#dc2626" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>Delete your MS Traders account?</Text>
              <Text style={styles.warningSubtitle}>
                This permanently removes your account and personal data. It can’t be undone after 30 days.
              </Text>
            </View>
          </View>

          {/* Before you go Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Before you go</Text>

            <View style={styles.statusRow}>
              {statusData.hasActiveOrders ? (
                <AlertTriangle size={17} color="#dc2626" strokeWidth={2.4} style={{ marginRight: 10 }} />
              ) : (
                <Check size={18} color="#047857" strokeWidth={2.6} style={{ marginRight: 10 }} />
              )}
              <Text
                style={[
                  styles.statusText,
                  statusData.hasActiveOrders && { color: '#dc2626', fontFamily: fonts.bold },
                ]}
              >
                {statusData.hasActiveOrders
                  ? `${statusData.activeOrdersCount || 1} active order(s) in progress`
                  : 'No active orders'}
              </Text>
            </View>

            <View style={styles.statusRow}>
              {statusData.hasActiveRefunds ? (
                <AlertTriangle size={17} color="#d97706" strokeWidth={2.4} style={{ marginRight: 10 }} />
              ) : (
                <Check size={18} color="#047857" strokeWidth={2.6} style={{ marginRight: 10 }} />
              )}
              <Text style={styles.statusText}>
                {statusData.hasActiveRefunds ? 'Refund in progress' : 'No refunds in progress'}
              </Text>
            </View>

            {/* Warning regarding club / remaining days */}
            <View style={styles.clubWarningBox}>
              <AlertTriangle size={18} color="#b45309" strokeWidth={2.2} style={{ marginRight: 10, marginTop: 2 }} />
              <Text style={styles.clubWarningText}>
                <Text style={{ fontFamily: fonts.bold }}>
                  MS Club is active until {statusData.msClubExpiryDate || '[DD Mon]'}.
                </Text>{' '}
                Remaining days and unused coupons will be lost and aren’t refunded.
              </Text>
            </View>
          </View>

          {/* What gets deleted Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What gets deleted</Text>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>Your name, mobile number and email</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>Saved addresses and map pins</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>Order history, cart and saved items</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>MS Club membership, coupons and offer preferences</Text>
            </View>

            <View style={styles.cardDivider} />

            <Text style={styles.cardTitle}>What we must keep</Text>
            <Text style={styles.legalText}>
              GST invoices and payment records, for as long as tax law requires. They aren’t linked to an active account and are never used for marketing.{' '}
              <Text
                onPress={() => navigation.navigate('PrivacyPolicy')}
                style={styles.privacyLink}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>

          {/* Why are you leaving? (optional) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Why are you leaving? <Text style={styles.optionalText}>(optional)</Text></Text>

            {REASONS.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <Pressable
                  key={reason}
                  onPress={() => setSelectedReason(isSelected ? '' : reason)}
                  style={[styles.radioItem, isSelected && styles.radioItemSelected]}
                >
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <View style={styles.radioInnerDot} />}
                  </View>
                  <Text style={styles.radioLabel}>{reason}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Offer Notification suggestion banner */}
          <View style={styles.tipBanner}>
            <Bell size={18} color="#047857" strokeWidth={2.2} style={{ marginRight: 10, marginTop: 2 }} />
            <Text style={styles.tipText}>
              Just want fewer messages? You can turn off offer notifications or log out instead of deleting your account.
            </Text>
          </View>

          {/* Step 1 Actions */}
          <View style={styles.actionContainer}>
            <Pressable
              onPress={handleContinueToDelete}
              disabled={sendingOtp || loadingStatus}
              style={({ pressed }) => [
                styles.deleteBtn,
                pressed && { opacity: 0.9 },
                (sendingOtp || loadingStatus) && { opacity: 0.7 },
              ]}
            >
              {sendingOtp ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.deleteBtnText}>Continue to delete</Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleKeepAccount}
              hitSlop={8}
              style={styles.keepAccountBtn}
            >
              <Text style={styles.keepAccountText}>Keep my account</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        /* Step 2 of 2 */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.step2Title}>Confirm it’s you</Text>
          <Text style={styles.step2Subtitle}>
            Enter the 6-digit code we sent to{' '}
            <Text style={styles.highlightText}>{targetEmail || 'your email'}</Text> to delete your account.
          </Text>

          {/* 6 Digit Code Input Boxes */}
          <View style={styles.otpRow}>
            {otpDigits.map((digit, idx) => (
              <TextInput
                key={`otp-${idx}`}
                ref={inputRefs[idx]}
                value={digit}
                onChangeText={(val) => handleOtpChange(val, idx)}
                onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                keyboardType="number-pad"
                maxLength={1}
                autoFocus={idx === 0}
                style={[
                  styles.otpBox,
                  idx === 0 && !digit && styles.otpBoxFirst,
                  digit ? styles.otpBoxFilled : null,
                ]}
              />
            ))}
          </View>

          {/* Resend Link */}
          <View style={styles.resendRow}>
            <Text style={styles.resendNormal}>Didn’t get it? </Text>
            <Pressable
              onPress={handleResendOtp}
              disabled={resendCooldown > 0 || sendingOtp}
              hitSlop={6}
            >
              <Text
                style={[
                  styles.resendLink,
                  resendCooldown > 0 && { color: '#94a3b8' },
                ]}
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
              </Text>
            </Pressable>
          </View>

          {/* Confirmation Checkbox */}
          <Pressable
            onPress={() => setConfirmedCheckbox(!confirmedCheckbox)}
            style={styles.checkboxCard}
          >
            <View
              style={[
                styles.checkbox,
                confirmedCheckbox && styles.checkboxActive,
              ]}
            >
              {confirmedCheckbox && <Check size={14} color="#ffffff" strokeWidth={3} />}
            </View>
            <Text style={styles.checkboxLabel}>
              I understand my account, addresses, order history and MS Club benefits will be permanently deleted.
            </Text>
          </Pressable>

          {/* Step 2 Actions */}
          <View style={[styles.actionContainer, { marginTop: 32 }]}>
            <Pressable
              onPress={handleConfirmDelete}
              disabled={!canDelete}
              style={[
                styles.deleteBtn,
                !canDelete && styles.deleteBtnDisabled,
              ]}
            >
              {deleting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text
                  style={[
                    styles.deleteBtnText,
                    !canDelete && styles.deleteBtnTextDisabled,
                  ]}
                >
                  Delete my account
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleKeepAccount}
              hitSlop={8}
              style={styles.keepAccountBtn}
            >
              <Text style={styles.keepAccountText}>Cancel</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f6f3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#0f172a',
    flex: 1,
    marginLeft: 10,
  },
  headerStep: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#64748b',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  trashIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  warningTitle: {
    fontFamily: fonts.bold,
    fontSize: 15.5,
    color: '#0f172a',
    lineHeight: 21,
  },
  warningSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#475569',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#edf2ed',
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 12,
  },
  optionalText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#64748b',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusText: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: '#334155',
  },
  clubWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fef3c7',
    padding: 12,
    marginTop: 6,
  },
  clubWarningText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#92400e',
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    fontSize: 15,
    color: '#0f172a',
    marginRight: 8,
    lineHeight: 19,
  },
  bulletText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  legalText: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#64748b',
  },
  privacyLink: {
    fontFamily: fonts.bold,
    color: '#047857',
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  radioItemSelected: {
    borderColor: '#047857',
    backgroundColor: '#f0fdf4',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioCircleSelected: {
    borderColor: '#047857',
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#047857',
  },
  radioLabel: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: '#0f172a',
  },
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  tipText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#166534',
  },
  actionContainer: {
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  deleteBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#b91c1c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#b91c1c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteBtnDisabled: {
    backgroundColor: '#f1d5d5',
    shadowOpacity: 0,
    elevation: 0,
  },
  deleteBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#ffffff',
  },
  deleteBtnTextDisabled: {
    color: '#a89090',
  },
  keepAccountBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  keepAccountText: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: '#047857',
  },
  step2Title: {
    fontFamily: fonts.extraBold,
    fontSize: 24,
    color: '#0f172a',
    marginTop: 10,
    marginBottom: 8,
  },
  step2Subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 20,
    color: '#475569',
    marginBottom: 24,
  },
  highlightText: {
    fontFamily: fonts.bold,
    color: '#0f172a',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 6,
  },
  otpBox: {
    flex: 1,
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    textAlign: 'center',
    fontSize: 22,
    fontFamily: fonts.bold,
    color: '#0f172a',
  },
  otpBoxFirst: {
    borderColor: '#ef4444',
  },
  otpBoxFilled: {
    borderColor: '#0f172a',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  resendNormal: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#64748b',
  },
  resendLink: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#047857',
  },
  checkboxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#ffffff',
  },
  checkboxActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#475569',
  },
  successScreenContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  successCenterWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  successBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 23,
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 12,
  },
  successSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
  },
  successInfoCard: {
    backgroundColor: '#f4f6f4',
    borderRadius: 16,
    padding: 16,
    width: '100%',
  },
  successInfoText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
    textAlign: 'center',
  },
  doneBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  doneBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#ffffff',
  },
});
