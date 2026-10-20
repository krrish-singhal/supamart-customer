import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StatusBar, SectionList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CheckCircle2,
  Package,
  Truck,
  XCircle,
  Bell,
  ChevronRight,
  ArrowRight,
} from 'lucide-react-native';
import { useNotifications } from '../context/NotificationsContext';
import EmptyState from '../components/EmptyState';

function getNotifConfig(item) {
  const type = item.data?.type;
  const status = item.data?.status;
  const title = (item.title || '').toLowerCase();
  const body = (item.body || '').toLowerCase();

  // Restock alerts carry productId (not orderId) and open that product directly.
  if (type === 'RESTOCK' || (item.data?.productId && title.includes('stock'))) {
    return {
      Icon: Package,
      iconColor: '#07834f',
      iconBg: '#ecfdf5',
      iconBorder: '#a7f3d0',
      actionText: 'View product',
      actionColor: '#07834f',
    };
  }

  // 1. Confirm Delivery (check before delivered so "marked as delivered. Please confirm..." is not hijacked)
  if (
    title.includes('confirm') ||
    body.includes('please confirm') ||
    status === 'PENDING_CONFIRMATION' ||
    status === 'CONFIRM_DELIVERY' ||
    type === 'CONFIRM_DELIVERY'
  ) {
    return {
      Icon: Package,
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
      iconBorder: '#bfdbfe',
      actionText: 'Confirm delivery',
      actionColor: '#2563eb',
    };
  }

  // 2. Out for delivery
  if (
    status === 'OUT_FOR_DELIVERY' ||
    title.includes('out for delivery') ||
    body.includes('on its way')
  ) {
    return {
      Icon: Truck,
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
      iconBorder: '#bfdbfe',
      actionText: 'Track order',
      actionColor: '#2563eb',
    };
  }

  // 3. Delivered
  if (status === 'DELIVERED' || title.includes('delivered') || body.includes('delivered')) {
    return {
      Icon: CheckCircle2,
      iconColor: '#10b981',
      iconBg: '#ecfdf5',
      iconBorder: '#a7f3d0',
      actionText: 'View order',
      actionColor: '#10b981',
    };
  }

  // 4. Cancelled / Disputed / Rejected
  if (
    type === 'PAYMENT_REJECTED' ||
    status === 'CANCELLED' ||
    status === 'DELIVERY_DISPUTED' ||
    title.includes('cancelled') ||
    title.includes('disputed') ||
    title.includes('rejected')
  ) {
    return {
      Icon: XCircle,
      iconColor: '#ef4444',
      iconBg: '#fef2f2',
      iconBorder: '#fecaca',
      actionText: 'View details',
      actionColor: '#ef4444',
    };
  }

  // 5. Default / Other order updates
  return {
    Icon: Bell,
    iconColor: '#2563eb',
    iconBg: '#eff6ff',
    iconBorder: '#bfdbfe',
    actionText: 'View order',
    actionColor: '#2563eb',
  };
}

function formatNotifTime(createdAt) {
  if (!createdAt) return '';
  const date =
    typeof createdAt === 'number'
      ? new Date(createdAt)
      : createdAt.toDate
      ? createdAt.toDate()
      : new Date(createdAt);

  if (isNaN(date.getTime())) return '';
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[date.getMonth()];
  const day = date.getDate();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeStr = `${hours}:${minutes} ${ampm}`;

  if (isToday) {
    const diffMs = now.getTime() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  }

  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }

  return `${day} ${monthName}, ${timeStr}`;
}

