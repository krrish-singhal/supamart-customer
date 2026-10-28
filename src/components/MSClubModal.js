import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { X, Truck, Tag, Clock, ArrowRight } from './icons';
import Animated, { SlideInDown, SlideOutDown, FadeIn } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

export default function MSClubModal({ visible, onClose, onJoin }) {
  const insets = useSafeAreaInsets();

  const handleJoin = () => {
    if (onJoin) {
      onJoin();
    } else {
      Toast.show({
        type: 'success',
        text1: 'Welcome to MS Club!',
        text2: 'Free delivery and exclusive member discounts are now active.',
      });
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            justifyContent: 'flex-end',
          }}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              entering={SlideInDown.duration(340).springify().damping(18)}
              exiting={SlideOutDown.duration(220)}
              style={{
                backgroundColor: '#ffffff',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                overflow: 'hidden',
                maxHeight: '90%',
              }}
            >
              {/* Green Header Banner */}
              <View
                style={{
                  backgroundColor: '#047857',
                  paddingHorizontal: 22,
                  paddingTop: 20,
                  paddingBottom: 24,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Top Row: Membership Pill Badge + Close Button */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: '#f59e0b',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Inter-ExtraBold',
                        fontSize: 10.5,
                        fontWeight: 'normal',
                        color: '#78350f',
                        letterSpacing: 0.8,
                        textTransform: 'uppercase',
                      }}
                    >
                      MEMBERSHIP
                    </Text>
                  </View>

                  <Pressable
                    onPress={onClose}
                    hitSlop={10}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: 'rgba(255, 255, 255, 0.22)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={18} color="#ffffff" strokeWidth={2.6} />
                  </Pressable>
                </View>

                {/* Title & Subtitle */}
                <View style={{ maxWidth: '62%' }}>
                  <Text
                    style={{
                      fontFamily: 'Inter-ExtraBold',
                      fontSize: 32,
                      fontWeight: 'normal',
                      color: '#ffffff',
                      letterSpacing: -0.8,
                      marginBottom: 6,
                    }}
                  >
                    MS Club
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Inter-Regular',
                      fontSize: 14,
                      fontWeight: 'normal',
                      color: 'rgba(255, 255, 255, 0.9)',
                      lineHeight: 20,
                    }}
                  >
                    Save up to ₹150 every month on your groceries.
                  </Text>
                </View>

                {/* Overlapping Product Bundle Visual on Right */}
                <View
                  style={{
                    position: 'absolute',
                    right: 14,
                    bottom: 12,
                    width: 130,
                    height: 105,
                  }}
                >
                  {/* Rice bag */}
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      bottom: 0,
                      width: 60,
                      height: 60,
                      borderRadius: 12,
                      backgroundColor: '#ffffff',
                      padding: 4,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <Image
                      source={require('../../assets/Cleaned_Products/SSK Ponni Rice 1st.webp')}
                      style={{ width: '100%', height: '100%', borderRadius: 8 }}
                      contentFit="cover"
                    />
                  </View>

                  {/* Oil bottles */}
                  <View
                    style={{
                      position: 'absolute',
                      right: 18,
                      bottom: 22,
                      width: 62,
                      height: 62,
                      borderRadius: 12,
                      backgroundColor: '#ffffff',
                      padding: 4,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 4,
                      elevation: 4,
                    }}
                  >
                    <Image
                      source={require('../../assets/Cleaned_Products/Ruchi Gold Palm Oil.webp')}
                      style={{ width: '100%', height: '100%', borderRadius: 8 }}
                      contentFit="cover"
                    />
                  </View>

                  {/* Dairy item */}
                  <View
                    style={{
                      position: 'absolute',
                      right: 0,
                      bottom: 0,
                      width: 50,
                      height: 50,
                      borderRadius: 10,
                      backgroundColor: '#ffffff',
                      padding: 3,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 4,
                      elevation: 5,
                    }}
                  >
                    <Image
                      source={require('../../assets/categories/home/dairy-bread-eggs.webp')}
                      style={{ width: '100%', height: '100%', borderRadius: 7 }}
                      contentFit="cover"
                    />
                  </View>
                </View>
              </View>

              {/* White Body - Perks List */}
              <View style={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: 14 }}>
                {/* Perk 1: Free delivery */}
                <Animated.View
                  entering={FadeIn.delay(100)}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: '#ecfdf5',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    <Truck size={20} color="#059669" strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Inter-Bold', fontSize: 15, fontWeight: 'normal', color: '#0f172a' }}>
                      Free delivery, always
                    </Text>
                    <Text style={{ fontFamily: 'Inter-Regular', fontSize: 13, fontWeight: 'normal', color: '#64748b', marginTop: 2 }}>
                      No minimum order value
                    </Text>
                  </View>
                </Animated.View>

                {/* Perk 2: Extra 5% off */}
                <Animated.View
                  entering={FadeIn.delay(180)}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: '#fef3c7',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    <Tag size={20} color="#d97706" strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Inter-Bold', fontSize: 15, fontWeight: 'normal', color: '#0f172a' }}>
                      Extra 5% off bulk packs
                    </Text>
                    <Text style={{ fontFamily: 'Inter-Regular', fontSize: 13, fontWeight: 'normal', color: '#64748b', marginTop: 2 }}>
                      Atta, rice, oil and more
                    </Text>
                  </View>
                </Animated.View>

                {/* Perk 3: Early access */}
                <Animated.View
                  entering={FadeIn.delay(260)}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 22 }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: '#f3e8ff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    <Clock size={20} color="#7c3aed" strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Inter-Bold', fontSize: 15, fontWeight: 'normal', color: '#0f172a' }}>
                      Early access to deals
                    </Text>
                    <Text style={{ fontFamily: 'Inter-Regular', fontSize: 13, fontWeight: 'normal', color: '#64748b', marginTop: 2 }}>
                      Weekly offers, a day before everyone
                    </Text>
                  </View>
                </Animated.View>

                {/* Primary Button */}
                <Pressable
                  onPress={handleJoin}
                  style={{
                    backgroundColor: '#047857',
                    borderRadius: 14,
                    height: 52,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#047857',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                    marginBottom: 14,
                  }}
                >
                  <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, fontWeight: 'normal', color: '#ffffff', marginRight: 8 }}>
                    Join for ₹49 / month
                  </Text>
                  <ArrowRight size={18} color="#ffffff" strokeWidth={2.6} />
                </Pressable>

                {/* Secondary Button */}
                <Pressable
                  onPress={onClose}
                  hitSlop={8}
                  style={{
                    alignItems: 'center',
                    paddingVertical: 6,
                    marginBottom: Math.max(insets.bottom, 12),
                  }}
                >
                  <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 14, fontWeight: 'normal', color: '#334155' }}>
                    Maybe later
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
