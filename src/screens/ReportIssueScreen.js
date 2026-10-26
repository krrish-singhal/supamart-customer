import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  Check,
  Camera,
  X,
  ShoppingBag,
} from '../components/icons';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { getProductImageSource } from '../utils/productImages';
import { fonts } from '../theme/typography';

const ISSUE_OPTIONS = [
  'Missing item',
  'Damaged',
  'Wrong item',
  'Expired / poor quality',
  'Other',
];

export default function ReportIssueScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { orderId, orderNo: routeOrderNo, order: initialOrder } = route.params || {};

  const [order, setOrder] = useState(initialOrder || null);

  // Form states
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState('');
  const [otherReasonModal, setOtherReasonModal] = useState(false);
  const [otherReasonText, setOtherReasonText] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [description, setDescription] = useState('');
  const [fixOption, setFixOption] = useState('REFUND'); // 'REFUND' | 'REDELIVER'
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!order && (orderId || routeOrderNo)) {
      apiClient
        .get('/orders/mine')
        .then(({ data }) => {
          const found = (data.items || []).find((o) => o.id === orderId || o.orderNo === routeOrderNo);
          if (found) setOrder(found);
        })
        .catch(() => {});
    }
  }, [order, orderId, routeOrderNo]);

  const displayOrderNo = order?.orderNo || routeOrderNo || '10482';
  const orderItems = order?.items || [
    { id: '1', name: 'Toor Dal (Unpolished)', unit: '1 kg', qty: 1, price: 158 },
    { id: '2', name: 'Full Cream Milk', unit: '500 ml', qty: 2, price: 66 },
    { id: '3', name: 'Tomato (Local)', unit: '500 g', qty: 1, price: 22 },
  ];

  const toggleItem = (idx) => {
    setSelectedItemIds((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setUploadingPhoto(true);

        try {
          const uploadData = new FormData();
          uploadData.append('photo', {
            uri: asset.uri,
            name: 'issue_photo.jpg',
            type: asset.mimeType || 'image/jpeg',
          });

          const { data } = await apiClient.post('/issues/upload', uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000,
          });

          if (data?.url) {
            setPhotos((prev) => [...prev, data.url]);
          } else {
            setPhotos((prev) => [...prev, asset.uri]);
          }
        } catch (_uploadErr) {
          // Fallback to local URI
          setPhotos((prev) => [...prev, asset.uri]);
        } finally {
          setUploadingPhoto(false);
        }
      }
    } catch (_e) {
      Toast.show({ type: 'error', text1: 'Could not open photo gallery' });
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const isFormValid = selectedItemIds.length > 0 && selectedIssue.trim().length > 0;

  const handleSubmit = async () => {
    if (!isFormValid || submitting) return;
    setSubmitting(true);

    try {
      const affectedItems = selectedItemIds.map((idx) => {
        const it = orderItems[idx];
        return {
          name: it.name,
          unit: it.unit || it.variantLabel || '',
          qty: it.qty || 1,
          price: it.price || 0,
        };
      });

      const resolvedIssueType =
        selectedIssue === 'Other' && otherReasonText.trim()
          ? `Other: ${otherReasonText.trim()}`
          : selectedIssue;
      const resolvedDesc = otherReasonText.trim()
        ? description
          ? `${otherReasonText.trim()}\n${description}`
          : otherReasonText.trim()
        : description;

      await apiClient.post('/issues', {
        orderId: order?.id || order?.orderNo || orderId || routeOrderNo || 'demo-order',
        affectedItems,
        issueType: resolvedIssueType,
        photos,
        description: resolvedDesc,
        resolutionType: fixOption,
      });

      Toast.show({
        type: 'success',
        text1: 'Issue reported successfully',
        text2: 'Our team will review and resolve it promptly.',
      });
      navigation.goBack();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.error || 'Failed to submit issue. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* HEADER matching Image 4 */}
      <View
        style={{
          backgroundColor: '#ffffff',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderColor: '#f1f5f9',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
          }}
        >
          <ChevronLeft size={24} color="#0f172a" strokeWidth={2.6} />
        </Pressable>

        <View>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
            Report an issue
          </Text>
          <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748b', marginTop: 1 }}>
            Order #{displayOrderNo}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 85,
          gap: 20,
        }}
      >
        {/* 1. SELECT AFFECTED ITEMS matching Image 4 */}
        <Animated.View entering={FadeInDown.duration(280)}>
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a', marginBottom: 12 }}>
            1. Select affected items
          </Text>

          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.03,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            {orderItems.map((item, idx) => {
              const isSelected = selectedItemIds.includes(idx);
              const imgSource = getProductImageSource(item);
              const isLast = idx === orderItems.length - 1;

              return (
                <Pressable
                  key={idx}
                  onPress={() => toggleItem(idx)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderColor: '#f1f5f9',
                    backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                  }}
                >
                  {/* Thumbnail */}
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: '#f8fafc',
                      borderWidth: 1,
                      borderColor: '#f1f5f9',
                      overflow: 'hidden',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    {imgSource ? (
                      <Image
                        source={imgSource}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="contain"
                      />
                    ) : (
                      <ShoppingBag size={20} color="#94a3b8" />
                    )}
                  </View>

                  {/* Title & Unit x Qty */}
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0f172a' }}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748b', marginTop: 2 }}>
                      {item.unit || item.variantLabel || '1 unit'} × {item.qty || 1}
                    </Text>
                  </View>

                  {/* Checkbox */}
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: isSelected ? '#047857' : '#cbd5e1',
                      backgroundColor: isSelected ? '#047857' : '#ffffff',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* 2. WHAT WENT WRONG? matching Image 4 */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a', marginBottom: 12 }}>
            2. What went wrong?
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {ISSUE_OPTIONS.map((opt) => {
              const isSelected = selectedIssue === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    setSelectedIssue(opt);
                    if (opt === 'Other') {
                      setOtherReasonModal(true);
                    }
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: isSelected ? '#047857' : '#e2e8f0',
                    backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13.5,
                      fontWeight: isSelected ? '800' : '700',
                      color: isSelected ? '#047857' : '#0f172a',
                    }}
                  >
                    {opt === 'Other' && otherReasonText.trim()
                      ? `Other: ${otherReasonText.trim().slice(0, 22)}${otherReasonText.trim().length > 22 ? '…' : ''}`
                      : opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* 3. ADD PHOTOS matching Image 4 */}
        <Animated.View entering={FadeInDown.duration(320)}>
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a', marginBottom: 12 }}>
            3. Add photos{' '}
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#64748b' }}>
              (helps us resolve faster)
            </Text>
          </Text>

          {/* Dotted upload box */}
          <Pressable
            onPress={handlePickPhoto}
            disabled={uploadingPhoto}
            style={{
              borderWidth: 1.5,
              borderColor: '#6ee7b7',
              borderStyle: 'dashed',
              borderRadius: 18,
              backgroundColor: '#f0fdf4',
              paddingVertical: 26,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            {uploadingPhoto ? (
              <ActivityIndicator color="#047857" size="small" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Camera size={20} color="#047857" strokeWidth={2.4} />
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#047857' }}>
                  Upload photos
                </Text>
              </View>
            )}
          </Pressable>

          {/* Photos preview list */}
          {photos.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              {photos.map((uri, i) => (
                <View
                  key={i}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 12,
                    overflow: 'hidden',
                    position: 'relative',
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                  }}
                >
                  <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  <Pressable
                    onPress={() => handleRemovePhoto(i)}
                    style={{
                      position: 'absolute',
                      top: 3,
                      right: 3,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      borderRadius: 10,
                      width: 18,
                      height: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={12} color="#ffffff" strokeWidth={2.6} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Optional description input */}
          <TextInput
            placeholder="Describe the issue (optional)"
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 14,
              color: '#0f172a',
              minHeight: 76,
              textAlignVertical: 'top',
            }}
          />
        </Animated.View>

        {/* 4. HOW SHOULD WE FIX IT? matching Image 4 & 5 */}
        <Animated.View entering={FadeInDown.duration(340)}>
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a', marginBottom: 12 }}>
            4. How should we fix it?
          </Text>

          <View style={{ gap: 10 }}>
            {/* OPTION 1: Refund to original payment */}
            <Pressable
              onPress={() => setFixOption('REFUND')}
              style={{
                backgroundColor: fixOption === 'REFUND' ? '#f0fdf4' : '#ffffff',
                borderWidth: 1.5,
                borderColor: fixOption === 'REFUND' ? '#047857' : '#e2e8f0',
                borderRadius: 18,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {/* Radio circle */}
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: fixOption === 'REFUND' ? '#047857' : '#cbd5e1',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}
              >
                {fixOption === 'REFUND' && (
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: '#047857',
                    }}
                  />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0f172a' }}>
                  Refund to original payment
                </Text>
                <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748b', marginTop: 2 }}>
                  UPI app
                </Text>
              </View>
            </Pressable>

            {/* OPTION 2: Deliver the item again */}
            <Pressable
              onPress={() => setFixOption('REDELIVER')}
              style={{
                backgroundColor: fixOption === 'REDELIVER' ? '#f0fdf4' : '#ffffff',
                borderWidth: 1.5,
                borderColor: fixOption === 'REDELIVER' ? '#047857' : '#e2e8f0',
                borderRadius: 18,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {/* Radio circle */}
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: fixOption === 'REDELIVER' ? '#047857' : '#cbd5e1',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}
              >
                {fixOption === 'REDELIVER' && (
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: '#047857',
                    }}
                  />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0f172a' }}>
                  Deliver the item again
                </Text>
                <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748b', marginTop: 2 }}>
                  With your next order or as a quick delivery
                </Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>

      {/* BOTTOM STICKY BUTTON matching Image 4 & 5 */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16) + 10,
          borderTopWidth: 1,
          borderColor: '#f1f5f9',
        }}
      >
        <Pressable
          onPress={handleSubmit}
          disabled={!isFormValid || submitting}
          style={{
            height: 52,
            borderRadius: 16,
            backgroundColor: isFormValid ? '#047857' : '#d1dcd4',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: isFormValid ? '#047857' : 'transparent',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isFormValid ? 0.25 : 0,
            shadowRadius: 8,
            elevation: isFormValid ? 3 : 0,
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 15.5,
                  fontWeight: '800',
                  color: isFormValid ? '#ffffff' : '#546e5a',
                }}
              >
                {isFormValid ? 'Submit issue' : 'Select an item and issue'}
              </Text>
          )}
        </Pressable>
      </View>

      {/* Modal for "Other" issue reason */}
      <Modal
        visible={otherReasonModal}
        transparent
        animationType="fade"
        onRequestClose={() => setOtherReasonModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.18,
              shadowRadius: 14,
              elevation: 8,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#0f172a' }}>
                Specify Issue Reason
              </Text>
              <Pressable
                onPress={() => setOtherReasonModal(false)}
                hitSlop={8}
                style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={15} color="#64748b" strokeWidth={2.4} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 18 }}>
              Please describe what went wrong with your items so our admin team can assist promptly.
            </Text>

            <TextInput
              multiline
              numberOfLines={4}
              value={otherReasonText}
              onChangeText={setOtherReasonText}
              placeholder="e.g. Package was tampered, items were unsealed..."
              placeholderTextColor="#94a3b8"
              style={{
                backgroundColor: '#f8fafc',
                borderWidth: 1.5,
                borderColor: '#e2e8f0',
                borderRadius: 14,
                padding: 12,
                fontSize: 13.5,
                color: '#0f172a',
                textAlignVertical: 'top',
                minHeight: 90,
                marginBottom: 16,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setOtherReasonModal(false)}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 12,
                  backgroundColor: '#f1f5f9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!otherReasonText.trim()) {
                    Toast.show({ type: 'info', text1: 'Please enter a brief reason' });
                    return;
                  }
                  setSelectedIssue('Other');
                  setOtherReasonModal(false);
                }}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 12,
                  backgroundColor: '#047857',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>Save Reason</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
