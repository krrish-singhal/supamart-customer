import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, Linking, Platform, ScrollView, Modal } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, Navigation, Phone, Truck, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react-native';
import * as Location from 'expo-location';
import apiClient from '../services/api';
import { AuthContext } from '../context/AuthContext';

// NOTE: Replace with your actual Google Maps API Key
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'PLACEHOLDER_API_KEY';

export default function DeliveryMapScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { order: initialOrder } = route.params;
  const { userProfile } = useContext(AuthContext);
  
  const [order, setOrder] = useState(initialOrder);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [partnerLocation, setPartnerLocation] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    isAlert: false,
    onConfirm: null
  });
  const mapRef = useRef(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await apiClient.get('/config');
        setConfig(res.data);
      } catch (err) {
        console.error('Failed to fetch config:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    let locationSubscription;

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for delivery tracking.');
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // update every 10 meters
          timeInterval: 15000, // or every 15 seconds
        },
        (location) => {
          const newLoc = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setPartnerLocation(newLoc);
          
          // Send to backend
          if (userProfile?.id) {
            apiClient.patch(`/delivery-partners/${userProfile.id}/location`, {
              lat: newLoc.latitude,
              lng: newLoc.longitude,
            }).catch(err => console.log('Silent fail location update:', err));
          }
        }
      );
    };

    startTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [userProfile?.id]);

  const updateOrderStatus = async (newStatus, successMessage) => {
    setUpdating(true);
    try {
      const res = await apiClient.patch(`/orders/${order.id}/status`, { status: newStatus });
      setOrder(res.data.order || { ...order, status: newStatus });
      setConfirmModal({
        visible: true,
        title: 'Success',
        message: successMessage,
        isAlert: true,
        onConfirm: () => {
          if (newStatus === 'DELIVERED') {
            navigation.goBack();
          }
        }
      });
    } catch (err) {
      console.error('Update status error:', err);
      setConfirmModal({
        visible: true,
        title: 'Error',
        message: 'Failed to update order status.',
        isAlert: true,
        onConfirm: null
      });
    } finally {
      setUpdating(false);
    }
  };

  const handlePickUp = () => {
    setConfirmModal({
      visible: true,
      title: 'Confirm Pick Up',
      message: 'Have you collected this order from the store?',
      isAlert: false,
      onConfirm: () => updateOrderStatus('OUT_FOR_DELIVERY', 'Order marked as Out for Delivery!')
    });
  };

  const handleDeliver = () => {
    setConfirmModal({
      visible: true,
      title: 'Confirm Delivery',
      message: 'Have you handed this order to the customer?',
      isAlert: false,
      onConfirm: () => updateOrderStatus('PENDING_CONFIRMATION', 'Waiting for customer confirmation!')
    });
  };

  const callCustomer = () => {
    if (order.userPhone) {
      Linking.openURL(`tel:${order.userPhone}`);
    } else {
      setConfirmModal({
        visible: true,
        title: 'Unavailable',
        message: 'No phone number provided by the customer.',
        isAlert: true,
        onConfirm: null
      });
    }
  };

  const openExternalMaps = () => {
    const lat = order.addressSnapshot?.lat;
    const lng = order.addressSnapshot?.lng;
    if (!lat || !lng) return;

    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const label = 'Customer Delivery';
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to browser
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
      }
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const destination = {
    latitude: order.addressSnapshot?.lat || 0,
    longitude: order.addressSnapshot?.lng || 0,
  };

  const origin = config && config.storeLat ? {
    latitude: config.storeLat,
    longitude: config.storeLng,
  } : destination;

  // Use partner's real location for the polyline origin if available, else store location
  const routeOrigin = partnerLocation || origin;
  
  const hasValidCoordinates = destination.latitude !== 0 && destination.longitude !== 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {hasValidCoordinates ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: destination.latitude,
            longitude: destination.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          <Marker coordinate={origin} title="Store" pinColor="blue" />
          <Marker coordinate={destination} title="Customer" description={order.addressSnapshot?.addressLine1} />
          
          {partnerLocation && (
            <Marker coordinate={partnerLocation} title="You">
              <View className="bg-white p-2 rounded-full shadow-lg border-2 border-green-600">
                <Truck size={20} color="#16a34a" />
              </View>
            </Marker>
          )}

          {GOOGLE_MAPS_API_KEY !== 'PLACEHOLDER_API_KEY' && (
            <MapViewDirections
              origin={routeOrigin}
              destination={destination}
              apikey={GOOGLE_MAPS_API_KEY}
              strokeWidth={4}
              strokeColor="#16a34a"
              onReady={(result) => {
                mapRef.current?.fitToCoordinates(result.coordinates, {
                  edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
                  animated: true,
                });
              }}
            />
          )}
        </MapView>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e2e8f0', paddingBottom: 250 }]}>
          <View className="w-16 h-16 bg-slate-300 rounded-full items-center justify-center mb-4">
            <Navigation size={32} color="#94a3b8" />
          </View>
          <Text className="text-slate-500 font-bold text-lg">Location Unavailable</Text>
          <Text className="text-slate-400 text-sm text-center mt-2 px-8">
            The customer did not provide precise GPS coordinates for this order.
          </Text>
        </View>
      )}

      <View style={{ paddingTop: insets.top, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', position: 'absolute', top: 0, left: 0, right: 0 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm"
        >
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1" />
        {hasValidCoordinates && (
          <TouchableOpacity
            onPress={openExternalMaps}
            className="bg-blue-600 px-4 py-2 rounded-full shadow-sm flex-row items-center"
          >
            <Navigation size={18} color="white" className="mr-2" />
            <Text className="text-white font-bold">Navigate</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ paddingBottom: insets.bottom + 16 }} className="absolute bottom-0 left-0 right-0 p-5 bg-white rounded-t-3xl shadow-lg border-t border-border-light">
        <TouchableOpacity 
          className="items-center pb-2" 
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <View className="w-12 h-1.5 bg-gray-300 rounded-full mb-2" />
        </TouchableOpacity>

        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-1 pr-4">
            <Text className="text-xl font-black text-text-primary mb-1">Order #{order.orderNo}</Text>
            <Text className="text-base font-bold text-text-secondary">{order.userName || 'Customer'}</Text>
            <Text className="text-sm font-medium text-text-secondary mt-1 leading-5">
              {order.addressSnapshot?.houseNo}, {order.addressSnapshot?.street}
              {order.addressSnapshot?.landmark ? ` (${order.addressSnapshot.landmark})` : ''}
            </Text>
            {order.notes ? (
              <Text className="text-sm text-yellow-600 font-medium mt-2 bg-yellow-50 p-2 rounded-lg">
                Note: {order.notes}
              </Text>
            ) : null}
          </View>
          
          <TouchableOpacity 
            onPress={callCustomer}
            className="w-12 h-12 bg-green-100 rounded-full items-center justify-center"
          >
            <Phone size={24} color="#16a34a" />
          </TouchableOpacity>
        </View>

        <View className={`mb-4 ${isExpanded ? 'h-48' : 'max-h-0 overflow-hidden'}`}>
          <Text className="text-xs font-bold text-text-secondary uppercase mb-2">Items to Deliver ({order.items?.length || 0})</Text>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {order.items?.map((item, index) => (
              <View key={index} className="flex-row justify-between items-center bg-gray-50 p-2 rounded-lg mb-1">
                <View className="flex-1">
                  <Text className="text-sm font-bold text-text-primary">{item.name}</Text>
                  <Text className="text-xs text-text-secondary">{item.variantLabel}</Text>
                </View>
                <Text className="text-sm font-black text-text-primary">x{item.qty}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
        
        {order.status !== 'OUT_FOR_DELIVERY' && order.status !== 'DELIVERED' && order.status !== 'PENDING_CONFIRMATION' ? (
          <TouchableOpacity
            onPress={handlePickUp}
            disabled={updating}
            className="flex-row justify-center items-center h-14 bg-blue-600 rounded-xl mt-2"
            style={{ opacity: updating ? 0.5 : 1 }}
          >
            <Truck size={20} color="white" className="mr-2" />
            <Text className="text-white font-bold text-lg">
              {updating ? 'Updating...' : 'Pick Up Order'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={order.status === 'OUT_FOR_DELIVERY' ? handleDeliver : null}
            disabled={updating || order.status === 'DELIVERED' || order.status === 'PENDING_CONFIRMATION'}
            className={`flex-row justify-center items-center h-14 rounded-xl mt-2 ${order.status === 'PENDING_CONFIRMATION' ? 'bg-orange-500' : 'bg-green-600'}`}
            style={{ opacity: updating || order.status === 'DELIVERED' ? 0.5 : 1 }}
          >
            <CheckCircle size={20} color="white" className="mr-2" />
            <Text className="text-white font-bold text-lg">
              {updating ? 'Updating...' : 
               order.status === 'DELIVERED' ? 'Already Delivered' : 
               order.status === 'PENDING_CONFIRMATION' ? 'Waiting for Customer...' :
               'Mark Delivered'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={confirmModal.visible}
        transparent={true}
        animationType="fade"
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm items-center shadow-xl">
            <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4">
              <AlertCircle size={32} color="#2563eb" />
            </View>
            
            <Text className="text-xl font-black text-text-primary text-center mb-2">
              {confirmModal.title}
            </Text>
            
            <Text className="text-base text-text-secondary text-center mb-6">
              {confirmModal.message}
            </Text>

            <View className="flex-row w-full space-x-3">
              {!confirmModal.isAlert && (
                <TouchableOpacity
                  onPress={() => setConfirmModal({ visible: false, title: '', message: '', isAlert: false, onConfirm: null })}
                  className="flex-1 bg-gray-100 py-4 rounded-xl items-center"
                >
                  <Text className="text-text-primary font-bold text-base">Cancel</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                onPress={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  setConfirmModal({ visible: false, title: '', message: '', isAlert: false, onConfirm: null });
                }}
                className={`flex-1 bg-blue-600 py-4 rounded-xl items-center ${confirmModal.isAlert ? 'w-full' : ''}`}
              >
                <Text className="text-white font-bold text-base">{confirmModal.isAlert ? 'OK' : 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
