import React, { useContext, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User, MapPin, CreditCard, Bell, Shield, FileText, HelpCircle,
  Info, LogOut, ChevronRight, Star,
} from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { Image } from 'expo-image';
import { AuthContext } from '../context/AuthContext';
import { Card, Avatar, Skeleton, Dialog } from '../components/ui';

const MENU_SECTIONS = [
  {
    items: [
      { id: 'edit',      icon: User,       label: 'Edit Profile',      route: 'EditProfile' },
      { id: 'addresses', icon: MapPin,      label: 'My Addresses',      route: 'MyAddresses' },
      { id: 'payments',  icon: CreditCard,  label: 'Payment Methods',   route: null },
      { id: 'notifs',    icon: Bell,        label: 'Notifications',     route: null },
    ],
  },
  {
    items: [
      { id: 'privacy',   icon: Shield,      label: 'Privacy Policy',    route: null },
      { id: 'terms',     icon: FileText,    label: 'Terms & Conditions', route: null },
      { id: 'help',      icon: HelpCircle,  label: 'Help & Support',    route: null },
      { id: 'about',     icon: Info,        label: 'About SupaMart',    route: null },
    ],
  },
];

function MenuItem({ icon: Icon, label, onPress, danger }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between px-4 py-4 border-b border-border-light last:border-b-0 active:bg-surface-50 ${danger ? 'active:bg-red-50' : ''}`}
    >
      <View className="flex-row items-center flex-1">
        <View className={`w-9 h-9 rounded-2xl items-center justify-center mr-3 ${danger ? 'bg-red-50' : 'bg-surface-100'}`}>
          <Icon size={17} color={danger ? '#ef4444' : '#475569'} />
        </View>
        <Text className={`text-sm font-semibold ${danger ? 'text-red-500' : 'text-text-primary'}`}>{label}</Text>
      </View>
      {!danger && <ChevronRight size={16} color="#94a3b8" />}
    </Pressable>
  );
}

export default function ProfileScreen({ navigation }) {
  const { userProfile: user, logout, loading } = useContext(AuthContext);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const confirmLogout = () => {
    setShowLogoutDialog(true);
  };

  const handleLogout = async () => {
    setShowLogoutDialog(false);
    await logout();
    Toast.show({ type: 'success', text1: 'Logged out successfully.' });
  };

  const handleNav = (route) => {
    if (route) {
      navigation.navigate(route);
    } else {
      Toast.show({ type: 'info', text1: 'Coming soon.' });
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50">
        <View className="p-5">
          <Skeleton width="100%" height={130} borderRadius={24} className="mb-6" />
          <Skeleton width="100%" height={200} borderRadius={24} className="mb-4" />
          <Skeleton width="100%" height={200} borderRadius={24} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <Animated.View entering={FadeInUp.duration(350)}>
          <Card elevation="sm" className="mb-5 p-5 border-0 bg-white">
            <View className="flex-row items-center">
              {user?.profileImage ? (
                <Image
                  source={{ uri: user.profileImage }}
                  style={{ width: 64, height: 64, borderRadius: 32 }}
                  contentFit="cover"
                />
              ) : (
                <Avatar name={user?.name || 'User'} size="lg" />
              )}
              <View className="flex-1 ml-4">
                <Text className="text-xl font-black text-text-primary">{user?.name || 'User'}</Text>
                <Text className="text-sm font-medium text-text-secondary mt-0.5">
                  +91 {user?.mobile}
                </Text>
                {(user?.email) && (
                  <Text className="text-xs font-medium text-text-tertiary mt-0.5">{user.email}</Text>
                )}
                <View className="flex-row items-center mt-3 bg-surface-50 self-start px-3 py-1.5 rounded-full border border-border-light">
                  <Star size={12} color="#f59e0b" fill="#f59e0b" />
                  <Text className="text-xs font-bold text-text-secondary ml-1.5">
                    {user?.totalOrders || 0} Orders · ₹{(user?.lifetimeSpending || 0).toFixed(0)} Spent
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Menu Sections */}
        {MENU_SECTIONS.map((section, si) => (
          <Animated.View
            key={si}
            entering={FadeInUp.duration(350).delay((si + 1) * 80)}
            className="mb-4"
          >
            <Card elevation="sm" className="border-0 bg-white overflow-hidden p-0">
              {section.items.map((item) => (
                <MenuItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  onPress={() => handleNav(item.route)}
                />
              ))}
            </Card>
          </Animated.View>
        ))}

        {/* Logout */}
        <Animated.View entering={FadeInUp.duration(350).delay(240)}>
          <Card elevation="sm" className="border-0 bg-white overflow-hidden p-0">
            <MenuItem icon={LogOut} label="Sign Out" onPress={confirmLogout} danger />
          </Card>
        </Animated.View>

        <Text className="text-center text-xs font-medium text-text-tertiary mt-8">
          SupaMart v1.0 · Made with ♥ in India
        </Text>
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
