import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StatusBar, ActivityIndicator, Modal, ScrollView, Keyboard, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Search, LocateFixed, X, MapPin, Pencil, Plus } from '../components/icons';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import KeylessMap from '../components/maps/KeylessMap';
import DeliveryLocationSheet from '../components/maps/DeliveryLocationSheet';
import { STORE_LOCATION, validCoordinates, haversineKm } from '../config/deliveryArea';
import { AuthContext } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useCart } from '../context/CartContext';
import { computeBill } from '../utils/pricing';
import { locationFromGeocode } from '../utils/pickedLocation';
import { searchLocations, MIN_SEARCH_LENGTH } from '../services/locationSearch';
import { formatDeliveryAddress } from '../utils/addressForm';
import apiClient from '../services/api';
import { fonts } from '../theme/typography';
const STORE = { latitude: STORE_LOCATION.lat, longitude: STORE_LOCATION.lng };
export default function DeliveryLocationScreen({ navigation, route }) {
  const params = route.params || {};
  const forForm = params.mode === 'form';
  const initial = params.initialLocation;
  const initialPoint = validCoordinates(initial?.lat, initial?.lng) ? { latitude: initial.lat, longitude: initial.lng } : null;
  const { userProfile, setUserProfile, needsAddressPrompt, setNeedsAddressPrompt, setNeedsAddressSelection } = useContext(AuthContext);
  const { config, refreshConfig } = useConfig();
  const { subtotal } = useCart();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [point, setPoint] = useState(initialPoint);
  const [place, setPlace] = useState(null);
  const [sourceAddress, setSourceAddress] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [showAddresses, setShowAddresses] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [searchComplete, setSearchComplete] = useState(false);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [moving, setMoving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tilesReady, setTilesReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [configFailed, setConfigFailed] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const map = useRef(null);
  const input = useRef(null);
  const pointRef = useRef(point);
  pointRef.current = point;
  const generation = useRef(0);
  const searchGeneration = useRef(0);
  const searchRequest = useRef(null);
  const suggestedAddress = useRef(null);
  const hydrated = useRef(forForm);
  const autoLocated = useRef(false);

  const pick = useCallback((coordinate, address = null) => {
    if (!validCoordinates(coordinate?.latitude, coordinate?.longitude)) return;
    generation.current++;
    suggestedAddress.current = address;
    pointRef.current = coordinate;
    setPoint(coordinate);
    setPlace(null);
    setMoving(false);
    setGeocoding(true);
  }, []);
  const moveTo = coordinate => { pick(coordinate); map.current?.setCenter(coordinate); };

  useEffect(() => {
    if (!point || moving) return;
    const version = generation.current;
    let active = true;
    setGeocoding(true);
    const timer = setTimeout(async () => {
      let geo;
      let timeout;
      try { [geo] = await Promise.race([Location.reverseGeocodeAsync(point), new Promise(resolve => { timeout = setTimeout(() => resolve([]), 5000); })]); } catch { /* Keep the exact pin and ask for street details on the next screen. */ } finally { clearTimeout(timeout); }
      if (!active || version !== generation.current) return;
      const resolved = locationFromGeocode(point, geo || suggestedAddress.current);
      // Keep the selected place name when the device geocoder only returns a district.
      if (suggestedAddress.current?.name) resolved.locationName = suggestedAddress.current.name;
      setPlace(resolved);
      setGeocoding(false);
    }, 500);
    return () => { active = false; clearTimeout(timer); };
  }, [point, moving]);

  useFocusEffect(useCallback(() => {
    let active = true;
    refreshConfig().then(data => { if (active) setConfigFailed(!data); });
    if (!forForm && userProfile?.id) {
      apiClient.get(`/users/${userProfile.id}/addresses`, { __skipErrorToast: true }).then(({ data }) => {
        if (!active) return;
        const list = data.items || [];
        setAddresses(list);
        const selected = list.find(item => item.isDefault) || list[0];
        if (selected && !hydrated.current && validCoordinates(selected.lat, selected.lng)) {
          hydrated.current = true;
          setSourceAddress(selected);
          pick({ latitude: selected.lat, longitude: selected.lng });
          map.current?.setCenter({ latitude: selected.lat, longitude: selected.lng });
        }
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [forForm, userProfile?.id, pick, refreshConfig]));

  const locateCurrentPosition = useCallback(async () => {
    if (locating) return;
    setLocating(true);
    hydrated.current = true;
    const selectionVersion = generation.current;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Toast.show({ type: 'info', text1: 'Location permission is off', text2: 'You can still move the map to choose your door.' });
        return;
      }
      if (!await Location.hasServicesEnabledAsync()) {
        Toast.show({ type: 'info', text1: 'Turn on location services', text2: 'You can also select the pin manually on the map.' });
        return;
      }
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coordinate = { latitude: fix.coords.latitude, longitude: fix.coords.longitude, accuracy: fix.coords.accuracy };
      if (!validCoordinates(coordinate.latitude, coordinate.longitude)) throw new Error('Invalid GPS fix');
      setUserLocation(coordinate);
      // A late GPS fix must never replace a pin the customer moved by hand.
      if (selectionVersion !== generation.current) return;
      hydrated.current = true;
      pick(coordinate);
      map.current?.setCenter(coordinate);
    } catch { Toast.show({ type: 'info', text1: 'Could not get a GPS fix', text2: 'Move the map or search for your location instead.' }); }
    finally { setLocating(false); }
  }, [locating, pick]);

  useEffect(() => {
    if (params.autoLocate && !autoLocated.current) { autoLocated.current = true; locateCurrentPosition(); }
  }, [params.autoLocate, locateCurrentPosition]);
  useEffect(() => () => { generation.current++; searchGeneration.current++; }, []);

  const closeSearch = () => {
    searchGeneration.current++;
    searchRequest.current?.abort();
    setSearchOpen(false);
    setSearching(false);
    setSearchResults([]);
  };
  const changeQuery = text => {
    searchGeneration.current++;
    searchRequest.current?.abort();
    setQuery(text);
    setSearchResults([]);
    setSearchError(false);
    setSearchComplete(false);
    setSearching(false);
    setSearchOpen(true);
  };
  useEffect(() => {
    if (!searchOpen || query.trim().length < MIN_SEARCH_LENGTH) return;
    const version = ++searchGeneration.current;
    const controller = new AbortController();
    searchRequest.current = controller;
    setSearching(true);
    setSearchComplete(false);
    setSearchError(false);
    const timer = setTimeout(async () => {
      try {
        const results = await searchLocations(query, { signal: controller.signal });
        if (version !== searchGeneration.current || controller.signal.aborted) return;
        setSearchResults(results);
        setSearchComplete(true);
      } catch {
        if (version !== searchGeneration.current || controller.signal.aborted) return;
        setSearchError(true);
      } finally {
        if (version === searchGeneration.current && !controller.signal.aborted) setSearching(false);
      }
    }, 600);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, searchOpen, searchAttempt]);

  useFocusEffect(useCallback(() => () => {
    searchGeneration.current++;
    searchRequest.current?.abort();
    setSearchOpen(false);
    setSearching(false);
  }, []));

  const search = () => {
    if (query.trim().length < MIN_SEARCH_LENGTH) return;
    setSearchOpen(true);
    setSearchAttempt(attempt => attempt + 1);
  };
  const selectSuggestion = result => {
    closeSearch();
    setQuery(result.title);
    Keyboard.dismiss();
    hydrated.current = true;
    const coordinate = { latitude: result.latitude, longitude: result.longitude };
    pick(coordinate, result.address);
    setPlace(locationFromGeocode(coordinate, result.address));
    map.current?.setCenter(coordinate);
  };

  const bill = computeBill(subtotal, 0, 0, config, point ? { lat: point.latitude, lng: point.longitude } : null);
  const configReady = Boolean(config?.deliveryTiers?.length);
  const fromPrompt = Boolean(params.fromPrompt || needsAddressPrompt);
  const confirm = async () => {
    if (!point || !place || moving || geocoding || saving || !tilesReady || !configReady || !bill.withinRadius) return;
    if (forForm) {
      navigation.popTo('AddAddress', { pickedLocation: place }, { merge: true });
      return;
    }
    const unchanged = sourceAddress && sourceAddress.lat === point.latitude && sourceAddress.lng === point.longitude;
    if (!unchanged) {
      navigation.navigate('AddAddress', { pickedLocation: place, makeDefault: true, fromMap: true, fromPrompt });
      return;
    }
    setSaving(true);
    try {
      await apiClient.patch(`/users/${userProfile.id}/addresses/${sourceAddress.id}/set-default`);
      setUserProfile(current => ({ ...current, defaultAddressId: sourceAddress.id }));
      setNeedsAddressPrompt(false); setNeedsAddressSelection(false);
      if (fromPrompt || !navigation.canGoBack()) navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      else navigation.goBack();
    } catch { /* API reports failures. */ } finally { setSaving(false); }
  };

  return <View style={styles.screen}>
    <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
    <View style={styles.mapFrame}>
      <KeylessMap ref={map} initialCenter={initialPoint || STORE} mode="picker" selected={point} userLocation={userLocation} showBoundary tileUrl={config?.mapTileUrl} onPick={coordinate => { hydrated.current = true; pick(coordinate); }} onPreview={coordinate => { if (validCoordinates(coordinate?.latitude, coordinate?.longitude)) { generation.current++; setPoint(coordinate); setPlace(null); } }} onMoving={() => { hydrated.current = true; generation.current++; setMoving(true); closeSearch(); }} onReady={() => { if (pointRef.current) map.current?.setCenter(pointRef.current); }} onTileState={ready => { setTilesReady(ready); setTileError(!ready); }} onError={() => { setTileError(true); setTilesReady(false); }} />
      <View style={[styles.searchRow, { top: insets.top + 12 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('Main')} style={styles.round}><ChevronLeft size={23} color="#152018" /></Pressable>
        <View style={styles.searchBox}><Pressable accessibilityLabel="Search delivery area" onPress={search} hitSlop={8}><Search size={17} color="#087e49" /></Pressable><TextInput ref={input} accessibilityLabel="Search area, street or landmark" value={query} onChangeText={changeQuery} onFocus={() => setSearchOpen(true)} autoCorrect={false} onSubmitEditing={search} returnKeyType="search" placeholder="Search area, street or landmark" placeholderTextColor="#63766a" style={styles.searchInput} />{searching ? <ActivityIndicator size="small" color="#087e49" /> : query ? <Pressable accessibilityLabel="Clear location search" onPress={() => changeQuery('')}><X size={17} color="#63766a" /></Pressable> : null}</View>
      </View>
      {searchOpen && query.trim().length >= MIN_SEARCH_LENGTH && <View style={[styles.results, { top: insets.top + 68, maxHeight: Math.max(100, Math.min(300, height * .32)) }]}>
        <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          {searching && <View style={styles.searchStatus}><ActivityIndicator size="small" color="#087e49" /><Text accessibilityLiveRegion="polite" style={styles.resultDetail}>Finding places…</Text></View>}
          {searchError && <View style={styles.searchStatus}><Text accessibilityLiveRegion="polite" style={[styles.resultDetail, { flex: 1 }]}>Could not load places. Check your connection or move the map.</Text><Pressable accessibilityRole="button" onPress={search} style={{ padding: 10 }}><Text style={styles.resultTitle}>Retry</Text></Pressable></View>}
          {!searching && !searchError && searchComplete && !searchResults.length && <Text accessibilityLiveRegion="polite" style={[styles.resultDetail, { padding: 14 }]}>No places found. Try a nearby area, street or landmark.</Text>}
          {searchResults.map(result => <Pressable accessibilityRole="button" accessibilityLabel={`${result.title}, ${result.detail}`} key={result.id} onPress={() => selectSuggestion(result)} style={styles.result}><MapPin size={18} color="#087e49" /><View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.resultTitle}>{result.title}</Text><Text numberOfLines={2} style={styles.resultDetail}>{result.detail}</Text><Text style={styles.resultDetail}>{haversineKm(STORE.latitude, STORE.longitude, result.latitude, result.longitude)?.toFixed(2)} km from MS Traders</Text></View></Pressable>)}
          {searchResults.length > 0 && <Text style={styles.searchAttribution}>Search by Photon · © OpenStreetMap</Text>}
        </ScrollView>
      </View>}

      {(tileError || configFailed) && <View style={[styles.mapError, { top: insets.top + 72 }]}><Text style={{ flex: 1, color: '#9b2924', fontSize: 12 }}>{configFailed ? 'Delivery settings could not load. Please retry.' : 'Map tiles could not load. Check your connection.'}</Text><Pressable onPress={async () => { setTileError(false); map.current?.retry(); const data = await refreshConfig(); setConfigFailed(!data); }} style={{ padding: 8 }}><Text style={{ color: '#087e49', fontFamily: fonts.bold }}>Retry</Text></Pressable></View>}
      <Pressable accessibilityRole="button" accessibilityLabel="Show the 5 km delivery boundary" onPress={() => map.current?.fitToCoordinates([{ latitude: STORE.latitude + .047, longitude: STORE.longitude + .047 }, { latitude: STORE.latitude - .047, longitude: STORE.longitude - .047 }])} style={styles.boundary}><Text style={{ color: '#087e49', fontFamily: fonts.bold, fontSize: 11 }}>5 km delivery area</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Use my current GPS location" disabled={locating} onPress={locateCurrentPosition} style={[styles.round, styles.gps]}>{locating ? <ActivityIndicator color="#087e49" /> : <LocateFixed size={23} color="#253c2c" />}</Pressable>
    </View>
    <DeliveryLocationSheet locationName={place?.locationName} locality={place?.locality} distanceKm={bill.distanceKm} deliveryFee={bill.deliveryFee} hasSelection={Boolean(point)} withinRadius={bill.withinRadius} loading={geocoding} moving={moving} configReady={configReady} mapReady={tilesReady} saving={saving} onChange={() => !forForm && addresses.length ? setShowAddresses(true) : input.current?.focus()} onConfirm={confirm} bottomInset={insets.bottom} maxHeight={Math.max(275, height * .49)} />
    <Modal visible={showAddresses} transparent animationType="slide" onRequestClose={() => setShowAddresses(false)}><View style={styles.modalBackdrop}><View style={[styles.savedSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={styles.savedTitle}>Saved delivery addresses</Text><Pressable accessibilityLabel="Close saved addresses" onPress={() => setShowAddresses(false)} hitSlop={10}><X size={23} /></Pressable></View><ScrollView contentContainerStyle={{ gap: 10, paddingVertical: 16 }}>{addresses.map(address => <View key={address.id} style={styles.savedRow}><Pressable style={{ flex: 1 }} onPress={() => { setSourceAddress(address); hydrated.current = true; if (validCoordinates(address.lat, address.lng)) moveTo({ latitude: address.lat, longitude: address.lng }); else navigation.navigate('AddAddress', { address, fromMap: true, makeDefault: true, fromPrompt }); setShowAddresses(false); }}><Text style={styles.resultTitle}>{address.label === 'Current Location' ? 'Delivery address' : address.label}</Text><Text style={styles.resultDetail}>{formatDeliveryAddress(address)}</Text></Pressable><Pressable accessibilityLabel={`Edit ${address.label}`} onPress={() => { setShowAddresses(false); navigation.navigate('AddAddress', { address, fromMap: true, makeDefault: true, fromPrompt }); }} hitSlop={10}><Pencil size={17} color="#087e49" /></Pressable></View>)}</ScrollView><Pressable onPress={() => { setShowAddresses(false); navigation.navigate('AddAddress', { makeDefault: true, fromPrompt, fromMap: true }); }} style={styles.addAddress}><Plus size={18} color="#087e49" /><Text style={{ color: '#087e49', fontFamily: fonts.bold }}>Add a new address</Text></Pressable></View></View></Modal>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' }, mapFrame: { flex: 1, minHeight: 180, backgroundColor: '#e8eee4' }, searchRow: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', gap: 10, alignItems: 'center' },
  round: { width: 44, height: 44, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: .12, shadowRadius: 8, elevation: 5 }, searchBox: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9, height: 44, borderRadius: 25, backgroundColor: '#fff', paddingHorizontal: 16, shadowColor: '#000', shadowOpacity: .1, shadowRadius: 8, elevation: 5 },
  searchInput: { flex: 1, minWidth: 0, fontFamily: fonts.regular, fontSize: 12, color: '#1b3022', paddingVertical: 0 }, gps: { position: 'absolute', right: 17, bottom: 24 }, boundary: { position: 'absolute', left: 16, bottom: 28, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, elevation: 3 },
  searchStatus: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }, searchAttribution: { fontFamily: fonts.regular, color: '#63766a', fontSize: 10, padding: 10, textAlign: 'right' },
  results: { overflow: 'hidden', zIndex: 10, position: 'absolute', left: 66, right: 14, borderRadius: 15, backgroundColor: '#fff', elevation: 8 }, result: { padding: 13, gap: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#edf1ed' }, resultTitle: { fontFamily: fonts.bold, color: '#193622', fontSize: 13 }, resultDetail: { fontFamily: fonts.regular, color: '#63766a', fontSize: 11, lineHeight: 17, marginTop: 3 }, mapError: { position: 'absolute', left: 16, right: 16, padding: 10, borderRadius: 12, backgroundColor: '#fff1ef', flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalBackdrop: { flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end' }, savedSheet: { maxHeight: '75%', backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 }, savedTitle: { fontFamily: fonts.bold, fontSize: 17, color: '#193622' }, savedRow: { borderWidth: 1, borderColor: '#dce6df', padding: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, addAddress: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 44 },
});
