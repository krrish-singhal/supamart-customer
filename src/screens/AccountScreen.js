import React, { useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Switch,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  ShoppingBag,
  MapPin,
  Bookmark,
  CreditCard,
  RotateCcw,
  HelpCircle,
  Bell,
  ChevronRight,
  Star,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../services/api';
import { Dialog } from '../components/ui';
import MSClubModal from '../components/MSClubModal';
import { optimizeCloudinaryUrl } from '../utils/cloudinaryImage';

export default function AccountScreen({ navigation }) {
  const { userProfile, signOut, logout } = useContext(AuthContext);
  const userId = userProfile?.uid || userProfile?.id;
  const preferenceKey = `@supamart_offer_notifications_${userId || 'guest'}`;
  const [offerNotifications, setOfferNotifications] = useState(userProfile?.offerNotificationsEnabled !== false);
  const [logoutDialog, setLogoutDialog] = useState(false);
  const [showClubModal, setShowClubModal] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(preferenceKey).then((saved) => {
      if (active && saved != null) setOfferNotifications(saved === 'true');
      else if (active) setOfferNotifications(userProfile?.offerNotificationsEnabled !== false);
    }).catch(() => {});
    return () => { active = false; };
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
  const displayPhone = userProfile?.mobile
    ? `+91 ${userProfile.mobile}`
    : userProfile?.phone
    ? `+91 ${userProfile.phone}`
    : userProfile?.email || '';

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

  const shortcuts = [
    { label: 'Orders', Icon: ShoppingBag, route: 'Orders' },
    { label: 'Addresses', Icon: MapPin, route: 'MyAddresses' },
    { label: 'Saved', Icon: Bookmark, route: 'Favorites' },
  ];

  const menu = [
    { label: 'Payment methods', Icon: CreditCard, route: 'Payment' },
    { label: 'Refunds', Icon: RotateCcw, route: 'RefundStatus' },
    { label: 'Help & support', Icon: HelpCircle, route: 'HelpSupport' },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header matching Image 1 */}
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
          <ChevronLeft size={22} color="#0f172a" strokeWidth={2.4} />
        </Pressable>
        <Text style={styles.title}>Account</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Profile Card Header matching Image 1 */}
        <View style={styles.profile}>
          <View style={styles.avatar}>
            {userProfile?.profileImage ? (
              <Image
                source={{ uri: optimizeCloudinaryUrl(userProfile.profileImage, 120) }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <Text style={styles.initial}>{initial}</Text>
            )}
          </View>
          <View style={styles.profileTextContainer}>
            <Text numberOfLines={1} style={styles.name}>
              {displayName}
            </Text>
            <Text style={styles.phone}>{displayPhone || '+91 [mobile number]'}</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.edit}
            hitSlop={6}
          >
            <Text style={styles.editLabel}>Edit</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          {/* Join MS Club Banner matching Image 1 */}
          <Pressable onPress={() => setShowClubModal(true)} style={styles.club}>
            <View style={styles.star}>
              <Star size={20} color="#facc15" fill="#facc15" strokeWidth={1.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clubTitle}>Join MS Club</Text>
              <Text style={styles.clubSubtitle}>Free delivery and extra savings</Text>
            </View>
            <ChevronRight size={20} color="#ffffff" strokeWidth={2.4} />
          </Pressable>

          {/* 3 Shortcut Cards matching Image 1 */}
          <View style={styles.shortcuts}>
            {shortcuts.map(({ label, Icon, route }) => (
              <Pressable
                key={route}
                onPress={() => navigation.navigate(route)}
                style={styles.shortcut}
              >
                <Icon size={22} color="#087f46" strokeWidth={2} />
                <Text style={styles.shortcutLabel}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Settings Menu Card matching Image 1 */}
          <View style={styles.menu}>
            {menu.map(({ label, Icon, route, action }) => (
              <Pressable
                key={label}
                onPress={() => {
                  if (action) action();
                  else if (route) navigation.navigate(route);
                }}
                style={styles.menuRow}
              >
                <View style={styles.menuIcon}>
                  <Icon size={18} color="#087f46" strokeWidth={2} />
                </View>
                <Text style={styles.menuLabel}>{label}</Text>
                <ChevronRight size={18} color="#94a3b8" strokeWidth={2.2} />
              </Pressable>
            ))}

            {/* Offer notifications Row matching Image 1 */}
            <View style={[styles.menuRow, { borderBottomWidth: 0 }]}>
              <View style={styles.menuIcon}>
                <Bell size={18} color="#087f46" strokeWidth={2} />
              </View>
              <Text style={styles.menuLabel}>Offer notifications</Text>
              <Switch
                accessibilityLabel="Offer notifications"
                value={offerNotifications}
                onValueChange={saveOfferNotifications}
                trackColor={{ false: '#cbd5e1', true: '#087f46' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {/* Log out Button matching Image 1 */}
          <Pressable onPress={() => setLogoutDialog(true)} style={styles.logout}>
            <Text style={styles.logoutLabel}>Log out</Text>
          </Pressable>

          {/* Version Footer matching Image 1 */}
          <Text style={styles.version}>MS Traders · version 1.0</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f3f6f3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 4,
    marginRight: 6,
  },
  title: {
    fontFamily: 'Inter-ExtraBold',
    fontSize: 18,
    fontWeight: 'normal',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingBottom: 36,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 22,
    backgroundColor: '#ffffff',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#087f46',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    fontWeight: 'normal',
    color: '#ffffff',
  },
  profileTextContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  name: {
    fontFamily: 'Inter-Bold',
    fontSize: 16.5,
    fontWeight: 'normal',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  phone: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    fontWeight: 'normal',
    color: '#64748b',
    marginTop: 3,
  },
  edit: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 12.5,
    fontWeight: 'normal',
    color: '#0f172a',
  },
  body: {
    padding: 16,
    gap: 14,
  },
  club: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#087f46',
    borderRadius: 16,
    padding: 16,
  },
  star: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clubTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 15.5,
    fontWeight: 'normal',
    color: '#ffffff',
  },
  clubSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    fontWeight: 'normal',
    color: '#dcfce7',
    marginTop: 2,
  },
  shortcuts: {
    flexDirection: 'row',
    gap: 10,
  },
  shortcut: {
    flex: 1,
    height: 84,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  shortcutLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    fontWeight: 'normal',
    color: '#0f172a',
  },
  menu: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
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
    height: 54,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontFamily: 'Inter-Bold',
    fontSize: 13.5,
    fontWeight: 'normal',
    color: '#0f172a',
  },
  logout: {
    height: 48,
    borderWidth: 1.2,
    borderColor: '#fca5a5',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  logoutLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    fontWeight: 'normal',
    color: '#dc2626',
  },
  version: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
    fontWeight: 'normal',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
});
