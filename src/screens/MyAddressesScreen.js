import React, { useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Navigation } from 'lucide-react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { AuthContext } from '../context/AuthContext';

/**
 * Clean stylized Map View matching Image 4
 * Shows neighborhood land plots, roads, and centered delivery pin with speech bubble
 */
function StylizedDeliveryMap({ height, onBack, insets }) {
  const { width } = useWindowDimensions();

  return (
    <View style={{ width: '100%', height, backgroundColor: '#eaede9', position: 'relative', overflow: 'hidden' }}>
      {/* Stylized vector map grid matching Image 4 */}
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Land parcels / neighborhood blocks with soft green tint */}
        <Rect x={16} y={20} width={width * 0.42} height={height * 0.38} rx={14} fill="#dcf5e7" />
        <Rect x={width * 0.52} y={15} width={width * 0.45} height={height * 0.39} rx={14} fill="#dcf5e7" />
        <Rect x={18} y={height * 0.48} width={width * 0.41} height={height * 0.44} rx={14} fill="#dcf5e7" />
        <Rect x={width * 0.52} y={height * 0.48} width={width * 0.45} height={height * 0.44} rx={14} fill="#dcf5e7" />

        {/* Diagonal and vertical white streets crossing */}
        <Path
          d={`M -20 ${height * 0.43} L ${width + 20} ${height * 0.36}`}
          stroke="#ffffff"
          strokeWidth={22}
          strokeLinecap="round"
        />
        <Path
          d={`M ${width * 0.47} -10 L ${width * 0.47} ${height + 20}`}
          stroke="#ffffff"
          strokeWidth={24}
          strokeLinecap="round"
        />
      </Svg>

      {/* Center Delivery Pin & Tooltip matching Image 4 */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 20,
        }}
      >
        {/* Black speech bubble */}
        <View
          style={{
            backgroundColor: '#18181b',
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 7,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 5,
            elevation: 4,
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter-Bold',
              fontSize: 12,
              fontWeight: 'normal',
              color: '#ffffff',
              letterSpacing: -0.2,
            }}
          >
            Your order will be delivered here
          </Text>
        </View>

        {/* Small downward pointing triangle pointer */}
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 6,
            borderRightWidth: 6,
            borderTopWidth: 6,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: '#18181b',
            marginBottom: 2,
          }}
        />

        {/* Green Teardrop Location Pin */}
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 32,
              height: 38,
              backgroundColor: '#047857',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 2,
              transform: [{ rotate: '-45deg' }],
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: '#ffffff',
              }}
            />
          </View>

          {/* Translucent green ground anchor dot */}
          <View
            style={{
              width: 12,
              height: 6,
              borderRadius: 6,
              backgroundColor: 'rgba(4, 120, 87, 0.4)',
              marginTop: 1,
            }}
          />
        </View>
      </View>

      {/* Floating circular Back Button matching Image 4 */}
      <Pressable
        onPress={onBack}
        hitSlop={10}
        style={{
          position: 'absolute',
          top: insets.top + 10,
          left: 18,
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: '#ffffff',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
          elevation: 3,
        }}
      >
        <ChevronLeft size={22} color="#0f172a" strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

