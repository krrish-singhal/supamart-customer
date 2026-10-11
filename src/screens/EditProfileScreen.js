import { useState, useContext, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StatusBar, Platform, KeyboardAvoidingView, ActivityIndicator, Modal, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, User, Mail, Phone, Calendar, ChevronDown, Trash2, AlertTriangle, Lock } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { AuthContext } from '../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Header, Input, Button, Card, Avatar } from '../components/ui';
import { optimizeCloudinaryUrl } from '../utils/cloudinaryImage';

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

export default function EditProfileScreen({ navigation }) {
  const { userProfile: user, loadToken, deleteAccount } = useContext(AuthContext);

  const [name, setName] = useState(user?.name || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
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
      if (gender) payload.gender = gender;
      if (dateOfBirth) payload.dateOfBirth = dateOfBirth;

      await apiClient.put(`/users/${user.id}`, payload);
      await loadToken();
      Toast.show({ type: 'success', text1: 'Profile updated successfully.' });
      navigation.goBack();
    } catch {
      // error handled by api interceptor
    } finally {
      setSaving(false);
    }
  }, [name, mobile, gender, dateOfBirth, user?.id, isValid, saving, loadToken, navigation]);

  const pickAndUploadPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'info', text1: 'Photo library permission is required.' });
      return;
    }

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
        timeout: 120000, // image upload + possible backend cold start — matches global ceiling
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

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const yyyy = selectedDate.getFullYear();
      setDateOfBirth(`${dd}/${mm}/${yyyy}`);
    }
  };

  const photoUri = localPhotoUri || user?.profileImage;

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Header title="Edit Profile" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar section */}
          <Animated.View entering={FadeInDown.duration(350)} className="items-center mb-8 mt-2">
            <View className="relative">
              {photoUri ? (
                <Image
                  source={{ uri: optimizeCloudinaryUrl(photoUri, 200) }}
                  style={{ width: 96, height: 96, borderRadius: 48 }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <Avatar name={user?.name || 'User'} size="xl" />
              )}
              <Pressable
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary-600 items-center justify-center border-2 border-white shadow-md"
                onPress={pickAndUploadPhoto}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Camera size={16} color="#fff" />
                )}
              </Pressable>
            </View>
            <Text className="text-xs font-semibold text-text-tertiary mt-3">
              {uploadingPhoto ? 'Uploading...' : 'Tap the camera to change your photo'}
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.duration(350).delay(80)}>
            <Card elevation="sm" className="border-0 bg-white p-5 mb-4">
              {/* Name */}
              <Input
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                leftIcon={<User size={16} color="#94a3b8" />}
                autoCapitalize="words"
              />

              {/* Email — read-only, this is the sign-in identity */}
              <View className="mb-4">
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>
                  Email Address
                </Text>
                <View
                  className="flex-row items-center bg-surface-100 border border-border-light rounded-2xl px-4"
                  style={{ height: 50 }}
                >
                  <Mail size={16} color="#94a3b8" />
                  <Text className="text-sm font-semibold text-text-tertiary flex-1 ml-2">
                    {user?.email}
                  </Text>
                </View>
                <Text className="text-xs font-medium text-text-tertiary mt-1.5 ml-1">
                  This is what you sign in with — it can&apos;t be changed here
                </Text>
              </View>

              {/* Mobile */}
              <Input
                label="Mobile Number"
                value={mobile}
                onChangeText={setMobile}
                placeholder="10-digit mobile number"
                keyboardType="phone-pad"
                maxLength={10}
                leftIcon={<Phone size={16} color="#94a3b8" />}
                containerStyle={{ marginBottom: 0 }}
              />
            </Card>

            <Card elevation="sm" className="border-0 bg-white p-5 mb-4">
              {/* Gender */}
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>
                Gender
              </Text>
              <Pressable
                onPress={() => setShowGenderPicker((v) => !v)}
                className="flex-row items-center justify-between bg-surface-50 border border-border-light rounded-2xl px-4 mb-4"
                style={{ height: 50 }}
              >
                <Text className={`text-sm font-semibold ${gender ? 'text-text-primary' : 'text-text-tertiary'}`}>
                  {gender || 'Select gender'}
                </Text>
                <ChevronDown size={16} color="#94a3b8" />
              </Pressable>
              {showGenderPicker && (
                <View className="bg-white border border-border-light rounded-2xl overflow-hidden mb-4 shadow-sm">
                  {GENDER_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt}
                      onPress={() => { setGender(opt); setShowGenderPicker(false); }}
                      className={`px-4 py-3.5 border-b border-border-light active:bg-surface-50 ${opt === gender ? 'bg-primary-50' : ''}`}
                    >
                      <Text className={`text-sm font-semibold ${opt === gender ? 'text-primary-600' : 'text-text-primary'}`}>
                        {opt}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Date of Birth */}
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>
                Date of Birth
              </Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                className="flex-row items-center justify-between bg-surface-50 border border-border-light rounded-2xl px-4"
                style={{ height: 50 }}
              >
                <View className="flex-row items-center">
                  <Calendar size={16} color="#94a3b8" />
                  <Text className={`text-sm font-semibold ml-3 ${dateOfBirth ? 'text-text-primary' : 'text-text-tertiary'}`}>
                    {dateOfBirth || 'DD/MM/YYYY'}
                  </Text>
                </View>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={dateOfBirth ? new Date(dateOfBirth.split('/').reverse().join('-')) : new Date()}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={handleDateChange}
                />
              )}
            </Card>

            {/* Account Deletion Card */}
            <Card elevation="sm" className="border border-red-100 bg-white p-5 mb-6">
              <View className="flex-row items-center mb-2">
                <View className="w-8 h-8 rounded-full bg-red-50 items-center justify-center mr-3">
                  <Trash2 size={16} color="#ef4444" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-red-600">Delete Account</Text>
                  <Text className="text-xs text-text-tertiary">Permanently remove your profile and personal data</Text>
                </View>
              </View>

              <Text className="text-xs leading-5 text-text-secondary mt-2 mb-4">
                Deleting your account will remove your profile, saved addresses, cart items, notifications, and credentials. Past order records are anonymized and retained only for legal and accounting obligations.
              </Text>

              <Pressable
                onPress={() => {
                  setDeletePassword('');
                  setDeleteError('');
                  setShowDeleteModal(true);
                }}
                className="py-3 px-4 rounded-xl border border-red-200 bg-red-50/50 items-center justify-center active:bg-red-100"
              >
                <Text className="text-sm font-bold text-red-600">Delete Account</Text>
              </Pressable>
            </Card>
          </Animated.View>
        </ScrollView>

        <View className="p-4 bg-white border-t border-border-light">
          <Button
            title="Save Changes"
            onPress={save}
            disabled={saving || !isValid}
            loading={saving}
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>

      {/* Account Deletion Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setShowDeleteModal(false)}
      >
        <View style={StyleSheet.absoluteFill} className="items-center justify-center z-50">
          <Pressable
            style={StyleSheet.absoluteFill}
            className="bg-black/50"
            onPress={() => !deleting && setShowDeleteModal(false)}
          />

          <View className="bg-white rounded-3xl w-[90%] max-w-[360px] p-6 shadow-2xl z-10">
            <View className="w-12 h-12 rounded-full bg-red-100 items-center justify-center self-center mb-3">
              <AlertTriangle size={24} color="#dc2626" />
            </View>

            <Text className="text-xl font-black text-text-primary text-center mb-1">
              Delete Account?
            </Text>
            <Text className="text-xs font-semibold text-red-500 text-center mb-4">
              This action cannot be undone
            </Text>

            <View className="bg-red-50/70 rounded-2xl p-3.5 mb-4 border border-red-100">
              <Text className="text-xs leading-5 text-text-secondary font-medium mb-1">
                • Your profile, phone number, saved addresses, carts, and notifications will be permanently deleted.
              </Text>
              <Text className="text-xs leading-5 text-text-secondary font-medium">
                • Completed orders and invoices will be anonymized and retained solely for statutory accounting and tax compliance.
              </Text>
            </View>

            <View className="mb-4">
              <Input
                label="Enter Password to Confirm"
                value={deletePassword}
                onChangeText={(val) => {
                  setDeletePassword(val);
                  if (deleteError) setDeleteError('');
                }}
                placeholder="Account password"
                secureTextEntry
                leftIcon={<Lock size={16} color="#94a3b8" />}
                containerStyle={{ marginBottom: 0 }}
              />
              {deleteError ? (
                <Text className="text-xs text-red-500 font-medium mt-1.5 ml-1">
                  {deleteError}
                </Text>
              ) : null}
            </View>

            <View className="flex-row gap-3 mt-1">
              <Pressable
                onPress={() => {
                  if (!deleting) {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteError('');
                  }
                }}
                disabled={deleting}
                className="flex-1 py-3.5 rounded-xl bg-surface-50 items-center justify-center border border-border-light active:bg-surface-100"
              >
                <Text className="text-sm font-bold text-text-secondary">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleDeleteAccount}
                disabled={deleting || !deletePassword.trim()}
                className={`flex-1 py-3.5 rounded-xl items-center justify-center bg-red-600 active:bg-red-700 ${
                  deleting || !deletePassword.trim() ? 'opacity-60' : ''
                }`}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-sm font-bold text-white">Delete Forever</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
