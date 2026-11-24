import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { MapPin, ShieldCheck, Clock, Navigation } from './icons';
import { fonts } from '../theme/typography';

export default function LocationDisclosureModal({
  visible,
  onAccept,
  onDecline,
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header Icon */}
          <View style={styles.iconCircle}>
            <MapPin size={32} color="#059669" />
          </View>

          <Text style={styles.title}>Background Location Access</Text>
          <Text style={styles.subtitle}>
            Delivery Partner Operational Requirement
          </Text>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            <Text style={styles.mainDescription}>
              MS Traders collects precise location data to enable real-time order tracking
              for customers and store dispatchers during active deliveries,{' '}
              <Text style={styles.boldText}>
                even when the application is closed, minimized, or your device screen is locked.
              </Text>
            </Text>

            <View style={styles.bulletItem}>
              <View style={styles.bulletIcon}>
                <Navigation size={18} color="#059669" />
              </View>
              <View style={styles.bulletContent}>
                <Text style={styles.bulletTitle}>Live Customer Route Sharing</Text>
                <Text style={styles.bulletText}>
                  Your live GPS coordinates are shared exclusively with the customer awaiting
                  their order to display real-time arrival estimates and map updates.
                </Text>
              </View>
            </View>

            <View style={styles.bulletItem}>
              <View style={styles.bulletIcon}>
                <Clock size={18} color="#059669" />
              </View>
              <View style={styles.bulletContent}>
                <Text style={styles.bulletTitle}>Active Delivery Lifecycle Only</Text>
                <Text style={styles.bulletText}>
                  Tracking begins only when you explicitly start an assigned delivery, and
                  automatically ceases as soon as the order is marked Delivered, Cancelled, or
                  when you go off duty.
                </Text>
              </View>
            </View>

            <View style={styles.bulletItem}>
              <View style={styles.bulletIcon}>
                <ShieldCheck size={18} color="#059669" />
              </View>
              <View style={styles.bulletContent}>
                <Text style={styles.bulletTitle}>Privacy & Security Protected</Text>
                <Text style={styles.bulletText}>
                  We only store your latest real-time coordinate fix. We do not archive historical
                  routes or sell your location data to advertisers or third parties.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <Pressable
              style={({ pressed }) => [styles.declineButton, pressed && styles.buttonPressed]}
              onPress={onDecline}
            >
              <Text style={styles.declineText}>Not Now</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.acceptButton, pressed && styles.buttonPressed]}
              onPress={onAccept}
            >
              <Text style={styles.acceptText}>Accept & Continue</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts?.semiBold || 'System',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: fonts?.medium || 'System',
    color: '#059669',
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollArea: {
    width: '100%',
    marginBottom: 20,
  },
  mainDescription: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: fonts?.regular || 'System',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 18,
  },
  boldText: {
    fontFamily: fonts?.bold || 'System',
    color: '#111827',
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  bulletIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  bulletContent: {
    flex: 1,
  },
  bulletTitle: {
    fontSize: 14,
    fontFamily: fonts?.semiBold || 'System',
    color: '#111827',
    marginBottom: 2,
  },
  bulletText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts?.regular || 'System',
    color: '#6B7280',
  },
  actionContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  declineText: {
    fontSize: 14,
    fontFamily: fonts?.medium || 'System',
    color: '#4B5563',
  },
  acceptButton: {
    flex: 1.5,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    fontSize: 14,
    fontFamily: fonts?.semiBold || 'System',
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.85,
  },
});

