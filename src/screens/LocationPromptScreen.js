import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  Pressable,
  StatusBar,
  Linking,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Search, Navigation as NavIcon, ChevronLeft } from 'lucide-react-native';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../services/api';
import { typography } from '../theme/typography';

export default function LocationPromptScreen({ navigation }) {
  const { userProfile: user, setNeedsAddressPrompt } = useContext(AuthContext);
  const [locating, setLocating] = useState(false);

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please allow location access to discover items, delivery fees, and quick arrivals in your area.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        setLocating(false);
        return;
      }

      const isProviderEnabled = await Location.hasServicesEnabledAsync();
      if (!isProviderEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please turn on GPS/Location in your phone quick settings.',
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
        setLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;

      let addressName = 'Current Location';
      let street = 'Campus / Area';
      let pincode = '682001';

      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo) {
          street = geo.street || geo.name || geo.district || street;
          pincode = geo.postalCode || pincode;
          addressName = geo.subregion || geo.city || addressName;
        }
      } catch {
        // Fallback
      }

      if (user?.id) {
        try {
          await apiClient.post(`/users/${user.id}/addresses`, {
            label: 'Home',
            houseNo: addressName,
            street,
            pincode,
            lat: latitude,
            lng: longitude,
            isDefault: true,
          });
        } catch {
          // Fallback if already exists
        }
      }

      Toast.show({ type: 'success', text1: 'Location updated' });
      setNeedsAddressPrompt?.(false);
      if (user?.id) {
        if (navigation.canGoBack()) navigation.goBack();
        else navigation.replace('Main');
      } else {
        navigation.navigate('Register');
      }
    } catch (err) {
      console.warn('Location detection failed:', err);
      Toast.show({ type: 'error', text1: 'Could not fetch location', text2: 'Please enter your address manually.' });
    } finally {
      setLocating(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View
        style={{
          flex: 1,
          marginHorizontal: 0,
          marginTop: 0,
          marginBottom: 0,
          backgroundColor: '#ffffff',
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else if (user?.id) navigation.replace('Main');
            else navigation.navigate('Login');
          }}
          hitSlop={12}
          style={{
            position: 'absolute',
            top: 8,
            left: 12,
            zIndex: 1,
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={26} color="#0f172a" strokeWidth={2.5} />
        </Pressable>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 4 }}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <View
              style={{
                width: 112,
                height: 112,
                borderRadius: 56,
                backgroundColor: '#e4f3ea',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 52,
              }}
            >
              <Svg width="86" height="86" viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
                  fill="#07834f"
                />
                <Circle cx="12" cy="9" r="3.2" fill="#ffffff" />
              </Svg>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={{ alignItems: 'center' }}>
            <Text
              style={{
                ...typography.h3,
                fontSize: 22,
                lineHeight: 28,
                color: '#171d19',
                textAlign: 'center',
                marginBottom: 5,
              }}
            >
              Where should we deliver?
            </Text>

            <Text
              style={{
                ...typography.body,
                fontSize: 13,
                lineHeight: 19,
                color: '#56615b',
                textAlign: 'center',
                maxWidth: 320,
              }}
            >
              Allow location access so we can show products, prices and delivery times for your area.
            </Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInUp.duration(400).delay(200)} style={{ paddingHorizontal: 18, paddingBottom: 24 }}>
        {/* Primary: Use my current location */}
        <Pressable
          onPress={handleUseCurrentLocation}
          disabled={locating}
          style={{
            backgroundColor: '#07834f',
            height: 54,
            borderRadius: 13,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
            shadowColor: '#07834f',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          {locating ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <NavIcon size={17} color="#ffffff" strokeWidth={2.2} />
              <Text
                style={{
                  ...typography.buttonSmall,
                  color: '#ffffff',
                  marginLeft: 8,
                }}
              >
                Use my current location
              </Text>
            </>
          )}
        </Pressable>

        {/* Secondary: Enter address manually */}
        <Pressable
          onPress={() => navigation.navigate('AddAddress', { fromPrompt: true })}
          style={{
            backgroundColor: '#ffffff',
            height: 54,
            borderRadius: 13,
            borderWidth: 1.2,
            borderColor: '#e2e8f0',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <Search size={17} color="#171d19" strokeWidth={2.2} />
          <Text
            style={{
              ...typography.buttonSmall,
              color: '#243229',
              marginLeft: 8,
            }}
          >
            Enter address manually
          </Text>
        </Pressable>

        <Text
          style={{
            ...typography.caption,
            fontSize: 10,
            lineHeight: 14,
            color: '#7b847e',
            textAlign: 'center',
          }}
        >
          Your location is only used to deliver your orders.
        </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
