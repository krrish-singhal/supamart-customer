import React, { useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Switch,
  Modal,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  MapPin,
  Bookmark,
  RotateCcw,
  CreditCard,
  HelpCircle,
  Info,
  FileText,
  ShieldCheck,
  Bell,
  Star,
  X,
  Phone,
  Clock,
  Mail,
} from '../components/icons';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../services/api';
import { Dialog } from '../components/ui';
import MSClubModal from '../components/MSClubModal';
import { optimizeCloudinaryUrl } from '../utils/cloudinaryImage';
import { fonts } from '../theme/typography';

export default function AccountScreen({ navigation }) {
  const { userProfile, signOut, logout } = useContext(AuthContext);
  const userId = userProfile?.uid || userProfile?.id;
  const preferenceKey = `@supamart_offer_notifications_${userId || 'guest'}`;

  const [offerNotifications, setOfferNotifications] = useState(
    userProfile?.offerNotificationsEnabled !== false
  );
  const [logoutDialog, setLogoutDialog] = useState(false);
  const [showClubModal, setShowClubModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(preferenceKey)
      .then((saved) => {
        if (active && saved != null) setOfferNotifications(saved === 'true');
        else if (active) setOfferNotifications(userProfile?.offerNotificationsEnabled !== false);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [preferenceKey, userProfile?.offerNotificationsEnabled]);

  const saveOfferNotifications = async (enabled) => {
    setOfferNotifications(enabled);
    try {
      await AsyncStorage.setItem(preferenceKey, String(enabled));
      if (userId) {
        await apiClient.put(`/users/${userId}`, { offerNotificationsEnabled: enabled });
      }
      Toast.show({
        type: 'success',
        text1: enabled ? 'Offer notifications enabled' : 'Offer notifications disabled',
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not sync notification preference' });
    }
  };

  const displayName = userProfile?.name || 'Customer';
  const rawMobile = userProfile?.mobile || userProfile?.phone || '';
  const displayPhone = rawMobile ? `+91${rawMobile.replace(/^\+91/, '')}` : '+91 [mobile number]';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'A';

  const handleLogout = async () => {
    setLogoutDialog(false);
    try {
      const doSignOut = signOut || logout;
      if (doSignOut) {
        await doSignOut();
      }
      Toast.show({ type: 'success', text1: 'Logged out successfully.' });
    } catch (err) {
      console.warn('Logout failed:', err);
      Toast.show({ type: 'error', text1: 'Could not log out. Please try again.' });
    }
  };

  // 3 Quick Action Cards
  const shortcuts = [
    { label: 'Orders', Icon: ShoppingBag, route: 'Orders' },
    { label: 'Addresses', Icon: MapPin, route: 'MyAddresses' },
    { label: 'My lists', Icon: Bookmark, route: 'ShoppingLists' },
  ];

  // Grouped Menu List
  const menuItems = [
    {
      id: 'buy_again',
      label: 'Buy again',
      Icon: RotateCcw,
      onPress: () => navigation.navigate('BuyAgain'),
    },
    {
      id: 'payment_methods',
      label: 'Payment methods',
      Icon: CreditCard,
      onPress: () => navigation.navigate('Payment'),
    },
    {
      id: 'refunds',
      label: 'Refunds',
      Icon: RotateCcw,
      onPress: () => navigation.navigate('RefundStatus'),
    },
    {
      id: 'help_support',
      label: 'Help & support',
      Icon: HelpCircle,
      onPress: () => navigation.navigate('HelpSupport'),
    },
    {
      id: 'about',
      label: 'About MS Traders',
      Icon: Info,
      onPress: () => setShowAboutModal(true),
    },
    {
      id: 'terms',
      label: 'Terms of Service',
      Icon: FileText,
      onPress: () => navigation.navigate('Terms'),
    },
    {
      id: 'privacy',
      label: 'Privacy Policy',
      Icon: ShieldCheck,
      onPress: () => navigation.navigate('PrivacyPolicy'),
    },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Main', { screen: 'Home' });
            }
          }}
          hitSlop={12}
          accessibilityLabel="Go back"
          style={styles.backButton}
        >
          <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
        </Pressable>
        <Text style={styles.title}>Account</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Profile Card Header */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {userProfile?.profileImage ? (
              <Image
                source={{ uri: optimizeCloudinaryUrl(userProfile.profileImage, 120) }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <Text style={styles.initialText}>{initial}</Text>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text numberOfLines={1} style={styles.customerName}>
              {displayName}
            </Text>
            <Text style={styles.customerPhone}>{displayPhone}</Text>
          </View>

          <Pressable
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.editBtn}
            hitSlop={8}
            accessibilityLabel="Edit profile"
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          {/* Join MS Club Banner */}
          <Pressable
            onPress={() => setShowClubModal(true)}
            style={styles.clubBanner}
          >
            <View style={styles.starBox}>
              <Star size={22} color="#fbbf24" strokeWidth={2.2} />
            </View>
            <View style={styles.clubTextCol}>
              <Text style={styles.clubTitle}>Join MS Club</Text>
              <Text style={styles.clubSubtitle}>Free delivery and extra savings</Text>
            </View>
            <ChevronRight size={22} color="#ffffff" strokeWidth={2.4} />
          </Pressable>

          {/* 3 Shortcut Cards: Orders, Addresses, My lists */}
          <View style={styles.shortcutsRow}>
            {shortcuts.map(({ label, Icon, route }, idx) => (
              <Pressable
                key={label}
                onPress={() => navigation.navigate(route)}
                style={[
                  styles.shortcutCard,
                  idx < shortcuts.length - 1 && styles.shortcutCardMargin,
                ]}
              >
                <Icon size={22} color="#047857" strokeWidth={2.2} />
                <Text style={styles.shortcutLabel}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Grouped Settings Menu Card */}
          <View style={styles.menuCard}>
            {menuItems.map(({ id, label, Icon, onPress }) => (
              <Pressable
                key={id}
                onPress={onPress}
                style={styles.menuRow}
              >
                <View style={styles.menuIconBox}>
                  <Icon size={18} color="#047857" strokeWidth={2.2} />
                </View>
                <Text style={styles.menuLabel}>{label}</Text>
                <ChevronRight size={18} color="#94a3b8" strokeWidth={2.2} />
              </Pressable>
            ))}

            {/* Offer notifications Row with Switch */}
            <View style={[styles.menuRow, styles.menuRowLast]}>
              <View style={styles.menuIconBox}>
                <Bell size={18} color="#047857" strokeWidth={2.2} />
              </View>
              <Text style={styles.menuLabel}>Offer notifications</Text>
              <Switch
                accessibilityLabel="Offer notifications"
                value={offerNotifications}
                onValueChange={saveOfferNotifications}
                trackColor={{ false: '#cbd5e1', true: '#047857' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {/* Log out Button */}
          <Pressable
            onPress={() => setLogoutDialog(true)}
            style={styles.logoutButton}
          >
            <Text style={styles.logoutButtonText}>Log out</Text>
          </Pressable>

          {/* Delete account text link */}
          <Pressable
            onPress={() => navigation.navigate('DeleteAccount')}
            hitSlop={8}
            style={styles.deleteAccountLink}
          >
            <Text style={styles.deleteAccountText}>Delete account</Text>
          </Pressable>

          {/* Version Footer */}
          <Text style={styles.versionText}>MS Traders · version 1.0</Text>
        </View>
      </ScrollView>

      {/* Logout Confirmation Dialog */}
      <Dialog
        visible={logoutDialog}
        title="Log Out"
        message="Are you sure you want to log out of your MS Traders account?"
        confirmText="Log Out"
        cancelText="Cancel"
        destructive
        onConfirm={handleLogout}
        onCancel={() => setLogoutDialog(false)}
      />

      {/* MS Club Modal */}
      <MSClubModal visible={showClubModal} onClose={() => setShowClubModal(false)} />

      {/* About MS Traders Modal */}
      <Modal
        visible={showAboutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAboutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.aboutModalCard}>
            <View style={styles.aboutModalHeader}>
              <Text style={styles.aboutModalTitle}>About MS Traders</Text>
              <Pressable
                onPress={() => setShowAboutModal(false)}
                hitSlop={10}
                style={styles.aboutModalClose}
                accessibilityLabel="Close"
              >
                <X size={18} color="#475569" strokeWidth={2.4} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1, marginBottom: 14 }}
              contentContainerStyle={{ paddingBottom: 6 }}
            >
              <Text style={styles.aboutDescription}>
                MS Traders is your trusted neighborhood grocery destination, delivering farm-fresh produce, pantry essentials, and daily necessities to your doorstep in 10–15 minutes.
              </Text>

              <View style={styles.aboutInfoBox}>
                <View style={styles.aboutInfoRow}>
                  <View style={styles.aboutIconBadge}>
                    <Clock size={16} color="#047857" strokeWidth={2.4} />
                  </View>
                  <Text style={styles.aboutInfoText}>Open 10:00 AM – 11:00 PM every day</Text>
                </View>

                <View style={styles.aboutInfoRow}>
                  <View style={styles.aboutIconBadge}>
                    <MapPin size={16} color="#047857" strokeWidth={2.4} />
                  </View>
                  <Text style={styles.aboutInfoText}>Delivery available within 5 km of our store</Text>
                </View>

                <Pressable
                  onPress={() => Linking.openURL('mailto:hassanramla31@gmail.com').catch(() => {})}
                  style={styles.aboutInfoRow}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                    <View style={styles.aboutIconBadge}>
                      <Mail size={16} color="#047857" strokeWidth={2.4} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aboutInfoLabel}>Customer Support</Text>
                      <Text style={styles.aboutInfoTextBold}>hassanramla31@gmail.com</Text>
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => Linking.openURL('tel:+919037655180').catch(() => {})}
                  style={[styles.aboutInfoRow, { marginBottom: 0 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                    <View style={styles.aboutIconBadge}>
                      <Phone size={16} color="#047857" strokeWidth={2.4} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aboutInfoLabel}>Helpline</Text>
                      <Text style={styles.aboutInfoTextBold}>+91 90376 55180</Text>
                    </View>
                  </View>
                </Pressable>
              </View>

              {/* Organized Terms of Service & Privacy Policy List Card */}
              <View style={styles.aboutLegalCard}>
                <Pressable
                  onPress={() => {
                    setShowAboutModal(false);
                    navigation.navigate('Terms');
                  }}
                  style={styles.aboutLegalRow}
                >
                  <View style={styles.aboutLegalRowContent}>
                    <View style={styles.aboutLegalIconBadge}>
                      <FileText size={16} color="#047857" strokeWidth={2.2} />
                    </View>
                    <Text style={styles.aboutLegalTitle}>Terms of Service</Text>
                    <ChevronRight size={16} color="#94a3b8" strokeWidth={2.4} />
                  </View>
                </Pressable>

                <View style={styles.aboutLegalDivider} />

                <Pressable
                  onPress={() => {
                    setShowAboutModal(false);
                    navigation.navigate('PrivacyPolicy');
                  }}
                  style={styles.aboutLegalRow}
                >
                  <View style={styles.aboutLegalRowContent}>
                    <View style={styles.aboutLegalIconBadge}>
                      <ShieldCheck size={16} color="#047857" strokeWidth={2.2} />
                    </View>
                    <Text style={styles.aboutLegalTitle}>Privacy Policy</Text>
                    <ChevronRight size={16} color="#94a3b8" strokeWidth={2.4} />
                  </View>
                </Pressable>
              </View>
            </ScrollView>

            <Pressable
              onPress={() => setShowAboutModal(false)}
              style={styles.aboutDoneBtn}
            >
              <Text style={styles.aboutDoneBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f6f4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 4,
    marginRight: 6,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: '#0f172a',
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingBottom: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 22,
    backgroundColor: '#ffffff',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  initialText: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  customerName: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#0f172a',
  },
  customerPhone: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: '#64748b',
    marginTop: 3,
  },
  editBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 7,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#0f172a',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 0,
  },
  clubBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#047857',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  starBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  clubTextCol: {
    flex: 1,
    marginRight: 8,
  },
  clubTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#ffffff',
  },
  clubSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: '#dcfce7',
    marginTop: 2,
  },
  shortcutsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  shortcutCard: {
    flex: 1,
    height: 86,
    borderWidth: 1,
    borderColor: '#edf2ed',
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  shortcutCardMargin: {
    marginRight: 10,
  },
  shortcutLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#0f172a',
    marginTop: 6,
  },
  menuCard: {
    borderWidth: 1,
    borderColor: '#edf2ed',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eaf6ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#0f172a',
  },
  logoutButton: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoutButtonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#dc2626',
  },
  deleteAccountLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  deleteAccountText: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: '#dc2626',
  },
  versionText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  aboutModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  aboutModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  aboutModalTitle: {
    fontFamily: fonts.extraBold,
    fontWeight: 'normal',
    fontSize: 20,
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  aboutModalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutDescription: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 21,
    color: '#475569',
    marginBottom: 14,
  },
  aboutInfoBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 14,
  },
  aboutInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aboutIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aboutInfoLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: '#64748b',
    marginBottom: 1,
  },
  aboutInfoText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#334155',
    flex: 1,
    lineHeight: 18,
  },
  aboutInfoTextBold: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#0f172a',
  },
  aboutLegalCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 8,
  },
  aboutLegalRow: {
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  aboutLegalRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  aboutLegalIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aboutLegalTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#0f172a',
  },
  aboutLegalDivider: {
    height: 1,
    backgroundColor: '#edf2f7',
    marginLeft: 58,
  },
  aboutDoneBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  aboutDoneBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#ffffff',
  },
});
