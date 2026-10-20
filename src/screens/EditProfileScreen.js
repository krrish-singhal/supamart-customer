import React, { useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Camera,
  User,
  Mail,
  Phone,
  Trash2,
  AlertTriangle,
  Lock,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { optimizeCloudinaryUrl } from '../utils/cloudinaryImage';

export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { userProfile: user, loadToken, deleteAccount } = useContext(AuthContext);

  const [name, setName] = useState(user?.name || '');
  const [mobile, setMobile] = useState(user?.mobile || user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [localPhotoUri, setLocalPhotoUri] = useState(null);

  // Account deletion states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError('Please enter your account password to confirm.');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount(deletePassword.trim());
      setShowDeleteModal(false);
      Toast.show({
        type: 'success',
        text1: 'Account Deleted',
        text2: 'Your account and personal data have been removed.',
      });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to delete account. Please try again.';
      setDeleteError(msg);
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: msg,
      });
    } finally {
      setDeleting(false);
    }
  };

  const isValid = name.trim().length >= 2;

  const save = useCallback(async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const payload = { name: name.trim() };
      if (mobile.trim()) payload.mobile = mobile.trim();

      await apiClient.put(`/users/${user.id}`, payload);
      await loadToken();
      Toast.show({ type: 'success', text1: 'Profile updated successfully.' });
      navigation.goBack();
    } catch {
      // handled by api interceptor
    } finally {
      setSaving(false);
    }
  }, [name, mobile, user?.id, isValid, saving, loadToken, navigation]);

  const pickAndUploadPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setLocalPhotoUri(asset.uri);
    setUploadingPhoto(true);

    try {
      const uploadData = new FormData();
      uploadData.append('avatar', {
        uri: asset.uri,
        name: 'avatar.jpg',
        type: asset.mimeType || 'image/jpeg',
      });

      await apiClient.patch(`/users/${user.id}/avatar`, uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      await loadToken();
      Toast.show({ type: 'success', text1: 'Profile photo updated.' });
    } catch (err) {
      setLocalPhotoUri(null);
      Toast.show({ type: 'error', text1: 'Failed to upload photo.', text2: err.message });
    } finally {
      setUploadingPhoto(false);
    }
  }, [user?.id, loadToken]);

  const photoUri = localPhotoUri || user?.profileImage;
  const initial = (name || user?.name || 'U').trim().charAt(0).toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 14,
          backgroundColor: '#ffffff',
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
          <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.4 }}>
          Edit Profile
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <Animated.View entering={FadeInDown.duration(350)} style={{ alignItems: 'center', marginVertical: 14 }}>
            <View style={{ position: 'relative' }}>
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: '#047857',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                {photoUri ? (
                  <Image
                    source={{ uri: optimizeCloudinaryUrl(photoUri, 200) }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={{ fontSize: 36, fontWeight: '900', color: '#ffffff' }}>
                    {initial}
                  </Text>
                )}
              </View>

              {/* Camera Action Button */}
              <Pressable
                onPress={pickAndUploadPhoto}
                disabled={uploadingPhoto}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: '#047857',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2.5,
                  borderColor: '#ffffff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Camera size={16} color="#ffffff" strokeWidth={2.4} />
                )}
              </Pressable>
            </View>

            <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748b', marginTop: 10 }}>
              {uploadingPhoto ? 'Uploading photo...' : 'Tap camera icon to change photo'}
            </Text>
          </Animated.View>

          {/* Card: Personal Details */}
          <Animated.View
            entering={FadeInDown.duration(350).delay(80)}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 18,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 14 }}>
              Personal Details
            </Text>

            {/* Name */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                Full Name *
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  height: 48,
                }}
              >
                <User size={18} color="#047857" style={{ marginRight: 10 }} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your full name"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="words"
                  style={{ flex: 1, fontSize: 14.5, color: '#0f172a', fontWeight: '500' }}
                />
              </View>
            </View>

            {/* Mobile Number */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                Mobile Number
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  height: 48,
                }}
              >
                <Phone size={18} color="#047857" style={{ marginRight: 10 }} />
                <TextInput
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={{ flex: 1, fontSize: 14.5, color: '#0f172a', fontWeight: '500' }}
                />
              </View>
            </View>

            {/* Email (Read only) */}
            <View>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                Email Address
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#f1f5f9',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  height: 48,
                }}
              >
                <Mail size={18} color="#94a3b8" style={{ marginRight: 10 }} />
                <Text style={{ flex: 1, fontSize: 14, color: '#64748b', fontWeight: '600' }}>
                  {user?.email || 'No email associated'}
                </Text>
                <Lock size={15} color="#94a3b8" />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '500', color: '#94a3b8', marginTop: 4, marginLeft: 2 }}>
                Used for sign-in and cannot be changed here
              </Text>
            </View>
          </Animated.View>

          {/* Account Deletion Card */}
          <Animated.View
            entering={FadeInDown.duration(350).delay(120)}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 18,
              borderWidth: 1,
              borderColor: '#fee2e2',
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: '#fef2f2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <Trash2 size={16} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#dc2626' }}>
                  Delete Account
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#94a3b8' }}>
                  Permanently remove profile and data
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 12.5, lineHeight: 18, color: '#64748b', marginVertical: 10 }}>
              Deleting your account will remove your profile, addresses, cart items, and notifications.
            </Text>

            <Pressable
              onPress={() => {
                setDeletePassword('');
                setDeleteError('');
                setShowDeleteModal(true);
              }}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#fca5a5',
                backgroundColor: '#fef2f2',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#dc2626' }}>
                Delete Account
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>

        {/* Sticky Bottom Save Changes Button */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16) + 6,
            borderTopWidth: 1,
            borderColor: '#f1f5f9',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <Pressable
            onPress={save}
            disabled={saving || !isValid}
            style={{
              height: 52,
              borderRadius: 14,
              backgroundColor: isValid && !saving ? '#047857' : '#94a3b8',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#047857',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: isValid && !saving ? 0.25 : 0,
              shadowRadius: 6,
              elevation: isValid && !saving ? 3 : 0,
            }}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#ffffff' }}>
                Save Changes
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Account Deletion Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setShowDeleteModal(false)}
      >
        <View style={[StyleSheet.absoluteFill, { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 }]}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 360, padding: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 8 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 }}>
              <AlertTriangle size={24} color="#dc2626" />
            </View>

            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 4 }}>
              Delete Account?
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#dc2626', textAlign: 'center', marginBottom: 14 }}>
              This action cannot be undone
            </Text>

            <View style={{ backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#f1f5f9' }}>
              <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 18 }}>
                Your profile, saved addresses, and active carts will be permanently deleted.
              </Text>
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a', marginBottom: 6 }}>
                Enter Password to Confirm
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  height: 46,
                }}
              >
                <Lock size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput
                  value={deletePassword}
                  onChangeText={(val) => {
                    setDeletePassword(val);
                    if (deleteError) setDeleteError('');
                  }}
                  placeholder="Account password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  style={{ flex: 1, fontSize: 14, color: '#0f172a' }}
                />
              </View>
              {deleteError ? (
                <Text style={{ fontSize: 11.5, color: '#dc2626', fontWeight: '600', marginTop: 4 }}>
                  {deleteError}
                </Text>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => {
                  if (!deleting) {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteError('');
                  }
                }}
                disabled={deleting}
                style={{ flex: 1, height: 46, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleDeleteAccount}
                disabled={deleting || !deletePassword.trim()}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 12,
                  backgroundColor: '#dc2626',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: deleting || !deletePassword.trim() ? 0.6 : 1,
                }}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
