import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
} from 'react-native';

export default function OTPInput({
  length = 6,
  value = '',
  onChange,
  error = false,
}) {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  return (
    <View className="mb-6">
      <Pressable
        onPress={handlePress}
        className="flex-row justify-between w-full"
      >
        {Array.from({ length }).map((_, index) => {
          const char = value[index] || '';
          const isCurrentFocus =
            isFocused && value.length === index;

          const isFilled = char.length > 0;

          return (
            <View
              key={index}
              className={`w-12 h-14 rounded-2xl border items-center justify-center ${
                error
                  ? 'border-red-400 bg-red-50'
                  : isCurrentFocus
                  ? 'border-primary-500 bg-white'
                  : isFilled
                  ? 'border-primary-200 bg-primary-50'
                  : 'border-border bg-surface-100'
              }`}
            >
              <Text className="text-2xl font-bold text-text-primary">
                {char}
              </Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus
        caretHidden
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="absolute w-full h-full opacity-0"
      />
    </View>
  );
}