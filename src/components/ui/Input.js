import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';

export default function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  style,
  containerStyle,
  inputStyle,
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      
      <View 
        style={[
          styles.container,
          isFocused && styles.focusedContainer,
          error && styles.errorContainer,
          style
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        
        <TextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor="#94a3b8"
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        
        {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
      </View>
      
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 6,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
  },
  focusedContainer: {
    borderColor: '#22c55e',
    backgroundColor: '#ffffff',
  },
  errorContainer: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
    paddingVertical: 0,
    height: '100%',
  },
  leftIcon: {
    marginRight: 12,
  },
  rightIcon: {
    marginLeft: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ef4444',
    marginTop: 6,
    marginLeft: 4,
  }
});