import React from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { MapPin, Truck, AlertTriangle } from '../icons';
import { fonts } from '../../theme/typography';
export default function DeliveryLocationSheet({ locationName, locality, distanceKm, deliveryFee, hasSelection, withinRadius, loading, moving, configReady, mapReady, saving, onChange, onConfirm, bottomInset = 0, maxHeight }) {
  const outside = hasSelection && !withinRadius;
  const disabled = !hasSelection || outside || loading || moving || saving || !configReady || !mapReady;
  const button = saving ? 'Saving…' : outside ? 'Outside delivery area' : !hasSelection ? 'Choose a location' : !mapReady ? 'Loading map…' : 'Confirm location';
  return <View style={[styles.sheet, { paddingBottom: Math.max(bottomInset, 16), maxHeight }]}>
    <View style={styles.handle} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <View><Text accessibilityRole="header" style={styles.title}>Set delivery location</Text><Text style={styles.subtitle}>Move the map to place the pin exactly on your door.</Text></View>
      <View style={styles.addressCard}>
        <View style={styles.pinBadge}><MapPin size={21} color="#087e49" strokeWidth={2.5} /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={2} style={styles.place}>{moving ? 'Moving pin…' : loading ? 'Finding address…' : locationName || 'Choose your delivery point'}</Text><Text numberOfLines={2} style={styles.locality}>{locality || 'Pan the map, search or use GPS'}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Change delivery location" onPress={onChange} hitSlop={10} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={styles.change}>Change</Text></Pressable>
      </View>
      {outside ? <View accessibilityRole="alert" style={styles.warning}><AlertTriangle size={16} color="#ad201c" /><Text style={styles.warningText}><Text style={{ fontFamily: fonts.bold }}>We don’t deliver here yet.</Text> This spot is {distanceKm > 5 && distanceKm < 5.01 ? 'just over 5' : distanceKm.toFixed(2)} km away — MS Traders delivers within 5 km of the store. Move the pin closer.</Text></View> : hasSelection && distanceKm != null ? <View style={styles.feeRow}><Truck size={14} color="#087e49" /><Text style={styles.fee}><Text style={{ fontFamily: fonts.bold }}>{distanceKm.toFixed(2)} km</Text> from MS Traders · {configReady ? <>Delivery fee <Text style={{ fontFamily: fonts.bold }}>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</Text></> : 'Loading delivery fee…'}</Text></View> : <Text style={styles.fee}>Delivery within 5 km · Open daily 10 AM–11 PM</Text>}
    </ScrollView>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy: saving }} disabled={disabled} onPress={onConfirm} style={[styles.confirm, disabled && styles.disabled]}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={[styles.confirmText, disabled && { color: '#6a7971' }]}>{button}</Text>}</Pressable>
  </View>;
}
const styles = StyleSheet.create({
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 17, paddingTop: 9, minHeight: 265, flexShrink: 0, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: .06, shadowRadius: 10, elevation: 8 },
  handle: { width: 36, height: 4, borderRadius: 3, backgroundColor: '#dbe2dc', alignSelf: 'center', marginBottom: 15 },
  body: { gap: 14, paddingBottom: 22 }, title: { fontFamily: fonts.extraBold, fontSize: 19, lineHeight: 25, color: '#151c16', letterSpacing: -.5 },
  subtitle: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: '#59635c' },
  addressCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8faf8', borderWidth: 1, borderColor: '#e4e9e4', borderRadius: 17, paddingHorizontal: 13, paddingVertical: 8 },
  pinBadge: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#e3f3e9', alignItems: 'center', justifyContent: 'center' },
  place: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: '#151c16' }, locality: { fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 16, color: '#59635c' }, change: { fontFamily: fonts.bold, fontSize: 12, color: '#087e49' },
  feeRow: { flexDirection: 'row', gap: 7, alignItems: 'center' }, fee: { flex: 1, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: '#36453b' },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: '#fceceb', borderRadius: 14, padding: 12 }, warningText: { flex: 1, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: '#ad201c' },
  confirm: { minHeight: 52, marginTop: 8, borderRadius: 15, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#087e49' }, disabled: { backgroundColor: '#dce6df' }, confirmText: { fontFamily: fonts.bold, fontSize: 15, color: '#fff', textAlign: 'center' },
});
