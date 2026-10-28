import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  CheckCircle2,
  Package,
  Truck,
  XCircle,
  Bell,
  Clock,
  Sparkles,
} from '../components/icons';
import { useNotifications } from '../context/NotificationsContext';
import { fonts } from '../theme/typography';

function formatOrderDateTime(createdAt) {
  if (!createdAt) return '';
  const d =
    typeof createdAt === 'number'
      ? new Date(createdAt)
      : createdAt.toDate
      ? createdAt.toDate()
      : new Date(createdAt);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}, ${timeStr}`;
}

function getNotifConfig(item) {
  const type = item.data?.type;
  const status = item.data?.status;
  const title = (item.title || '').toLowerCase();
  const body = (item.body || '').toLowerCase();

  // 1. Payment Approved
  if (
    type === 'PAYMENT_APPROVED' ||
    title.includes('payment approved') ||
    title.includes('payment confirmed') ||
    body.includes('payment approved')
  ) {
    return {
      Icon: CheckCircle2,
      iconColor: '#059669',
      iconBg: '#ecfdf5',
      iconBorder: '#a7f3d0',
      badgeText: 'CONFIRMED',
      badgeBg: '#ecfdf5',
      badgeColor: '#059669',
      actionText: 'Track order',
    };
  }

  // 2. Payment Rejected
  if (
    type === 'PAYMENT_REJECTED' ||
    title.includes('payment rejected') ||
    body.includes('payment was rejected') ||
    title.includes('order rejected')
  ) {
    return {
      Icon: XCircle,
      iconColor: '#dc2626',
      iconBg: '#fef2f2',
      iconBorder: '#fecaca',
      badgeText: 'REJECTED',
      badgeBg: '#fef2f2',
      badgeColor: '#ef4444',
      actionText: 'Retry payment',
    };
  }

  // 3. Delivery Delay
  if (
    type === 'DELIVERY_DELAY' ||
    title.includes('delay') ||
    body.includes('delay') ||
    Boolean(item.data?.delayReason)
  ) {
    return {
      Icon: Clock,
      iconColor: '#d97706',
      iconBg: '#fffbeb',
      iconBorder: '#fde68a',
      badgeText: 'DELAYED',
      badgeBg: '#fffbeb',
      badgeColor: '#b45309',
      actionText: 'Track order',
    };
  }

  // 4. Free Delivery Unlocked
  if (
    type === 'FREE_DELIVERY' ||
    title.includes('free delivery') ||
    body.includes('free delivery')
  ) {
    return {
      Icon: Sparkles,
      iconColor: '#0A7C47',
      iconBg: '#e6f4ea',
      iconBorder: '#a7f3d0',
      badgeText: 'OFFER',
      badgeBg: '#ecfdf5',
      badgeColor: '#059669',
      actionText: 'Shop now',
    };
  }

  // 5. Low Stock Alert
  if (
    type === 'LOW_STOCK' ||
    title.includes('low stock') ||
    title.includes('running low') ||
    (body.includes('only') && body.includes('left in stock'))
  ) {
    return {
      Icon: Package,
      iconColor: '#d97706',
      iconBg: '#fffbeb',
      iconBorder: '#fde68a',
      badgeText: 'LOW STOCK',
      badgeBg: '#fffbeb',
      badgeColor: '#b45309',
      actionText: 'Buy now',
    };
  }

  // 6. Admin / Support Reply
  if (
    type === 'ISSUE_REPLY' ||
    type === 'SUPPORT_REPLY' ||
    title.includes('reply from') ||
    title.includes('ms traders')
  ) {
    return {
      Icon: Bell,
      iconColor: '#0A7C47',
      iconBg: '#e6f4ea',
      iconBorder: '#a7f3d0',
      badgeText: 'SUPPORT',
      badgeBg: '#ecfdf5',
      badgeColor: '#059669',
      actionText: item.data?.orderId ? 'View order' : 'View details',
    };
  }

  // 7. Restock alert
  if (type === 'RESTOCK' || (item.data?.productId && title.includes('stock'))) {
    return {
      Icon: Package,
      iconColor: '#0891b2',
      iconBg: '#ecfeff',
      iconBorder: '#a5f3fc',
      badgeText: 'IN STOCK',
      badgeBg: '#ecfeff',
      badgeColor: '#0891b2',
      actionText: 'View item',
    };
  }

  // 6. Confirm Delivery
  if (
    title.includes('confirm') ||
    body.includes('please confirm') ||
    status === 'PENDING_CONFIRMATION' ||
    status === 'CONFIRM_DELIVERY' ||
    type === 'CONFIRM_DELIVERY'
  ) {
    return {
      Icon: Package,
      iconColor: '#0A7C47',
      iconBg: '#e6f4ea',
      iconBorder: '#a7f3d0',
      badgeText: 'CONFIRM',
      badgeBg: '#ecfdf5',
      badgeColor: '#059669',
      actionText: 'Confirm delivery',
    };
  }

  // 7. Out for delivery
  if (
    status === 'OUT_FOR_DELIVERY' ||
    title.includes('out for delivery') ||
    body.includes('on its way')
  ) {
    return {
      Icon: Truck,
      iconColor: '#0284c7',
      iconBg: '#f0f9ff',
      iconBorder: '#bae6fd',
      badgeText: 'ON THE WAY',
      badgeBg: '#fef3c7',
      badgeColor: '#b45309',
      actionText: 'Track live',
    };
  }

  // 8. Delivered
  if (status === 'DELIVERED' || title.includes('delivered') || body.includes('delivered')) {
    return {
      Icon: CheckCircle2,
      iconColor: '#059669',
      iconBg: '#ecfdf5',
      iconBorder: '#a7f3d0',
      badgeText: 'DELIVERED',
      badgeBg: '#ecfdf5',
      badgeColor: '#059669',
      actionText: 'View order',
    };
  }

  // 9. Cancelled / Disputed
  if (
    status === 'CANCELLED' ||
    status === 'DELIVERY_DISPUTED' ||
    title.includes('cancelled') ||
    title.includes('disputed')
  ) {
    return {
      Icon: XCircle,
      iconColor: '#ef4444',
      iconBg: '#fef2f2',
      iconBorder: '#fecaca',
      badgeText: status === 'DELIVERY_DISPUTED' ? 'DISPUTED' : 'CANCELLED',
      badgeBg: '#fef2f2',
      badgeColor: '#ef4444',
      actionText: 'View details',
    };
  }

  // 10. Default / Order Update
  return {
    Icon: Bell,
    iconColor: '#0A7C47',
    iconBg: '#f0fdf4',
    iconBorder: '#bbf7d0',
    badgeText: 'UPDATE',
    badgeBg: '#f1f5f9',
    badgeColor: '#475569',
    actionText: 'View details',
  };
}

function renderStatusBadge(config) {
  return (
    <View
      style={{
        backgroundColor: config.badgeBg,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4.5,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontFamily: fonts.bold,
          color: config.badgeColor,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        {config.badgeText}
      </Text>
    </View>
  );
}

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { notifications = [], unreadCount = 0, markAllRead, markAsRead, refreshNotifications } = useNotifications();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'orders'
  const [refreshing, setRefreshing] = useState(false);

  const totalCount = notifications.length;
  const ordersCount = useMemo(() => {
    return notifications.filter(
      (n) =>
        n.data?.type === 'ORDER_STATUS' ||
        n.data?.type === 'DELIVERY_DELAY' ||
        n.data?.type === 'PAYMENT_APPROVED' ||
        n.data?.type === 'PAYMENT_REJECTED' ||
        n.data?.orderId ||
        n.data?.status ||
        n.title?.toLowerCase().includes('order') ||
        n.title?.toLowerCase().includes('delivery') ||
        n.title?.toLowerCase().includes('payment')
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
          n.data?.type === 'DELIVERY_DELAY' ||
          n.data?.type === 'PAYMENT_APPROVED' ||
          n.data?.type === 'PAYMENT_REJECTED' ||
          n.data?.orderId ||
          n.data?.status ||
          n.title?.toLowerCase().includes('order') ||
          n.title?.toLowerCase().includes('delivery') ||
          n.title?.toLowerCase().includes('payment')
      );
    }
    return notifications;
  }, [notifications, activeTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (typeof refreshNotifications === 'function') {
        await refreshNotifications();
      }
    } catch {
      // Handled
    } finally {
      setRefreshing(false);
    }
  }, [refreshNotifications]);

  const handleItemPress = (item) => {
    if (!item.read && typeof markAsRead === 'function') {
      markAsRead(item.id);
    }
    if ((item.data?.type === 'RESTOCK' || item.data?.type === 'LOW_STOCK') && item.data?.productId) {
      navigation.navigate('ProductDetail', { id: String(item.data.productId) });
    } else if (item.data?.productId) {
      navigation.navigate('ProductDetail', { id: String(item.data.productId) });
    } else if (item.data?.type === 'FREE_DELIVERY') {
      navigation.navigate('Main', { screen: 'Cart' });
    } else if (item.data?.type === 'REFUND' || item.data?.refundId) {
      navigation.navigate('RefundStatus', {
        orderId: item.data?.orderId,
        refundId: item.data?.refundId,
      });
    } else if (item.data?.type === 'PAYMENT_REJECTED' && item.data?.orderId) {
      navigation.navigate('OrderDetail', { orderId: item.data.orderId });
    } else if (item.data?.type === 'ISSUE_REPLY') {
      if (item.data?.orderId) {
        navigation.navigate('OrderDetail', { orderId: item.data.orderId, orderNo: item.data?.orderNo });
      } else {
        navigation.navigate('Orders');
      }
    } else if (item.data?.orderId) {
      navigation.navigate('OrderTracking', {
        orderId: item.data.orderId,
        orderNo: item.data.orderNo,
      });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Screen Header matching OrdersScreen */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 14,
          backgroundColor: '#ffffff',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 6,
            }}
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
          </Pressable>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.4 }}>
              Notifications
            </Text>
            <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748b', marginTop: 1 }}>
              {unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'All caught up'}
            </Text>
          </View>
        </View>

        {unreadCount > 0 && (
          <Pressable
            onPress={markAllRead}
            hitSlop={8}
            style={{
              backgroundColor: '#ecfdf5',
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: '#a7f3d0',
            }}
            accessibilityLabel="Mark all as read"
          >
            <Text
              style={{
                fontFamily: fonts.bold,
                fontWeight: 'normal',
                fontSize: 11.5,
                color: '#047857',
              }}
            >
              Mark all read
            </Text>
          </Pressable>
        )}
      </View>

      {/* Segmented Filter Tabs matching OrdersScreen */}
      <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 16, paddingBottom: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#f1f5f9',
            borderRadius: 16,
            padding: 4,
          }}
        >
          {[
            { key: 'all', label: 'All', count: totalCount },
            { key: 'unread', label: 'Unread', count: unreadCount },
            { key: 'orders', label: 'Orders', count: ordersCount },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  borderRadius: 12,
                  shadowColor: isActive ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isActive ? 0.08 : 0,
                  shadowRadius: 3,
                  elevation: isActive ? 2 : 0,
                }}
              >
                <Text
                  style={{
                    fontSize: 13.5,
                    fontWeight: isActive ? '800' : '600',
                    color: isActive ? '#0f172a' : '#64748b',
                  }}
                >
                  {tab.label} ({tab.count})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Notifications FlatList matching OrdersScreen card layout */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 16,
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0A7C47']}
            tintColor="#0A7C47"
          />
        }
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 }}>
            <Package size={48} color="#cbd5e1" strokeWidth={1.5} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#64748b', marginTop: 12 }}>
              {activeTab === 'unread'
                ? 'No unread notifications'
                : activeTab === 'orders'
                ? 'No order updates yet'
                : 'No notifications yet'}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#94a3b8', marginTop: 4, textAlign: 'center' }}>
              {activeTab === 'unread'
                ? "You're all caught up with your latest updates."
                : activeTab === 'orders'
                ? 'Order status and delivery updates will appear here.'
                : 'We will notify you about your order status, offers, and delivery updates.'}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const config = getNotifConfig(item);
          const IconComponent = config.Icon;
          const timeText = formatOrderDateTime(item.createdAt);
          const isUnread = !item.read;
          const hasOrder = Boolean(item.data?.orderId);

          return (
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 22,
                padding: 18,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: isUnread ? '#bbf7d0' : '#f1f5f9',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 1,
              }}
            >
              {/* Top Row: Icon + Title & Time (Left) and Status Badge (Right) */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1, paddingRight: 10 }}>
                  {/* Icon Box */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: config.iconBg,
                      borderWidth: 1,
                      borderColor: config.iconBorder,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <IconComponent size={22} color={config.iconColor} strokeWidth={2.4} />
                  </View>

                  {/* Title & Timestamp */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '800',
                          color: '#0f172a',
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {isUnread && (
                        <View
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 4,
                            backgroundColor: '#0A7C47',
                          }}
                        />
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '500',
                        color: '#64748b',
                        marginTop: 2,
                      }}
                    >
                      {timeText}
                    </Text>
                  </View>
                </View>

                {/* Status Badge matching OrdersScreen */}
                {renderStatusBadge(config)}
              </View>

              {/* Middle: Notification Message Body */}
              {Boolean(item.body) && (
                <Text
                  style={{
                    fontSize: 13.5,
                    fontWeight: '400',
                    color: '#475569',
                    lineHeight: 20,
                    marginTop: 14,
                  }}
                >
                  {item.body}
                </Text>
              )}

              {/* Bottom Action Buttons matching OrdersScreen */}
              {hasOrder ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    marginTop: 16,
                  }}
                >
                  <Pressable
                    onPress={() => handleItemPress(item)}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: '#0A7C47',
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bold,
                        fontSize: 14,
                        color: '#ffffff',
                      }}
                    >
                      {config.actionText}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (!item.read && typeof markAsRead === 'function') {
                        markAsRead(item.id);
                      }
                      if (item.data?.type === 'REFUND' || item.data?.refundId) {
                        navigation.navigate('RefundStatus', {
                          orderId: item.data?.orderId,
                          refundId: item.data?.refundId,
                        });
                      } else if (item.data?.orderId) {
                        navigation.navigate('OrderDetail', {
                          orderId: item.data.orderId,
                          orderNo: item.data.orderNo,
                        });
                      } else {
                        navigation.navigate('Orders');
                      }
                    }}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        height: 44,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        backgroundColor: '#ffffff',
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bold,
                        fontSize: 14,
                        color: '#0f172a',
                      }}
                    >
                      View details
                    </Text>
                  </Pressable>
                </View>
              ) : config.actionText ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    marginTop: 16,
                  }}
                >
                  <Pressable
                    onPress={() => handleItemPress(item)}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: '#0A7C47',
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bold,
                        fontSize: 14,
                        color: '#ffffff',
                      }}
                    >
                      {config.actionText}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
