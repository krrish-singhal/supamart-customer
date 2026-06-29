import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

export default function Dialog({ visible, title, message, onCancel, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel', destructive = false }) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={StyleSheet.absoluteFill} className="items-center justify-center z-50">
        <Pressable style={StyleSheet.absoluteFill} className="bg-black/40" onPress={onCancel} />
        
        <View
          className="bg-white rounded-[24px] w-[85%] max-w-[340px] p-6 shadow-xl z-10"
        >
          <Text className="text-[20px] leading-[28px] font-black text-text-primary mb-2 text-center">
            {title}
          </Text>
          <Text className="text-[14px] leading-[20px] font-medium text-text-secondary text-center mb-6">
            {message}
          </Text>

          <View className="flex-row gap-3">
            <Pressable
              onPress={onCancel}
              className="flex-1 py-3.5 rounded-xl bg-surface-50 items-center justify-center border border-border-light active:bg-surface-100"
            >
              <Text className="text-[14px] font-bold text-text-secondary">{cancelText}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              className={`flex-1 py-3.5 rounded-xl items-center justify-center ${destructive ? 'bg-red-500' : 'bg-primary-600'} active:opacity-80`}
            >
              <Text className="text-[14px] font-bold text-white">{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