export default function MyAddressesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { userProfile: user, setUserProfile, needsAddressSelection, setNeedsAddressSelection } = useContext(AuthContext);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const mapHeight = Math.max(height * 0.38, 240);

  const loadAddresses = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/users/${user.id}/addresses`);
      const items = data.items || [];
      setAddresses(items);

      // Default select the default address or first one
      const defaultAddr = items.find((a) => a.isDefault) || items[0];
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      }
    } catch {
      // Handled by api client
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [loadAddresses])
  );

  // Formats address into: [House no., street, area, city, PIN]
  const formatAddressLine = (addr) => {
    const parts = [
      addr.houseNo,
      addr.building,
      addr.street,
      addr.area,
      addr.city || 'Trivandrum',
      addr.pincode,
    ].filter(Boolean);

    if (parts.length === 0) return '[Address details not specified]';
    return `[${parts.join(', ')}]`;
  };

  // "Use my current location" handler
  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission Denied',
          text2: 'Please allow location permission to detect current address.',
        });
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;
      let street = 'Current Location';
      let area = '';
      let city = 'Trivandrum';
      let pincode = '';

      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo) {
          street = geo.street || geo.name || 'Current Street';
          area = geo.district || geo.subregion || '';
          city = geo.city || 'Trivandrum';
          pincode = geo.postalCode || '';
        }
      } catch {
        // Fallback
      }

      // Check if user already has an address with label 'Current Location'
      const existing = addresses.find((a) => a.label === 'Current Location');
      if (existing) {
        setSelectedAddressId(existing.id);
        Toast.show({
          type: 'success',
          text1: 'Location Detected',
          text2: `Selected ${street}, ${city}`,
        });
      } else if (user?.id) {
        const payload = {
          label: 'Current Location',
          houseNo: '',
          street,
          area,
          city,
          pincode,
          lat: latitude,
          lng: longitude,
          isDefault: true,
        };
        const res = await apiClient.post(`/users/${user.id}/addresses`, payload);
        const newAddr = res.data;
        setAddresses((prev) => [newAddr, ...prev]);
        setSelectedAddressId(newAddr.id);
        Toast.show({
          type: 'success',
          text1: 'Current Location Added',
          text2: `${street}, ${city}`,
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Location Error',
        text2: err.message || 'Could not fetch current coordinates.',
      });
    } finally {
      setLocating(false);
    }
  };

  // "Deliver here" handler
  const handleDeliverHere = async () => {
    if (!selectedAddressId || !user?.id) return;
    setSaving(true);
    try {
      await apiClient.patch(`/users/${user.id}/addresses/${selectedAddressId}/set-default`);
      const chosen = addresses.find((a) => a.id === selectedAddressId);

      // Update auth context profile addresses if available
      if (setUserProfile && user) {
        setUserProfile((prev) => ({
          ...prev,
          addresses: (prev.addresses || []).map((a) => ({
            ...a,
            isDefault: a.id === selectedAddressId,
          })),
        }));
      }

      Toast.show({
        type: 'success',
        text1: 'Delivery Address Confirmed',
        text2: chosen?.label ? `Delivering to ${chosen.label}` : 'Address set successfully',
      });

      if (needsAddressSelection) {
        setNeedsAddressSelection(false);
        navigation.replace('Main');
      } else {
        navigation.goBack();
      }
    } catch (_err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to update address',
        text2: 'Please try again',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* TOP HALF: Interactive Stylized Map matching Image 4 */}
      <StylizedDeliveryMap
        height={mapHeight}
        onBack={() => navigation.goBack()}
        insets={insets}
      />

      {/* BOTTOM HALF: White Rounded Sheet matching Image 4 */}
      <View
        style={{
          flex: 1,
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          marginTop: -24,
          paddingHorizontal: 20,
          paddingTop: 22,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 6,
        }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 70 }}
        >
          {/* Sheet Title matching Image 4 */}
          <Text
            style={{
              fontFamily: 'Inter-ExtraBold',
              fontSize: 20,
              fontWeight: 'normal',
              color: '#0f172a',
              letterSpacing: -0.4,
            }}
          >
            Select delivery address
          </Text>

          {/* "Use my current location" Button matching Image 4 */}
          <Pressable
            onPress={handleUseCurrentLocation}
            disabled={locating}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1.2,
              borderColor: '#cbd5e1',
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 14,
              backgroundColor: pressed ? '#f8fafc' : '#ffffff',
              marginTop: 14,
              marginBottom: 6,
            })}
          >
            {locating ? (
              <ActivityIndicator size="small" color="#047857" style={{ marginRight: 10 }} />
            ) : (
              <Navigation size={18} color="#047857" strokeWidth={2.4} style={{ marginRight: 10 }} />
            )}
            <Text
              style={{
                fontFamily: 'Inter-Bold',
                fontSize: 14,
                fontWeight: 'normal',
                color: '#047857',
              }}
            >
              {locating ? 'Detecting current location...' : 'Use my current location'}
            </Text>
          </Pressable>

          {/* Section Header: SAVED ADDRESSES matching Image 4 */}
          <Text
            style={{
              fontFamily: 'Inter-Bold',
              fontSize: 11.5,
              fontWeight: 'normal',
              color: '#64748b',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginTop: 18,
              marginBottom: 10,
            }}
          >
            SAVED ADDRESSES
          </Text>

          {/* Saved Addresses List (Radio Cards) matching Image 4 */}
          {loading ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#047857" />
            </View>
          ) : addresses.length === 0 ? (
            <View
              style={{
                paddingVertical: 18,
                paddingHorizontal: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderStyle: 'dashed',
                alignItems: 'center',
                marginVertical: 4,
              }}
            >
              <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: '#64748b' }}>
                No saved addresses yet.
              </Text>
            </View>
          ) : (
            addresses.map((addr) => {
              const isSelected = selectedAddressId === addr.id;

              return (
                <Pressable
                  key={addr.id}
                  onPress={() => setSelectedAddressId(addr.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    borderRadius: 16,
                    borderWidth: isSelected ? 1.5 : 1,
                    borderColor: isSelected ? '#047857' : '#e2e8f0',
                    backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                    marginBottom: 10,
                  }}
                >
                  {/* Radio button circle matching Image 4 */}
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: isSelected ? 2.5 : 1.5,
                      borderColor: isSelected ? '#047857' : '#94a3b8',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    {isSelected && (
                      <View
                        style={{
                          width: 11,
                          height: 11,
                          borderRadius: 5.5,
                          backgroundColor: '#047857',
                        }}
                      />
                    )}
                  </View>

                  {/* Title & formatted subtitle */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: 'Inter-Bold',
                        fontSize: 15.5,
                        fontWeight: 'normal',
                        color: '#0f172a',
                        letterSpacing: -0.2,
                      }}
                    >
                      {addr.label || 'Home'}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'Inter-Regular',
                        fontSize: 13,
                        fontWeight: 'normal',
                        color: '#64748b',
                        marginTop: 2,
                        lineHeight: 18,
                      }}
                      numberOfLines={2}
                    >
                      {formatAddressLine(addr)}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}

          {/* "+ Add new address" Action Link matching Image 4 */}
          <Pressable
            onPress={() => navigation.navigate('AddAddress')}
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              marginTop: 4,
            }}
          >
            <Plus size={16} color="#047857" strokeWidth={2.8} style={{ marginRight: 6 }} />
            <Text
              style={{
                fontFamily: 'Inter-Bold',
                fontSize: 14.5,
                fontWeight: 'normal',
                color: '#047857',
              }}
            >
              Add new address
            </Text>
          </Pressable>
        </ScrollView>

        {/* Bottom Full-Width "Deliver here" Button matching Image 4 */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 16),
            borderTopWidth: 1,
            borderColor: '#f1f5f9',
          }}
        >
          <Pressable
            onPress={handleDeliverHere}
            disabled={saving || !selectedAddressId}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#065f46' : '#047857',
              borderRadius: 14,
              height: 52,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#047857',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
              opacity: saving || !selectedAddressId ? 0.7 : 1,
            })}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text
                style={{
                  fontFamily: 'Inter-Bold',
                  fontSize: 16,
                  fontWeight: 'normal',
                  color: '#ffffff',
                  letterSpacing: -0.2,
                }}
              >
                Deliver here
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
