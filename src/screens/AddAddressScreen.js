import { useState, useContext, useEffect } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView, Platform, StatusBar, Pressable, Linking, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Navigation } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../services/api';
import { Input, Button, Card } from '../components/ui';

export default function AddAddressScreen({ navigation }) {
  const { userProfile: user } = useContext(AuthContext);
  
  const [form, setForm] = useState({
    label: '',
    houseNo: '',
    street: '',
    floor: '',
    landmark: '',
    pincode: '',
    lat: null,
    lng: null
  });
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  function setField(key) {
    return (val) => setForm((f) => ({ ...f, [key]: val }));
  }

  function isValid() {
    return (
      (form.label || '').trim().length > 0 &&
      (form.houseNo || '').trim().length > 0 &&
      (form.street || '').trim().length > 0 &&
      (form.pincode || '').trim().length === 6
    );
  }

  async function handleGetCurrentLocation() {
    setLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please enable location permissions in your phone settings to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const isProviderEnabled = await Location.hasServicesEnabledAsync();
      if (!isProviderEnabled) {
        Alert.alert(
          'Location Disabled',
          'Please turn on your GPS/Location services in your phone settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {
              if (Platform.OS === 'android') {
                Location.enableNetworkProviderAsync().catch(() => Linking.openSettings());
              } else {
                Linking.openSettings();
              }
            }}
          ]
        );
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      // Try to reverse geocode
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      setForm(f => ({
        ...f,
        lat: latitude,
        lng: longitude,
        street: address?.street || address?.name || f.street,
        pincode: address?.postalCode || f.pincode,
        landmark: address?.subregion || address?.city || f.landmark,
        label: f.label ? f.label : 'Home',
        houseNo: f.houseNo ? f.houseNo : 'Current Location',
      }));
      
      Toast.show({ type: 'success', text1: 'Location fetched successfully!' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to fetch location' });
    } finally {
      setLocating(false);
    }
  }

  async function save() {
    if (!isValid() || saving) return;
    setSaving(true);
    try {
      if (!user?.id) return;
      const payload = {
        label:       form.label.trim(),
        houseNo:     form.houseNo.trim(),
        street:      form.street.trim(),
        floor:       form.floor.trim(),
        landmark:    form.landmark.trim(),
        pincode:     form.pincode.trim(),
        lat:         form.lat || 0,
        lng:         form.lng || 0,
      };
      await apiClient.post(`/users/${user.id}/addresses`, payload);
      Toast.show({ type: 'success', text1: 'Address saved.' });
      navigation.goBack();
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.error || 'Failed to save address' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Location Action */}
          <Animated.View entering={FadeInDown.duration(350)}>
            <Card elevation="none" className="border border-primary-200 bg-primary-50 p-4 mb-6 flex-row items-center">
              <View className="flex-1">
                <Text className="text-sm font-bold text-text-primary mb-1">Use Current Location</Text>
                <Text className="text-xs font-medium text-text-secondary">
                  Auto-fill your address using GPS.
                </Text>
              </View>
              <Button 
                title="Locate Me" 
                variant="primary"
                size="sm"
                icon={<Navigation size={16} color="#fff" />}
                onPress={handleGetCurrentLocation}
                loading={locating}
                className="ml-2"
                fullWidth={false}
              />
            </Card>
          </Animated.View>

          {/* Form Fields */}
          <Animated.View
            entering={FadeInUp.duration(300)}
            className="bg-white rounded-3xl p-5 shadow-sm border border-border-light"
          >
            <Input
              label="Save As (e.g. Home, Work)*"
              value={form.label}
              onChangeText={setField('label')}
              placeholder="e.g. Home"
            />
            <Input
              label="House / Flat / Block No.*"
              value={form.houseNo}
              onChangeText={setField('houseNo')}
              placeholder="e.g. Flat 402"
            />
            <Input
              label="Street / Building Name*"
              value={form.street}
              onChangeText={setField('street')}
              placeholder="e.g. MG Road, Block 5"
            />
            <Input
              label="Floor (Optional)"
              value={form.floor}
              onChangeText={setField('floor')}
              placeholder="e.g. 4th Floor"
            />
            <Input
              label="Landmark (Optional)"
              value={form.landmark}
              onChangeText={setField('landmark')}
              placeholder="e.g. Near City Park"
            />
            <Input
              label="Pincode*"
              value={form.pincode}
              onChangeText={setField('pincode')}
              placeholder="e.g. 560001"
              keyboardType="numeric"
              maxLength={6}
              containerStyle={{ marginBottom: 0 }}
            />
          </Animated.View>
        </ScrollView>

        <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-border-light">
          <Button
            title="Save Address"
            onPress={save}
            disabled={!isValid() || saving}
            loading={saving}
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
