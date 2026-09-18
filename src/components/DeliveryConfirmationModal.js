import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Star, AlertCircle, CheckCircle, X } from 'lucide-react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../services/api';
import Toast from 'react-native-toast-message';

export default function DeliveryConfirmationModal() {
  const { userProfile, token } = useContext(AuthContext);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [viewState, setViewState] = useState('QUESTION'); // QUESTION, RATING

  useEffect(() => {
    // Only customers should see this
    if (!token || userProfile?.role !== 'CUSTOMER') return;

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userProfile.id),
      where('status', '==', 'PENDING_CONFIRMATION')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setPendingOrder({ id: doc.id, ...doc.data() });
        setViewState('QUESTION');
        setRating(0);
      } else {
        setPendingOrder(null);
      }
    });

    return () => unsubscribe();
  }, [token, userProfile?.id, userProfile?.role]);

  const submitRating = async (selectedRating) => {
    if (selectedRating === 0) {
      Toast.show({ type: 'error', text1: 'Please provide a rating' });
      return;
    }
    setSubmitting(true);
    
    const orderId = pendingOrder.id;
    setPendingOrder(null); // Close instantly for better UX
    
    try {
      await apiClient.patch(`/orders/${orderId}/confirm-delivery`, { rating: selectedRating });
      Toast.show({ type: 'success', text1: 'Thank you for confirming!' });
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Failed to confirm delivery' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = () => submitRating(rating);

  const handleDispute = async () => {
    setSubmitting(true);
    const orderId = pendingOrder.id;
    setPendingOrder(null); // Close instantly for better UX
    
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
        // Allow Android back button to dismiss if they are stuck
        setPendingOrder(null);
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setPendingOrder(null)}
          >
            <X size={24} color="#94a3b8" />
          </TouchableOpacity>
          
          {viewState === 'QUESTION' ? (
            <>
              <View style={styles.iconContainer}>
                <AlertCircle size={40} color="#f59e0b" />
              </View>
              <Text style={styles.title}>Delivery Verification</Text>
              <Text style={styles.subtitle}>
                Your delivery partner has marked Order #{pendingOrder.orderNo} as delivered. Did you receive it?
              </Text>
              
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  onPress={handleDispute}
                  disabled={submitting}
                  style={[styles.button, styles.buttonFlex, styles.btnDispute]}
                >
                  <Text style={styles.btnDisputeText}>No, I didn't</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setViewState('RATING')}
                  disabled={submitting}
                  style={[styles.button, styles.buttonFlex, styles.btnConfirm]}
                >
                  <Text style={styles.btnConfirmText}>Yes, I got it</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.iconContainer}>
                <CheckCircle size={40} color="#16a34a" />
              </View>
              <Text style={styles.title}>Rate your delivery</Text>
              <Text style={styles.subtitle}>How was your experience?</Text>
              
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity 
                    key={star} 
                    onPress={() => {
                      setRating(star);
                      // Since state updates are async, we pass the selected star directly to a new submit function
                      submitRating(star);
                    }}
                  >
                    <Star 
                      size={40} 
                      color={rating >= star ? "#eab308" : "#d1d5db"} 
                      fill={rating >= star ? "#eab308" : "transparent"} 
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                onPress={handleConfirm}
                disabled={submitting}
                style={[styles.button, styles.btnConfirm, { width: '100%' }]}
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.btnConfirmText}>Submit & Confirm</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  }
});
