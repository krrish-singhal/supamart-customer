import React from 'react';
import { View, Pressable } from 'react-native';

export default function Card({ children, className = '', onPress, elevation = 'soft', ...props }) {
  const Component = onPress ? Pressable : View;
  
  const shadows = {
    none: '',
    sm: 'shadow-sm',
    soft: 'shadow-soft',
    md: 'shadow-md'
  };

  return (
    <Component 
      onPress={onPress}
      className={`bg-white rounded-3xl p-5 border border-border-light ${shadows[elevation]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
