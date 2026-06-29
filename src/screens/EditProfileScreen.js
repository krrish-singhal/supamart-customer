import { useState, useContext, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StatusBar, Platform, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, User, Mail, Calendar, ChevronDown } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { AuthContext } from '../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Header, Input, Button, Card, Avatar } from '../components/ui';

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

export default function EditProfileScreen({ navigation }) {
  const { userProfile: user, loadToken } = useContext(AuthContext);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [localPhotoUri, setLocalPhotoUri] = useState(null);

  const isValid = name.trim().length >= 2;

  const save = useCallback(async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const payload = { name: name.trim() };
      if (email.trim()) payload.email = email.trim();
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
  }, [name, email, gender, dateOfBirth, user?.id, isValid, saving, loadToken, navigation]);

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
                  source={{ uri: photoUri }}
                  style={{ width: 96, height: 96, borderRadius: 48 }}
                  contentFit="cover"
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

              {/* Phone — read-only */}
              <View className="mb-4">
                <Text className="text-xs font-black text-text-tertiary uppercase tracking-widest mb-2">
                  Mobile Number
                </Text>
                <View
                  className="flex-row items-center bg-surface-100 border border-border-light rounded-2xl px-4"
                  style={{ height: 50 }}
                >
                  <Text className="text-sm font-semibold text-text-tertiary flex-1">
                    +91 {user?.mobile}
                  </Text>
                  <View className="bg-surface-200 px-2 py-1 rounded-lg">
                    <Text className="text-xs font-bold text-text-tertiary">Verified</Text>
                  </View>
                </View>
                <Text className="text-xs font-medium text-text-tertiary mt-1.5 ml-1">
                  Phone number cannot be changed
                </Text>
              </View>

              {/* Email */}
              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={16} color="#94a3b8" />}
                containerStyle={{ marginBottom: 0 }}
              />
            </Card>

            <Card elevation="sm" className="border-0 bg-white p-5 mb-4">
              {/* Gender */}
              <Text className="text-xs font-black text-text-tertiary uppercase tracking-widest mb-2">
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
              <Text className="text-xs font-black text-text-tertiary uppercase tracking-widest mb-2">
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
    </SafeAreaView>
  );
}
