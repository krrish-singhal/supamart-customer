import { validCoordinates, evaluateServiceArea } from '../config/deliveryArea';
import React, { useState, useContext, useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../services/api';
import DeliveryAddressForm from '../components/DeliveryAddressForm';
import { validateAddressForm } from '../utils/addressForm';

export default function AddAddressScreen({ route, navigation }) {
  const { userProfile: user, setUserProfile, setNeedsAddressPrompt, setNeedsAddressSelection } = useContext(AuthContext);
  const editingAddress = route.params?.address || null;
  const pickedLocation = route.params?.pickedLocation;

  const [form, setForm] = useState({
    houseNo: editingAddress?.houseNo || '',
    street: editingAddress?.street || '',
    area: editingAddress?.area || '',
    landmark: editingAddress?.landmark || '',
    city: editingAddress?.city || '',
    pincode: editingAddress?.pincode || '',
    label: editingAddress?.label || 'Home',
    receiverName: editingAddress?.receiverName || user?.name || '',
    receiverPhone: editingAddress?.receiverPhone || user?.phone || '',
    lat: pickedLocation?.lat ?? editingAddress?.lat ?? null,
    lng: pickedLocation?.lng ?? editingAddress?.lng ?? null,
  });

  const [saving, setSaving] = useState(false);
  const locating = false;
  const [locationLabel, setLocationLabel] = useState(
    editingAddress ? [editingAddress.street, editingAddress.city].filter(Boolean).join(', ') : ''
  );

  function setField(key) {
    return (val) => setForm((f) => ({ ...f, [key]: val }));
  }

  function handleChooseLocation() {
    navigation.navigate('DeliveryLocation', { mode: 'form', initialLocation: form, autoLocate: !validCoordinates(form.lat, form.lng) });
  }

  useEffect(() => {
    if (!pickedLocation) return;
    setForm(current => ({ ...current, lat: pickedLocation.lat, lng: pickedLocation.lng, street: pickedLocation.street || '', area: pickedLocation.area || '', city: pickedLocation.city || '', pincode: pickedLocation.pincode || '' }));
    setLocationLabel([pickedLocation.locationName, pickedLocation.locality].filter(Boolean).join(', '));
  }, [pickedLocation]);

  // New addresses choose their exact map pin before the remaining address details.
  useEffect(() => {
    if (!editingAddress && !validCoordinates(form.lat, form.lng)) {
      handleChooseLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    if (saving || locating) return;
    const errors = validateAddressForm(form);
    if (Object.keys(errors).length > 0) {
      Toast.show({ type: 'warning', text1: Object.values(errors)[0] });
      return;
    }
    if (!evaluateServiceArea(form.lat, form.lng).withinRadius) {
      Toast.show({ type: 'info', text1: 'Choose a pin within 5 km of MS Traders' });
      return;
    }
    setSaving(true);
    try {
      if (!user?.id) {
        Toast.show({ type: 'error', text1: 'Please log in to save addresses' });
        return;
      }

      const payload = {
        label: (form.label || 'Home').trim(),
        houseNo: (form.houseNo || 'House / Flat').trim(),
        street: form.street.trim(),
        area: (form.area || '').trim(),
        landmark: (form.landmark || '').trim(),
        pincode: form.pincode.trim(),
        city: (form.city || '').trim(),
        lat: form.lat,
        lng: form.lng,
        receiverName: (form.receiverName || user?.name || '').trim(),
        receiverPhone: (form.receiverPhone || user?.mobile || '').trim(),
      };

      let savedId = editingAddress?.id;
      if (savedId) {
        await apiClient.put(`/users/${user.id}/addresses/${savedId}`, payload);
      } else {
        const { data: saved } = await apiClient.post(`/users/${user.id}/addresses`, { ...payload, isDefault: Boolean(route.params?.makeDefault || route.params?.fromPrompt) });
        savedId = saved.id;
      }
      if (route.params?.makeDefault || route.params?.fromPrompt) {
        await apiClient.patch(`/users/${user.id}/addresses/${savedId}/set-default`);
        setUserProfile(current => ({ ...current, defaultAddressId: savedId }));
      }
      Toast.show({ type: 'success', text1: 'Delivery address saved' });

      if (route.params?.fromPrompt) {
        setNeedsAddressPrompt?.(false);
        setNeedsAddressSelection?.(false);
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      } else if (route.params?.fromMap) {
        navigation.pop(2);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <DeliveryAddressForm
        form={form}
        onFieldChange={(key, value) => setField(key)(value)}
        editing={Boolean(editingAddress)}
        locationLabel={locationLabel}
        locating={locating}
        saving={saving}
        onLocate={handleChooseLocation}
        onSave={handleSave}
        onBack={() => navigation.goBack()}
      />
    </SafeAreaView>
  );
}