function groupNotificationsByDate(notifList) {
  const today = [];
  const lastWeek = [];
  const lastMonth = [];
  const earlier = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (const item of notifList) {
    const d =
      typeof item.createdAt === 'number'
        ? new Date(item.createdAt)
        : item.createdAt?.toDate
        ? item.createdAt.toDate()
        : new Date(item.createdAt || Date.now());

    if (isNaN(d.getTime())) {
      earlier.push(item);
      continue;
    }

    const startOfItemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const daysAgo = Math.floor((startOfToday - startOfItemDay) / oneDayMs);

    if (daysAgo <= 0) {
      // Created today
      today.push(item);
    } else if (daysAgo <= 7) {
      // Created in the past 7 days (yesterday up to 7 days ago)
      lastWeek.push(item);
    } else if (
      daysAgo <= 30 ||
      (d.getMonth() === (now.getMonth() - 1 + 12) % 12 &&
        d.getFullYear() === (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()))
    ) {
      // Created in the past 30 days OR during the previous calendar month
      lastMonth.push(item);
    } else {
      // Older than last month
      earlier.push(item);
    }
  }

  const sections = [];
  if (today.length > 0) sections.push({ title: 'TODAY', data: today });
  if (lastWeek.length > 0) sections.push({ title: 'LAST WEEK', data: lastWeek });
  if (lastMonth.length > 0) sections.push({ title: 'LAST MONTH', data: lastMonth });
  if (earlier.length > 0) sections.push({ title: 'EARLIER', data: earlier });
  return sections;
}

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { notifications = [], unreadCount = 0, markAllRead } = useNotifications();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'orders'

  const totalCount = notifications.length;
  const ordersCount = useMemo(() => {
    return notifications.filter(
      (n) =>
        n.data?.type === 'ORDER_STATUS' ||
        n.data?.orderId ||
        n.data?.status ||
        n.title?.toLowerCase().includes('order') ||
        n.title?.toLowerCase().includes('delivery')
    ).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'unread') {
      return notifications.filter((n) => !n.read);
    }
    if (activeTab === 'orders') {
      return notifications.filter(
        (n) =>
          n.data?.type === 'ORDER_STATUS' ||
          n.data?.orderId ||
          n.data?.status ||
          n.title?.toLowerCase().includes('order') ||
          n.title?.toLowerCase().includes('delivery')
      );
    }
    return notifications;
  }, [notifications, activeTab]);

  const sections = useMemo(() => {
    return groupNotificationsByDate(filteredNotifications);
  }, [filteredNotifications]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 16,
          backgroundColor: '#ffffff',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: '#f8fafc',
              borderWidth: 1,
              borderColor: '#e2e8f0',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <ArrowLeft size={20} color="#0f172a" strokeWidth={2.4} />
          </Pressable>
          <View>
            <Text style={{ fontSize: 21, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 }}>
              Notifications
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#64748b', marginTop: 2 }}>
              Stay updated on your orders
            </Text>
          </View>
        </View>

        {unreadCount > 0 && (
          <Pressable
            onPress={markAllRead}
            style={{
              backgroundColor: '#eff6ff',
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderWidth: 1,
              borderColor: '#dbeafe',
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#2563eb' }}>
              Mark all read
            </Text>
          </Pressable>
        )}
      </View>

      {/* Filter Tabs */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingBottom: 16,
          gap: 10,
          backgroundColor: '#ffffff',
        }}
      >
        {/* All Tab */}
        <Pressable
          onPress={() => setActiveTab('all')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: activeTab === 'all' ? '#eff6ff' : '#ffffff',
            borderWidth: 1,
            borderColor: activeTab === 'all' ? '#bfdbfe' : '#e2e8f0',
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            gap: 6,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: activeTab === 'all' ? '800' : '600',
              color: activeTab === 'all' ? '#2563eb' : '#475569',
            }}
          >
            All
          </Text>
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: '800',
              color: activeTab === 'all' ? '#2563eb' : '#64748b',
            }}
          >
            {totalCount}
          </Text>
        </Pressable>

        {/* Unread Tab */}
        <Pressable
          onPress={() => setActiveTab('unread')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: activeTab === 'unread' ? '#eff6ff' : '#ffffff',
            borderWidth: 1,
            borderColor: activeTab === 'unread' ? '#bfdbfe' : '#e2e8f0',
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            gap: 6,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: activeTab === 'unread' ? '800' : '600',
              color: activeTab === 'unread' ? '#2563eb' : '#475569',
            }}
          >
            Unread
          </Text>
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: '800',
              color: activeTab === 'unread' ? '#2563eb' : '#64748b',
            }}
          >
            {unreadCount}
          </Text>
        </Pressable>

        {/* Orders Tab */}
        <Pressable
          onPress={() => setActiveTab('orders')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: activeTab === 'orders' ? '#eff6ff' : '#ffffff',
            borderWidth: 1,
            borderColor: activeTab === 'orders' ? '#bfdbfe' : '#e2e8f0',
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            gap: 6,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: activeTab === 'orders' ? '800' : '600',
              color: activeTab === 'orders' ? '#2563eb' : '#475569',
            }}
          >
            Orders
          </Text>
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: '800',
              color: activeTab === 'orders' ? '#2563eb' : '#64748b',
            }}
          >
            {ordersCount}
          </Text>
        </Pressable>
      </View>

      {/* Grouped Notifications List */}
      {sections.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <EmptyState
            icon="bell"
            message={
              activeTab === 'unread'
                ? 'No unread notifications'
                : activeTab === 'orders'
                ? 'No order updates yet'
                : 'No notifications yet'
            }
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 16) + 40,
          }}
          renderSectionHeader={({ section: { title, data } }) => (
            <View
              style={{
                backgroundColor: '#f8fafc',
                paddingHorizontal: 20,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: '#e2e8f0',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: '#475569',
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}
              >
                {title}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#94a3b8',
                }}
              >
                {data.length}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const config = getNotifConfig(item);
            const IconComponent = config.Icon;
            const timeText = formatNotifTime(item.createdAt);

            const handlePress = () => {
              if (item.data?.type === 'RESTOCK' && item.data?.productId) {
                navigation.navigate('ProductDetail', { id: String(item.data.productId) });
              } else if (item.data?.productId) {
                navigation.navigate('ProductDetail', { id: String(item.data.productId) });
              } else if (item.data?.orderId) {
                navigation.navigate('OrderTracking', {
                  orderId: item.data.orderId,
                  orderNo: item.data.orderNo,
                });
              }
            };

            return (
              <Pressable
                onPress={handlePress}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  paddingHorizontal: 20,
                  paddingVertical: 18,
                  backgroundColor: item.read ? '#ffffff' : '#f8faff',
                  borderBottomWidth: 1,
                  borderColor: '#f1f5f9',
                }}
              >
                {/* Circular Icon */}
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: config.iconBg,
                    borderWidth: 1.5,
                    borderColor: config.iconBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                    marginTop: 2,
                  }}
                >
                  <IconComponent size={22} color={config.iconColor} strokeWidth={2.4} />
                </View>

                {/* Middle Details */}
                <View style={{ flex: 1 }}>
                  {/* Title & Timestamp Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text
                      style={{
                        fontSize: 15.5,
                        fontWeight: '800',
                        color: '#0f172a',
                        flex: 1,
                        marginRight: 8,
                      }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b' }}>
                        {timeText}
                      </Text>
                      <ChevronRight size={14} color="#94a3b8" />
                    </View>
                  </View>

                  {/* Body description */}
                  {item.body ? (
                    <Text
                      style={{
                        fontSize: 13.5,
                        fontWeight: '500',
                        color: '#475569',
                        marginTop: 5,
                        lineHeight: 20,
                      }}
                    >
                      {item.body}
                    </Text>
                  ) : null}

                  {/* Action Link Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: config.actionColor,
                        marginRight: 4,
                      }}
                    >
                      {config.actionText}
                    </Text>
                    <ArrowRight size={13} color={config.actionColor} strokeWidth={2.6} />
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
