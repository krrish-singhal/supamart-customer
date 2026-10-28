import React, { useState, useMemo, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  House,
  Flag,
  DoorClosed,
  BellOff,
  PhoneCall,
  PawPrint,
  Shield,
  Moon,
  Eye,
  Check,
} from '../components/icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { fonts } from '../theme/typography';
import { AuthContext } from '../context/AuthContext';
import { formatDeliveryAddress } from '../utils/addressForm';

const DOOR_OPTIONS = [
  {
    id: 'leave_door',
    label: 'Leave at the door',
    summary: 'Leave at the door',
    Icon: DoorClosed,
  },
  {
    id: 'no_bell',
    label: 'Don’t ring the bell',
    summary: 'Don’t ring the bell',
    Icon: BellOff,
  },
  {
    id: 'call_arrive',
    label: 'Call when you arrive',
    summary: 'Call on arrival',
    Icon: PhoneCall,
  },
  {
    id: 'pets',
    label: 'Beware of pets',
    summary: 'Beware of pets',
    Icon: PawPrint,
  },
  {
    id: 'security',
    label: 'Hand to security',
    summary: 'Hand to security',
    Icon: Shield,
  },
  {
    id: 'baby_sleeping',
    label: 'Baby sleeping,\nknock softly',
    summary: 'Baby sleeping',
    Icon: Moon,
  },
];

const STORAGE_KEY = '@supamart_delivery_instructions';

