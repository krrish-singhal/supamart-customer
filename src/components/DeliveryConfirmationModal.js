import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { AlertCircle, X } from './icons';
import { collection, query, where, onSnapshot } from '../services/reads';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../services/api';
import Toast from 'react-native-toast-message';
import OrderRatings from './OrderRatings';

export default function DeliveryConfirmationModal() {
  const { userProfile, token } = useContext(AuthContext);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewState, setViewState] = useState('QUESTION'); // 'QUESTION' | 'RATING'
  const [firebaseUid, setFirebaseUid] = useState(auth.currentUser?.uid || null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setFirebaseUid(u?.uid || null);
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    // Only customers with matching Firebase Auth credentials should query orders
    if (!token || userProfile?.role !== 'CUSTOMER' || !userProfile?.id) {
      setPendingOrder(null);
      return;
    }
    if (!firebaseUid || firebaseUid !== userProfile.id) {
      setPendingOrder(null);
      return;
    }

    const q = query(
      collection(db, 'orders', { pollInterval: 120000 }),
      where('userId', '==', userProfile.id),
      where('status', '==', 'PENDING_CONFIRMATION')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          setPendingOrder({ id: docSnap.id, ...docSnap.data() });
          setViewState('QUESTION');
        } else {
          setPendingOrder(null);
        }
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          console.warn('DeliveryConfirmationModal orders listener:', error.message || error);
        }
      }
    );

    return () => unsubscribe();
  }, [token, userProfile?.id, userProfile?.role, firebaseUid]);

  const handleDispute = async () => {
    if (!pendingOrder) return;
    setSubmitting(true);
    const orderId = pendingOrder.id;
    setPendingOrder(null);

    try {
      await apiClient.patch(`/orders/${orderId}/dispute-delivery`);
      Toast.show({ type: 'info', text1: 'Dispute submitted. We will contact you.' });
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Failed to submit dispute' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!pendingOrder) return null;

  return (
    <Modal 
      visible={true} 
      transparent 
      animationType="slide"
      onRequestClose={() => {
        setPendingOrder(null);
      }}
    >
      <View style={styles.overlay}>
        {viewState === 'QUESTION' ? (
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setPendingOrder(null)}
            >
              <X size={24} color="#94a3b8" />
            </TouchableOpacity>
            
            <View style={styles.iconContainer}>
              <AlertCircle size={40} color="#f59e0b" />
            </View>
            <Text style={styles.title}>Order Collected?</Text>
            <Text style={styles.subtitle}>
              Your delivery partner has marked Order #{pendingOrder.orderNo || pendingOrder.id?.slice(-4)} as delivered. Did you receive it?
            </Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                onPress={handleDispute}
                disabled={submitting}
                style={[styles.button, styles.buttonFlex, styles.btnDispute]}
              >
                <Text style={styles.btnDisputeText}>No, I did not</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setViewState('RATING')}
                disabled={submitting}
                style={[styles.button, styles.buttonFlex, styles.btnConfirm]}
              >
                <Text style={styles.btnConfirmText}>Yes, I got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.ratingCardContainer}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.ratingScrollContent}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              <OrderRatings
                order={pendingOrder}
                onDismiss={() => setPendingOrder(null)}
                inModal
              />
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  card: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonFlex: {
    flex: 1,
  },
  btnDispute: {
    backgroundColor: '#fee2e2',
  },
  btnDisputeText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
  btnConfirm: {
    backgroundColor: '#16a34a',
  },
  btnConfirmText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  ratingCardContainer: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#f6f8f6',
    borderWidth: 1,
    borderColor: '#edf2ed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  ratingScrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
});
