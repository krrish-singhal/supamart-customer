import React, { useEffect, useState, useCallback, useContext } from 'react';
import { View, Text, FlatList, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import EmptyState from '../components/EmptyState';
import { Header, Card, Skeleton } from '../components/ui';

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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userProfile: user } = useContext(AuthContext);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const uid = user?.id; // Uses backend ID which aligns with firestore docs if mirrored
      if (!uid) { setLoading(false); return; }
      const q = query(
        collection(db, 'users', uid, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50">
        <Header title="Notifications" onBack={() => navigation.goBack()} />
        <View className="p-4">
          <Skeleton width="100%" height={90} borderRadius={16} className="mb-3" />
          <Skeleton width="100%" height={90} borderRadius={16} className="mb-3" />
          <Skeleton width="100%" height={90} borderRadius={16} className="mb-3" />
        </View>
      </SafeAreaView>
    );
  }

  if (!items.length) return <EmptyState icon="bell" message="No notifications yet" />;

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Header title="Notifications" onBack={() => navigation.goBack()} />
      
      <FlatList
        className="flex-1"
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.duration(400).delay(Math.min(index * 50, 400))}>
            <Card elevation="sm" className="mb-3 p-4 border-0 bg-white flex-row items-start">
              <View className="w-12 h-12 rounded-full bg-primary-50 items-center justify-center mr-4 border border-primary-100 shadow-sm">
                <Bell size={20} color="#16a34a" />
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
        )}
      />
    </SafeAreaView>
  );
}