export default function DeliveryInstructionsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const { userProfile, user } = useContext(AuthContext) || {};
  const [fetchedAddress, setFetchedAddress] = useState(null);

  const incomingAddress = route.params?.address;
  const initialInstructions = route.params?.initialInstructions;

  // Real user input state — starts EMPTY so placeholders show as requested
  const [landmark, setLandmark] = useState(
    initialInstructions?.landmark && initialInstructions.landmark !== 'Opposite the bus stop'
      ? initialInstructions.landmark
      : ''
  );
  const [gateDetails, setGateDetails] = useState(
    initialInstructions?.gateDetails && initialInstructions.gateDetails !== 'Blue gate, 2nd floor'
      ? initialInstructions.gateDetails
      : ''
  );
  const [selectedDoorOptions, setSelectedDoorOptions] = useState(
    initialInstructions?.selectedDoorOptions !== undefined
      ? initialInstructions.selectedDoorOptions
      : ['leave_door', 'call_arrive']
  );
  const [additionalNotes, setAdditionalNotes] = useState(
    initialInstructions?.additionalNotes || ''
  );
  const [saveForFuture, setSaveForFuture] = useState(
    initialInstructions?.saveForFuture !== undefined
      ? initialInstructions.saveForFuture
      : true
  );

  // Address parsing & normalization (handles string, object, or fallback fetch)
  const resolvedAddressData = useMemo(() => {
    // 1. If incomingAddress is an object
    if (incomingAddress && typeof incomingAddress === 'object') {
      const label =
        incomingAddress.label && incomingAddress.label !== 'Current Location'
          ? incomingAddress.label
          : 'Home';
      const formatted = formatDeliveryAddress(incomingAddress);
      const manualParts = [
        incomingAddress.houseNo,
        incomingAddress.street,
        incomingAddress.area || incomingAddress.city,
        incomingAddress.pincode,
      ]
        .filter(Boolean)
        .join(', ');
      const subtitle = formatted || manualParts;
      if (subtitle && !subtitle.includes('[Your delivery address]')) {
        return { label, subtitle };
      }
    }

    // 2. If incomingAddress is a string (e.g. from OrderConfirmation or OrderTracking)
    if (incomingAddress && typeof incomingAddress === 'string') {
      const trimmed = incomingAddress.trim();
      if (trimmed.includes(' · ')) {
        const [lbl, ...rest] = trimmed.split(' · ');
        const sub = rest.join(' · ').trim();
        if (sub && !sub.includes('[Your delivery address]')) {
          return { label: lbl || 'Home', subtitle: sub };
        }
      } else if (!trimmed.includes('[Your delivery address]') && trimmed.length > 0) {
        return { label: 'Home', subtitle: trimmed };
      }
    }

    // 3. Fallback: if we fetched the user default address
    if (fetchedAddress) {
      const label =
        fetchedAddress.label && fetchedAddress.label !== 'Current Location'
          ? fetchedAddress.label
          : 'Home';
      const formatted = formatDeliveryAddress(fetchedAddress);
      const manualParts = [
        fetchedAddress.houseNo,
        fetchedAddress.street,
        fetchedAddress.area || fetchedAddress.city,
        fetchedAddress.pincode,
      ]
        .filter(Boolean)
        .join(', ');
      return { label, subtitle: formatted || manualParts || 'Selected delivery address' };
    }

    return null;
  }, [incomingAddress, fetchedAddress]);

  // Fetch address from backend if missing or placeholder
  useEffect(() => {
    if (
      resolvedAddressData?.subtitle &&
      !resolvedAddressData.subtitle.includes('[Your delivery address]')
    ) {
      return;
    }
    let isMounted = true;
    const fetchUserAddress = async () => {
      try {
        const uid = userProfile?.id || user?.id || user?.uid;
        if (!uid) return;
        const { data } = await apiClient.get(`/users/${uid}/addresses`, {
          __skipErrorToast: true,
        });
        if (!isMounted) return;
        const items = data?.items || [];
        const def =
          items.find((a) => a.isDefault) ||
          items.find((a) => a.id === userProfile?.defaultAddressId) ||
          items[0];
        if (def) {
          setFetchedAddress(def);
        }
      } catch (_e) {}
    };
    fetchUserAddress();
    return () => {
      isMounted = false;
    };
  }, [userProfile?.id, userProfile?.defaultAddressId, user?.id, user?.uid, resolvedAddressData]);

  // Maintain viewport at top on screen enter
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const addressLabel = resolvedAddressData?.label || 'Home';
  const addressSubtitle =
    resolvedAddressData?.subtitle || 'Selected delivery address';
  const addressTitle = `Delivering to ${addressLabel}`;

  // Toggle option selection
  const toggleDoorOption = (id) => {
    setSelectedDoorOptions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Clear handler: resets all fields to empty
  const handleClear = () => {
    setLandmark('');
    setGateDetails('');
    setSelectedDoorOptions([]);
    setAdditionalNotes('');
    Toast.show({ type: 'info', text1: 'Instructions cleared' });
  };

  // Partner summary string
  const partnerSummary = useMemo(() => {
    const labels = selectedDoorOptions
      .map((id) => DOOR_OPTIONS.find((opt) => opt.id === id)?.summary)
      .filter(Boolean);
    return labels.join(' · ');
  }, [selectedDoorOptions]);

  const totalSelectedCount = selectedDoorOptions.length;

  const handleSave = async () => {
    const selectedLabels = selectedDoorOptions
      .map((id) => DOOR_OPTIONS.find((opt) => opt.id === id)?.label)
      .filter(Boolean);

    const payload = {
      landmark: landmark.trim(),
      gateDetails: gateDetails.trim(),
      selectedDoorOptions,
      selectedLabels,
      additionalNotes: additionalNotes.trim(),
      saveForFuture,
      summary: partnerSummary,
      combinedNote: [
        ...selectedLabels,
        landmark.trim() ? `Landmark: ${landmark.trim()}` : null,
        gateDetails.trim() ? `Gate/Floor: ${gateDetails.trim()}` : null,
        additionalNotes.trim() || null,
      ]
        .filter(Boolean)
        .join('; '),
    };

    if (saveForFuture) {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {}
    }

    if (route.params?.orderId) {
      try {
        await apiClient.patch(`/orders/${route.params.orderId}/instructions`, {
          deliveryInstructions: payload,
        });
        Toast.show({
          type: 'success',
          text1: 'Delivery instructions updated',
          text2: 'Shared with your delivery partner',
        });
      } catch (e) {
        console.warn('Failed to update delivery instructions:', e?.message);
      }
    }

    if (route.params?.returnScreen) {
      navigation.navigate({
        name: route.params.returnScreen,
        params: { updatedDeliveryInstructions: payload },
        merge: true,
      });
    } else {
      if (typeof route.params?.onSave === 'function') {
        try {
          route.params.onSave(payload);
        } catch (_e) {}
      }
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Screen Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
        </Pressable>
        <Text style={styles.headerTitle}>Delivery instructions</Text>
        <Pressable onPress={handleClear} hitSlop={10} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>Clear</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Card 1: Delivering to Home matching Image 1 */}
        <View style={styles.addressCard}>
          <View style={styles.addressIconBox}>
            <House size={20} color="#047857" strokeWidth={2.2} />
          </View>
          <View style={styles.addressTextContainer}>
            <Text style={styles.addressTitleText}>{addressTitle}</Text>
            <Text numberOfLines={2} style={styles.addressSubtitleText}>
              {addressSubtitle}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              navigation.navigate('MyAddresses');
            }}
            hitSlop={8}
            style={styles.changeBtn}
          >
            <Text style={styles.changeBtnText}>Change</Text>
          </Pressable>
        </View>

        {/* Card 2: Help us find you matching Image 1 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Help us find you</Text>
          <Text style={styles.cardSubtitle}>Saves your delivery partner a phone call</Text>

          {/* Nearby landmark */}
          <Text style={styles.inputLabel}>Nearby landmark</Text>
          <View style={styles.inputWrapper}>
            <Flag size={17} color="#047857" strokeWidth={2.2} style={{ marginRight: 10 }} />
            <TextInput
              value={landmark}
              onChangeText={setLandmark}
              placeholder="e.g. Opposite the bus stop"
              placeholderTextColor="#94a3b8"
              style={styles.textInput}
            />
          </View>

          {/* Gate, floor or flat */}
          <Text style={styles.inputLabel}>Gate, floor or flat</Text>
          <View style={styles.inputWrapper}>
            <House size={17} color="#047857" strokeWidth={2.2} style={{ marginRight: 10 }} />
            <TextInput
              value={gateDetails}
              onChangeText={setGateDetails}
              placeholder="e.g. Blue gate, 2nd floor"
              placeholderTextColor="#94a3b8"
              style={styles.textInput}
            />
          </View>
        </View>

        {/* Card 3: At the door matching Image 1 & 2 */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>At the door</Text>
            <Text style={styles.pickAnyText}>Pick any</Text>
          </View>

          {/* 2x3 Grid matching Image 1 */}
          <View style={styles.optionsGrid}>
            {DOOR_OPTIONS.map((item) => {
              const isSelected = selectedDoorOptions.includes(item.id);
              const ItemIcon = item.Icon;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleDoorOption(item.id)}
                  style={[
                    styles.optionCard,
                    isSelected ? styles.optionCardSelected : styles.optionCardUnselected,
                  ]}
                >
                  <View style={styles.optionCardTop}>
                    <View
                      style={[
                        styles.optionIconContainer,
                        isSelected
                          ? styles.optionIconContainerSelected
                          : styles.optionIconContainerUnselected,
                      ]}
                    >
                      <ItemIcon
                        size={18}
                        color={isSelected ? '#ffffff' : '#047857'}
                        strokeWidth={2.2}
                      />
                    </View>

                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Check size={11} color="#ffffff" strokeWidth={3} />
                      </View>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.optionLabel,
                      isSelected && { color: '#0f172a' },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Card 4: Anything else? (optional) matching Image 2 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Anything else? <Text style={styles.optionalText}>(optional)</Text>
          </Text>
          <View style={styles.notesWrapper}>
            <TextInput
              value={additionalNotes}
              onChangeText={(val) => setAdditionalNotes(val.slice(0, 140))}
              placeholder="e.g. Please don't leave milk in the sun"
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={140}
              style={styles.notesInput}
            />
          </View>
          <Text style={styles.counterText}>{additionalNotes.length}/140</Text>
        </View>

        {/* Card 5: Green Partner Will See Banner matching Image 2 */}
        {partnerSummary.length > 0 && (
          <View style={styles.partnerBanner}>
            <View style={styles.partnerBannerHeader}>
              <Eye size={15} color="#047857" strokeWidth={2.4} style={{ marginRight: 6 }} />
              <Text style={styles.partnerBannerTitle}>YOUR DELIVERY PARTNER WILL SEE</Text>
            </View>
            <Text style={styles.partnerBannerContent}>{partnerSummary}</Text>
          </View>
        )}

        {/* Save for future orders Checkbox matching Image 2 */}
        <Pressable
          onPress={() => setSaveForFuture(!saveForFuture)}
          style={styles.futureCheckboxRow}
        >
          <View
            style={[
              styles.checkboxBox,
              saveForFuture && styles.checkboxBoxChecked,
            ]}
          >
            {saveForFuture && <Check size={13} color="#ffffff" strokeWidth={3} />}
          </View>
          <Text style={styles.futureCheckboxText}>
            Save for future orders to <Text style={{ fontFamily: fonts.bold }}>{addressLabel}</Text>
          </Text>
        </Pressable>
      </ScrollView>

      {/* Bottom Sticky Action Button with Maximum Visibility */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Pressable
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel={
            totalSelectedCount > 0
              ? `Save ${totalSelectedCount} delivery instructions`
              : 'Save delivery instructions'
          }
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.saveButtonPressed,
          ]}
        >
          <View style={styles.saveButtonInner}>
            <View style={styles.saveButtonIconCircle}>
              <Check size={16} color="#047857" strokeWidth={3} />
            </View>
            <Text style={styles.saveButtonText}>
              {totalSelectedCount > 0
                ? `Save ${totalSelectedCount} Instruction${totalSelectedCount > 1 ? 's' : ''}`
                : 'Save Instructions'}
            </Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f6f3',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#0f172a',
    flex: 1,
    marginLeft: 8,
  },
  clearBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  clearBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#047857',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  addressIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#eaf6ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressTitleText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#0f172a',
  },
  addressSubtitleText: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 2,
  },
  changeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  changeBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#047857',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#0f172a',
  },
  cardSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickAnyText: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: '#64748b',
  },
  inputLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: '#0f172a',
    padding: 0,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  optionCard: {
    width: '48%',
    minHeight: 100,
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 12,
    justifyContent: 'space-between',
  },
  optionCardSelected: {
    borderColor: '#047857',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
  },
  optionCardUnselected: {
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  optionCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconContainerSelected: {
    backgroundColor: '#047857',
  },
  optionIconContainerUnselected: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#0f172a',
    lineHeight: 17,
  },
  optionalText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#64748b',
  },
  notesWrapper: {
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 12,
    marginTop: 10,
  },
  notesInput: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: '#0f172a',
    minHeight: 64,
    textAlignVertical: 'top',
    padding: 0,
  },
  counterText: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 4,
  },
  partnerBanner: {
    backgroundColor: '#ecfdf5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  partnerBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  partnerBannerTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#047857',
    letterSpacing: 0.5,
  },
  partnerBannerContent: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  futureCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxBoxChecked: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  futureCheckboxText: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: '#0f172a',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  saveButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#0A7C47',
    borderWidth: 1.5,
    borderColor: '#065f35',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A7C47',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonPressed: {
    backgroundColor: '#08673a',
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  saveButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveButtonIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
