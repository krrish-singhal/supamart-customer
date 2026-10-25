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
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Camera,
  User,
  Mail,
  Phone,
  Lock,
} from '../components/icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { optimizeCloudinaryUrl } from '../utils/cloudinaryImage';
import { fonts } from '../theme/typography';

export default function EditProfileScreen({ navigation }) {
  const { userProfile: user, loadToken } = useContext(AuthContext);

  const [name, setName] = useState(user?.name || '');
  const [mobile, setMobile] = useState(user?.mobile || user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [localPhotoUri, setLocalPhotoUri] = useState(null);

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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityLabel="Go back"
          style={styles.backBtn}
        >
          <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Avatar Section */}
          <Animated.View entering={FadeInDown.duration(320)} style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              {photoUri ? (
                <Image
                  source={{ uri: optimizeCloudinaryUrl(photoUri, 200) }}
                  style={styles.avatarImg}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>{initial}</Text>
                </View>
              )}

              <Pressable
                onPress={pickAndUploadPhoto}
                disabled={uploadingPhoto}
                style={styles.cameraBtn}
                accessibilityLabel="Change profile picture"
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Camera size={16} color="#ffffff" strokeWidth={2.2} />
                )}
              </Pressable>
            </View>

            <Text style={styles.changePhotoText}>Tap camera to update photo</Text>
          </Animated.View>

          {/* Card: Personal Details */}
          <Animated.View
            entering={FadeInDown.duration(320).delay(60)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Personal Details</Text>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <View style={styles.inputBox}>
                <User size={18} color="#047857" style={{ marginRight: 10 }} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your full name"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="words"
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Mobile Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mobile Number</Text>
              <View style={styles.inputBox}>
                <Phone size={18} color="#047857" style={{ marginRight: 10 }} />
                <TextInput
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Email (Read only) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.inputBox, styles.inputBoxDisabled]}>
                <Mail size={18} color="#94a3b8" style={{ marginRight: 10 }} />
                <Text style={styles.disabledEmailText}>
                  {user?.email || 'No email associated'}
                </Text>
                <Lock size={15} color="#94a3b8" />
              </View>
              <Text style={styles.helperText}>
                Used for sign-in and cannot be changed here
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Save button */}
        <View style={styles.bottomBar}>
          <Pressable
            onPress={save}
            disabled={saving || !isValid}
            style={[
              styles.saveBtn,
              (!isValid || saving) && styles.saveBtnDisabled,
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6f4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 4,
    marginRight: 6,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 18,
  },
  avatarWrapper: {
    position: 'relative',
    width: 96,
    height: 96,
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontFamily: fonts.bold,
    fontSize: 38,
    color: '#ffffff',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#047857',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  changePhotoText: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#edf2ed',
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15.5,
    color: '#0f172a',
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: '#475569',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  inputBoxDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#f1f5f9',
  },
  textInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: '#0f172a',
    padding: 0,
  },
  disabledEmailText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: '#64748b',
  },
  helperText: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: '#94a3b8',
    marginTop: 4,
    marginLeft: 2,
  },
  bottomBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15.5,
    color: '#ffffff',
  },
});
