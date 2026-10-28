import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { ChevronLeft, MapPin, Home, Briefcase, Check } from './icons';
import { fonts } from '../theme/typography';
import { validCoordinates } from '../config/deliveryArea';
import { validateAddressForm } from '../utils/addressForm';

const GREEN = '#0A7C47';
const INK = '#121712';
const OPTIONS = [{ label: 'Home', Icon: Home }, { label: 'Work', Icon: Briefcase }, { label: 'Other', Icon: MapPin }];

function AddressField({ label, required, error, style, ...props }) {
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const showError = touched && error;
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}{required ? <Text style={{ color: GREEN }}> *</Text> : null}</Text>
      <TextInput {...props} accessibilityLabel={label} accessibilityHint={required ? 'Required' : 'Optional'}
        editable={props.editable !== false}
        placeholderTextColor="#8B958E"
        onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); setTouched(true); }}
        style={[styles.input, props.multiline && styles.multiline, focused && styles.focusedInput, showError && styles.invalidInput]}
      />
      {showError ? <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// Controlled presentation shared by the native screen and its responsive previews.
export default function DeliveryAddressForm({ form, onFieldChange, editing = false, locationLabel, locating = false, saving = false, onLocate, onSave, onBack }) {
  const { width, fontScale } = useWindowDimensions();
  const [paneWidth, setPaneWidth] = useState(null);
  const availableWidth = paneWidth ?? Math.min(width, 600);
  const stackFields = availableWidth < 340 || fontScale > 1.2;
  const stackLocationAction = availableWidth < 320 || fontScale > 1.2;
  const hasLocation = validCoordinates(form.lat, form.lng);
  const errors = validateAddressForm(form);
  const valid = Object.keys(errors).length === 0;
  const disabled = saving || locating || !valid;
  const update = key => value => onFieldChange(key, value);
  const fieldProps = { editable: !saving && !locating, autoCorrect: false, returnKeyType: 'next' };

  return (
    <View style={styles.screen}>
      <View style={styles.headerSurface}>
        <View style={styles.header}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton}>
            <ChevronLeft size={24} color={INK} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>{editing ? 'Edit delivery address' : 'Add delivery address'}</Text>
        </View>
      </View>
      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={styles.page} onLayout={({ nativeEvent }) => setPaneWidth(nativeEvent.layout.width)}>
            <View style={styles.locationCard} testID="address-location-card">
              <View style={styles.locationRow}>
                <View style={styles.locationIcon}>{locating ? <ActivityIndicator color={GREEN} /> : <MapPin size={22} color={GREEN} />}</View>
                <View style={styles.locationCopy}>
                  <Text style={styles.locationTitle}>{locating ? 'Finding your location…' : hasLocation ? 'Delivery location selected' : 'Set your delivery location'}</Text>
                  <Text style={styles.locationDescription}>{locating ? 'Please keep location services on.' : hasLocation ? locationLabel : 'Move the map to choose your exact delivery pin.'}</Text>
                </View>
                {!stackLocationAction && <Pressable disabled={locating || saving} onPress={onLocate} accessibilityRole="button" accessibilityLabel="Update delivery location" style={styles.locationAction}>
                  <Text style={styles.locationActionText}>{locating ? 'Locating…' : hasLocation ? 'Change pin' : 'Choose pin'}</Text>
                </Pressable>}
              </View>
              {stackLocationAction && <Pressable disabled={locating || saving} onPress={onLocate} accessibilityRole="button" accessibilityLabel="Update delivery location" style={[styles.locationAction, styles.stackedLocationAction]}>
                <Text style={styles.locationActionText}>{locating ? 'Locating…' : hasLocation ? 'Change on map' : 'Choose on map'}</Text>
              </Pressable>}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>Address details</Text>
                <Text style={styles.optional}>* Required</Text>
              </View>
              <AddressField {...fieldProps} label="House / flat number" required error={errors.houseNo} value={form.houseNo} onChangeText={update('houseNo')} placeholder="e.g. TC 20/18" maxLength={120} autoCapitalize="words" />
              <AddressField {...fieldProps} label="Building / street" required error={errors.street} value={form.street} onChangeText={update('street')} placeholder="Building name and street" maxLength={160} autoCapitalize="words" multiline returnKeyType="default" />
              <AddressField {...fieldProps} label="Area / locality" value={form.area} onChangeText={update('area')} placeholder="Neighbourhood or locality" maxLength={80} autoCapitalize="words" />
              <AddressField {...fieldProps} label="Landmark (optional)" value={form.landmark} onChangeText={update('landmark')} placeholder="A nearby shop or landmark" maxLength={160} autoCapitalize="sentences" />
              <View style={[styles.fieldRow, stackFields && styles.stackedFields]}>
                <AddressField {...fieldProps} style={stackFields ? styles.fullWidthField : styles.rowField} label="City" value={form.city} onChangeText={update('city')} placeholder="City or town" maxLength={100} autoCapitalize="words" />
                <AddressField {...fieldProps} style={stackFields ? styles.fullWidthField : styles.rowField} label="PIN code" required error={errors.pincode} value={form.pincode} onChangeText={value => onFieldChange('pincode', value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit PIN" keyboardType="number-pad" maxLength={6} autoComplete="postal-code" />
              </View>
            </View>

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Save address as</Text>
              <View accessibilityRole="radiogroup" accessibilityLabel="Address type" style={styles.options}>
                {OPTIONS.map(({ label, Icon }) => {
                  const selected = form.label === label;
                  return <Pressable key={label} onPress={() => onFieldChange('label', label)} disabled={saving} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={label}
                    style={[styles.option, selected && styles.selectedOption, fontScale > 1.2 && styles.largeTextOption]}>
                    <Icon size={18} color={selected ? GREEN : '#657168'} />
                    <Text style={[styles.optionText, selected && styles.selectedOptionText]}>{label}</Text>
                    {selected && availableWidth >= 390 && fontScale <= 1.2 ? <Check size={14} color={GREEN} /> : null}
                  </Pressable>;
                })}
              </View>
              <AddressField {...fieldProps} label="Receiver’s name (optional)" value={form.receiverName} onChangeText={update('receiverName')} placeholder="Who will receive the order?" maxLength={80} autoCapitalize="words" autoComplete="name" />
            </View>
          </View>
        </ScrollView>
        <View style={styles.footer} testID="address-footer">
          <View style={styles.footerContent}>
            <Pressable accessibilityRole="button" accessibilityLabel={editing ? 'Save changes' : 'Save address'} accessibilityState={{ disabled, busy: saving }}
              disabled={disabled} onPress={onSave} style={[styles.saveButton, disabled && styles.disabledButton]}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.saveText, disabled && styles.disabledText]}>{editing ? 'Save changes' : 'Save address'}</Text>}
            </Pressable>
            {!valid && !saving && <Text accessibilityLiveRegion="polite" style={styles.footerHint}>{errors.location || 'Complete the required address details to continue.'}</Text>}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F5F2' },
  headerSurface: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E4E9E3' },
  header: { width: '100%', maxWidth: 600, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, flexShrink: 0 },
  title: { flex: 1, minWidth: 0, fontFamily: fonts.extraBold, fontSize: 20, lineHeight: 27, color: INK },
  body: { flex: 1, minHeight: 0 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 20 },
  page: { width: '100%', maxWidth: 568, alignSelf: 'center', gap: 16 },
  locationCard: { borderWidth: 1, borderColor: '#CFE5D8', borderRadius: 18, backgroundColor: '#F1FAF4', padding: 14, gap: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DDF1E4', flexShrink: 0 },
  locationCopy: { flex: 1, minWidth: 0, gap: 4 },
  locationTitle: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 20, color: INK },
  locationDescription: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: '#526458', flexShrink: 1 },
  locationAction: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8, flexShrink: 0 },
  locationActionText: { fontFamily: fonts.semiBold, fontSize: 13, color: GREEN, textAlign: 'center' },
  stackedLocationAction: { alignSelf: 'flex-start', paddingHorizontal: 12, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#CFE5D8' },
  section: { padding: 16, gap: 16, borderRadius: 18, borderWidth: 1, borderColor: '#E4E9E3', backgroundColor: '#FFFFFF' },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.extraBold, fontSize: 16, lineHeight: 23, color: INK },
  optional: { fontFamily: fonts.regular, fontSize: 11, color: '#657168' },
  field: { gap: 7, minWidth: 0 },
  label: { fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 18, color: '#35473B' },
  input: { minHeight: 50, minWidth: 0, width: '100%', borderWidth: 1, borderColor: '#DCE3DB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FFFFFF', fontFamily: fonts.regular, fontSize: 14, color: INK, fontWeight: 'normal', textAlignVertical: 'center' },
  multiline: { minHeight: 68, textAlignVertical: 'top' },
  focusedInput: { borderColor: GREEN, backgroundColor: '#FAFDFB' },
  invalidInput: { borderColor: '#BA3A32' },
  fieldError: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: '#A12E28' },
  fieldRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stackedFields: { flexDirection: 'column', alignItems: 'stretch' },
  rowField: { flex: 1, minWidth: 0 },
  fullWidthField: { width: '100%' },
  options: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, minWidth: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 12, borderWidth: 1, borderColor: '#DCE3DB', borderRadius: 12, backgroundColor: '#FFFFFF' },
  selectedOption: { borderColor: GREEN, backgroundColor: '#ECF7F0' },
  largeTextOption: { flexDirection: 'column' },
  optionText: { fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 18, color: '#526458', flexShrink: 1, textAlign: 'center' },
  selectedOptionText: { color: GREEN },
  footer: { borderTopWidth: 1, borderColor: '#E4E9E3', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12 },
  footerContent: { width: '100%', maxWidth: 568, alignSelf: 'center', gap: 8 },
  saveButton: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 14, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: GREEN },
  disabledButton: { backgroundColor: '#E5EBE4' },
  saveText: { fontFamily: fonts.semiBold, fontSize: 15, color: '#FFFFFF', textAlign: 'center' },
  disabledText: { color: '#657168' },
  footerHint: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: '#657168', textAlign: 'center' },
});
