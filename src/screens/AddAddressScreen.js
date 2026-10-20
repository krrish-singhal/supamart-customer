import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Pressable,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  MapPin,
  Home,
  Briefcase,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../services/api';
import { fonts } from '../theme/typography';

const SAVE_AS_OPTIONS = [
  { id: 'Home', label: 'Home', Icon: Home },
  { id: 'Work', label: 'Work', Icon: Briefcase },
  { id: 'Other', label: 'Other', Icon: MapPin },
];

export default function AddAddressScreen({ route, navigation }) {
  const { userProfile: user, setNeedsAddressPrompt, setNeedsAddressSelection } = useContext(AuthContext);
  const editingAddress = route.params?.address || null;
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    houseNo: editingAddress?.houseNo || '',
    street: editingAddress?.street || '',
    area: editingAddress?.area || '',
    landmark: editingAddress?.landmark || '',
    city: editingAddress?.city || 'Trivandrum',
    pincode: editingAddress?.pincode || '',
    label: editingAddress?.label || 'Home',
    receiverName: editingAddress?.receiverName || user?.name || '',
    receiverPhone: editingAddress?.receiverPhone || user?.phone || '',
    lat: editingAddress?.lat || null,
    lng: editingAddress?.lng || null,
  });

  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState(
    editingAddress ? `${editingAddress.street || 'Selected'}, ${editingAddress.city || 'Kerala'}` : '[Area, city]'
  );

  function setField(key) {
    return (val) => setForm((f) => ({ ...f, [key]: val }));
  }

  function isValid() {
    return (
      (form.houseNo || '').trim().length > 0 &&
      (form.street || '').trim().length > 0 &&
      (form.pincode || '').trim().length === 6 &&
      (form.label || '').trim().length > 0
    );
  }

  async function handleGetCurrentLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please enable location permissions in your phone settings to set your pin automatically.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const isProviderEnabled = await Location.hasServicesEnabledAsync();
      if (!isProviderEnabled) {
        Alert.alert(
          'Location Disabled',
          'Please turn on your GPS/Location services in phone settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Settings',
              onPress: () => {
                if (Platform.OS === 'android') {
                  Location.enableNetworkProviderAsync().catch(() => Linking.openSettings());
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;

      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });

      const detectedArea = geo?.subregion || geo?.district || geo?.neighborhood || geo?.name || '';
      const detectedCity = geo?.city || 'Trivandrum';
      const detectedPin = geo?.postalCode || form.pincode;
      const detectedStreet = geo?.street || geo?.name || form.street;

      setForm((f) => ({
        ...f,
        lat: latitude,
        lng: longitude,
        area: detectedArea || f.area,
        city: detectedCity || f.city,
        street: detectedStreet || f.street,
        pincode: detectedPin || f.pincode,
      }));

      setLocationLabel(`${detectedArea ? detectedArea + ', ' : ''}${detectedCity}`);
      Toast.show({ type: 'success', text1: 'Location updated' });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not fetch current location' });
    } finally {
      setLocating(false);
    }
  }

  // Auto-detect location if adding a new address without coordinates
  useEffect(() => {
    if (!editingAddress && !form.lat) {
      handleGetCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    if (!form.street?.trim() && !form.area?.trim()) {
      Toast.show({ type: 'warning', text1: 'Please enter building/street or area' });
      return;
    }
    if (!form.pincode?.trim() || form.pincode.trim().length < 4) {
      Toast.show({ type: 'warning', text1: 'Please enter a valid 6-digit PIN code' });
      return;
    }

    setSaving(true);
    try {
      if (!user?.id) {
        Toast.show({ type: 'error', text1: 'Please log in to save addresses' });
        return;
      }

      const fullStreet = [form.street, form.area].filter(Boolean).join(', ');
      const payload = {
        label: (form.label || 'Home').trim(),
        houseNo: (form.houseNo || 'House / Flat').trim(),
        street: fullStreet || form.street.trim() || 'Main Street',
        landmark: (form.landmark || '').trim(),
        pincode: form.pincode.trim(),
        city: (form.city || 'Meerut').trim(),
        lat: form.lat || 8.5241,
        lng: form.lng || 76.9366,
        receiverName: (form.receiverName || user?.name || '').trim(),
        receiverPhone: (form.receiverPhone || user?.mobile || '').trim(),
      };

      if (editingAddress?.id) {
        await apiClient.put(`/users/${user.id}/addresses/${editingAddress.id}`, payload);
        Toast.show({ type: 'success', text1: 'Address updated successfully' });
      } else {
        const { data: saved } = await apiClient.post(`/users/${user.id}/addresses`, {
          ...payload,
          isDefault: Boolean(route.params?.fromPrompt),
        });
        if (route.params?.fromPrompt && saved?.id) {
          await apiClient.patch(`/users/${user.id}/addresses/${saved.id}/set-default`);
        }
        Toast.show({ type: 'success', text1: 'Address saved successfully' });
      }

      if (route.params?.fromPrompt) {
        setNeedsAddressPrompt?.(false);
        setNeedsAddressSelection?.(false);
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      } else {
        navigation.goBack();
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.error || 'Could not save the address',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* TOP HEADER: < Add delivery address matching Image 1 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderColor: '#f1f5f9',
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
          }}
        >
          <ChevronLeft size={24} color="#0f172a" strokeWidth={2.5} />
        </Pressable>
        <Text style={{ fontSize: 18.5, fontWeight: '900', color: '#0f172a' }}>
          {editingAddress ? 'Edit delivery address' : 'Add delivery address'}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* PIN LOCATION BANNER matching Image 1 */}
          <Animated.View entering={FadeInDown.duration(280)}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#ecfdf5',
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: '#d1fae5',
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#d1fae5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <MapPin size={19} color="#047857" strokeWidth={2.4} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
                  Pin location set
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginTop: 1 }}
                >
                  {locationLabel}
                </Text>
              </View>

              <Pressable
                onPress={handleGetCurrentLocation}
                disabled={locating}
                hitSlop={10}
                style={{ paddingVertical: 4, paddingHorizontal: 6 }}
              >
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#047857' }}>
                  {locating ? 'Locating...' : 'Change'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* FORM FIELDS matching Image 1 */}
          <View style={{ gap: 16 }}>
            {/* House / flat no. */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 6 }}>
                House / flat no.
              </Text>
              <TextInput
                value={form.houseNo}
                onChangeText={setField('houseNo')}
                placeholder="e.g. TC 20/18"
                placeholderTextColor="#94a3b8"
                style={{
                  height: 48,
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  fontSize: 14.5,
                  color: '#0f172a',
                  fontWeight: '500',
                }}
              />
            </View>

            {/* Building, street */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 6 }}>
                Building, street
              </Text>
              <TextInput
                value={form.street}
                onChangeText={setField('street')}
                placeholder="Building name, street"
                placeholderTextColor="#94a3b8"
                style={{
                  height: 48,
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  fontSize: 14.5,
                  color: '#0f172a',
                  fontWeight: '500',
                }}
              />
            </View>

            {/* Area / locality */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 6 }}>
                Area / locality
              </Text>
              <TextInput
                value={form.area}
                onChangeText={setField('area')}
                placeholder="Area"
                placeholderTextColor="#94a3b8"
                style={{
                  height: 48,
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  fontSize: 14.5,
                  color: '#0f172a',
                  fontWeight: '500',
                }}
              />
            </View>

            {/* Landmark (optional) */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 6 }}>
                Landmark (optional)
              </Text>
              <TextInput
                value={form.landmark}
                onChangeText={setField('landmark')}
                placeholder="Near..."
                placeholderTextColor="#94a3b8"
                style={{
                  height: 48,
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  fontSize: 14.5,
                  color: '#0f172a',
                  fontWeight: '500',
                }}
              />
            </View>

            {/* City & PIN code (2 columns) */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 6 }}>
                  City
                </Text>
                <TextInput
                  value={form.city}
                  onChangeText={setField('city')}
                  placeholder="City"
                  placeholderTextColor="#94a3b8"
                  style={{
                    height: 48,
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    fontSize: 14.5,
                    color: '#0f172a',
                    fontWeight: '500',
                  }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 6 }}>
                  PIN code
                </Text>
                <TextInput
                  value={form.pincode}
                  onChangeText={setField('pincode')}
                  placeholder="6 digits"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  maxLength={6}
                  style={{
                    height: 48,
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    fontSize: 14.5,
                    color: '#0f172a',
                    fontWeight: '500',
                  }}
                />
              </View>
            </View>

            {/* Save as matching Image 1: [Home] [Work] [Other] */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>
                Save as
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {SAVE_AS_OPTIONS.map((opt) => {
                  const isSelected = form.label === opt.id;
                  const IconComp = opt.Icon;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => setField('label')(opt.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 16,
                        height: 42,
                        borderRadius: 12,
                        backgroundColor: isSelected ? '#047857' : '#ffffff',
                        borderWidth: 1,
                        borderColor: isSelected ? '#047857' : '#e2e8f0',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: isSelected ? 0.15 : 0.03,
                        shadowRadius: 2,
                        elevation: isSelected ? 2 : 1,
                      }}
                    >
                      <IconComp
                        size={15}
                        color={isSelected ? '#ffffff' : '#0f172a'}
                        strokeWidth={2.4}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={{
                          fontSize: 13.5,
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? '#ffffff' : '#0f172a',
                        }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Receiver's name */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 6 }}>
                {"Receiver's name"}
              </Text>
              <TextInput
                value={form.receiverName}
                onChangeText={setField('receiverName')}
                placeholder="Name"
                placeholderTextColor="#94a3b8"
                style={{
                  height: 48,
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  fontSize: 14.5,
                  color: '#0f172a',
                  fontWeight: '500',
                }}
              />
            </View>
          </View>
        </ScrollView>

        {/* STICKY BOTTOM BUTTON matching Image 1 & 3 */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
            borderTopWidth: 1,
            borderColor: '#f1f5f9',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          {(() => {
            const valid = isValid();
            return (
              <Pressable
                onPress={handleSave}
                disabled={saving || !valid}
                style={{
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: valid ? '#047857' : '#d6dfd8',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: valid ? '#047857' : 'transparent',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: valid ? 0.25 : 0,
                  shadowRadius: 8,
                  elevation: valid ? 3 : 0,
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 15.5,
                      fontWeight: '800',
                      color: valid ? '#ffffff' : '#52745d',
                    }}
                  >
                    Save address
                  </Text>
                )}
              </Pressable>
            );
          })()}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
