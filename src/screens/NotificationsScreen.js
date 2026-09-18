import React from 'react';
import { View, Text, FlatList, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CheckCircle2, XCircle, Package } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useNotifications } from '../context/NotificationsContext';
import EmptyState from '../components/EmptyState';
import { Header, Card } from '../components/ui';

// Picks a real icon (never an emoji) for each notification based on the `data.type` /
// `data.status` the backend writes (see backend/src/services/notificationService.js):
// payment approved / order delivered -> green check, payment rejected / order cancelled
// -> red cross, other order updates -> package, everything else -> bell.
function getNotifIcon(item) {
  const type = item.data?.type;
  const status = item.data?.status;
  if (type === 'PAYMENT_APPROVED' || status === 'DELIVERED') {
    return { Icon: CheckCircle2, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
  }
  if (type === 'PAYMENT_REJECTED' || status === 'CANCELLED') {
    return { Icon: XCircle, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
  }
  if (type === 'ORDER_STATUS') {
    return { Icon: Package, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
  }
  return { Icon: Bell, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
}

function timeAgo(ms) {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsScreen({ navigation }) {
  const { notifications, markAllRead } = useNotifications();

  // Live list from NotificationsContext (onSnapshot) — no fetch-on-mount needed, it's
  // already subscribed at the app root. Just mark everything read while viewing.
  //
  // markAllRead must be in the dep array here — NotificationsContext recreates it on
  // every render (it closes over the current `notifications` array), and locking this
  // callback to an empty dep array would freeze it to the *first* render's closure,
  // which captured whatever `notifications` was at mount (often still empty, before the
  // Firestore listener had returned anything). That stale closure meant "mark unread"
  // silently no-op'd, so the bell badge count never actually cleared after visiting here.
  useFocusEffect(
    React.useCallback(() => {
      markAllRead();
    }, [markAllRead])
  );

  if (!notifications.length) return <EmptyState icon="bell" message="No notifications yet" />;

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Header title="Notifications" onBack={() => navigation.goBack()} />

      <FlatList
        className="flex-1"
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const { Icon, color, bg, border } = getNotifIcon(item);
          return (
          <Animated.View entering={FadeInUp.duration(400).delay(Math.min(index * 50, 400))}>
            <Card elevation="sm" className="mb-3 p-4 border-0 bg-white flex-row items-start">
              <View
                className="w-12 h-12 rounded-full items-center justify-center mr-4 border shadow-sm"
                style={{ backgroundColor: bg, borderColor: border }}
              >
                <Icon size={20} color={color} />
              </View>
              <View className="flex-1 pt-1">
                <View className="flex-row justify-between items-start mb-1">
                  <Text className="text-base font-bold text-text-primary flex-1 mr-2">{item.title}</Text>
                  <Text className="text-xs font-bold text-primary-600 mt-0.5">{timeAgo(item.createdAt)}</Text>
                </View>
                {item.body ? (
                  <Text className="text-sm font-medium text-text-secondary leading-5">{item.body}</Text>
                ) : null}
              </View>
            </Card>
          </Animated.View>
          );
        }}
      />
    </SafeAreaView>
  );
}
