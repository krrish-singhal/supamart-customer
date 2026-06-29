import { useState, useCallback, useContext } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Plus, Trash2, Star, Navigation } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Header, Card, Button, Skeleton, Dialog } from '../components/ui';

const TYPE_ICON = { Home: '🏠', Work: '💼', Other: '📍' };

function AddressCard({ addr, onSetDefault, onDelete }) {
  const typeKey = addr.label === 'Home' ? 'Home' : addr.label === 'Work' ? 'Work' : 'Other';
  return (
    <Card elevation="sm" className="p-4 mb-3 border-0 bg-white">
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-start flex-1 pr-3">
          <View className="w-10 h-10 rounded-2xl bg-surface-100 items-center justify-center mr-3 mt-0.5">
            <Text style={{ fontSize: 18 }}>{TYPE_ICON[typeKey] || '📍'}</Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Text className="text-sm font-black text-text-primary mr-2">{addr.label}</Text>
              {addr.isDefault && (
                <View className="bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">
                  <Text className="text-xs font-bold text-primary-600">Default</Text>
                </View>
              )}
            </View>
            <Text className="text-sm font-medium text-text-secondary leading-5">
              {[addr.houseNo, addr.companyName, addr.street, addr.floor, addr.apartment, addr.building]
                .filter(Boolean).join(', ')}
            </Text>
            {addr.landmark && (
              <Text className="text-xs font-medium text-text-tertiary mt-0.5">
                Near {addr.landmark}
              </Text>
            )}
            <Text className="text-xs font-medium text-text-tertiary mt-0.5">{addr.pincode}</Text>
          </View>
        </View>
        <View className="items-end gap-3">
          {!addr.isDefault && (
            <Pressable
              onPress={() => onSetDefault(addr.id)}
              className="bg-surface-100 px-3 py-1.5 rounded-xl border border-border-light"
            >
              <Text className="text-xs font-bold text-text-secondary">Set Default</Text>
            </Pressable>
          )}
          <Pressable onPress={() => onDelete(addr.id)} className="p-1.5">
            <Trash2 size={16} color="#ef4444" />
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

export default function MyAddressesScreen({ navigation }) {
  const { userProfile: user } = useContext(AuthContext);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ visible: false, addressId: null });

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/users/${user.id}/addresses`);
      setAddresses(data.items || []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSetDefault = async (addressId) => {
    try {
      await apiClient.patch(`/users/${user.id}/addresses/${addressId}/set-default`);
      await load();
      Toast.show({ type: 'success', text1: 'Default address updated.' });
    } catch { /* interceptor handles */ }
  };

  const handleDelete = (addressId) => {
    setDeleteDialog({ visible: true, addressId });
  };

  const confirmDelete = async () => {
    const { addressId } = deleteDialog;
    setDeleteDialog({ visible: false, addressId: null });
    try {
      await apiClient.delete(`/users/${user.id}/addresses/${addressId}`);
      await load();
      Toast.show({ type: 'success', text1: 'Address deleted.' });
    } catch { /* interceptor handles */ }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50">
        <Header title="My Addresses" onBack={() => navigation.goBack()} />
        <View className="p-4 gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} width="100%" height={110} borderRadius={24} />)}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Header title="My Addresses" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {addresses.length === 0 ? (
          <Animated.View entering={FadeInUp.duration(350)} className="items-center pt-16">
            <View className="w-24 h-24 rounded-full bg-primary-50 items-center justify-center mb-5">
              <MapPin size={40} color="#16a34a" strokeWidth={1.5} />
            </View>
            <Text className="text-xl font-black text-text-primary mb-2">No addresses saved</Text>
            <Text className="text-sm font-medium text-text-secondary text-center mb-8 px-4 leading-6">
              Save your home, work, or any delivery address for faster checkout.
            </Text>
            <Button
              title="Add Address"
              onPress={() => navigation.navigate('AddAddress')}
              size="lg"
            />
          </Animated.View>
        ) : (
          <>
            {addresses.map((addr, i) => (
              <Animated.View key={addr.id} entering={FadeInUp.duration(350).delay(i * 60)}>
                <AddressCard
                  addr={addr}
                  onSetDefault={handleSetDefault}
                  onDelete={handleDelete}
                />
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>

      {addresses.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-border-light">
          <Button
            title="Add New Address"
            onPress={() => navigation.navigate('AddAddress')}
            size="lg"
            icon={<Plus size={18} color="#fff" />}
          />
        </View>
      )}

      <Dialog
        visible={deleteDialog.visible}
        title="Delete Address"
        message="Are you sure you want to remove this address? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ visible: false, addressId: null })}
      />
    </SafeAreaView>
  );
}
