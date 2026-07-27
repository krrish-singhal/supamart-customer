import React, { useContext, useState } from 'react';
import { View, Text, ScrollView, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User, MapPin, CreditCard, HelpCircle,
  LogOut, ChevronRight, Settings
} from 'lucide-react-native';
import { Image } from 'expo-image';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../context/AuthContext';
import { Dialog } from '../components/ui';

const MENU_ITEMS = [
  { id: 'account',   icon: User,        label: 'My Account',      route: null },
  { id: 'addresses', icon: MapPin,      label: 'Address Book',    route: 'MyAddresses' },
  { id: 'payment',   icon: CreditCard,  label: 'Payment Methods', route: null },
  { id: 'help',      icon: HelpCircle,  label: 'Help & Support',  route: null },
  { id: 'settings',  icon: Settings,    label: 'Settings',        route: null },
];

function MenuItem({ icon: Icon, label, onPress, danger }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 18, paddingHorizontal: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9'
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Icon size={20} color={danger ? '#ef4444' : '#64748b'} />
        <Text style={{ fontSize: 16, fontWeight: '500', color: danger ? '#ef4444' : '#0f172a', marginLeft: 16 }}>{label}</Text>
      </View>
      {!danger && <ChevronRight size={18} color="#cbd5e1" />}
    </Pressable>
  );
}

export default function ProfileScreen({ navigation }) {
  const { userProfile: user, logout } = useContext(AuthContext);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const confirmLogout = () => setShowLogoutDialog(true);

  const handleLogout = async () => {
    setShowLogoutDialog(false);
    await logout();
    Toast.show({ type: 'success', text1: 'Logged out successfully.' });
  };

  const handleNav = (route) => {
    if (route) navigation.navigate(route);
    else Toast.show({ type: 'info', text1: 'Coming soon.' });
  };

  const userName = user?.name || 'User';
  const initial = userName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <ScrollView
        style={{ flex: 1, backgroundColor: '#ffffff' }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInUp.duration(350)}>
          <View style={{ padding: 20, backgroundColor: '#fff' }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a' }}>User Profile & Settings</Text>
          </View>
        </Animated.View>

        {/* User Info Section */}
        <Animated.View entering={FadeInUp.duration(350)}>
          <View style={{ padding: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f8fafc', paddingBottom: 24 }}>
            <View>
              {user?.profileImage ? (
                <Image
                  source={{ uri: user.profileImage }}
                  style={{ width: 80, height: 80, borderRadius: 40 }}
                  contentFit="cover"
                />
              ) : (
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 36, color: '#3b82f6', fontWeight: '400' }}>{initial}</Text>
                </View>
              )}
            </View>
            <View style={{ marginLeft: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '600', color: '#0f172a', marginBottom: 4 }}>{userName}</Text>
              <Pressable onPress={() => handleNav('EditProfile')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#16a34a' }}>Edit profile</Text>
                <ChevronRight size={14} color="#16a34a" style={{ marginTop: 1, marginLeft: 2 }} />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* Menu Items */}
        <Animated.View entering={FadeInUp.duration(350).delay(80)}>
          <View style={{ backgroundColor: '#fff', marginTop: 8 }}>
            {MENU_ITEMS.map((item) => (
              <MenuItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                onPress={() => handleNav(item.route)}
              />
            ))}
          </View>
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInUp.duration(350).delay(160)} style={{ marginTop: 32, marginBottom: 40 }}>
          <MenuItem icon={LogOut} label="Log out" onPress={confirmLogout} danger />
        </Animated.View>
      </ScrollView>

      <Dialog
        visible={showLogoutDialog}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        confirmText="Sign Out"
        cancelText="Cancel"
        destructive
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </SafeAreaView>
  );
}
