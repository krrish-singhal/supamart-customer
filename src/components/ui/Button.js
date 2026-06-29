import React from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  disabled = false, 
  className = '',
  icon = null,
  fullWidth = true
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handlePressIn = () => { scale.value = withSpring(0.96); };
  const handlePressOut = () => { scale.value = withSpring(1); };

  const variants = {
    primary: 'bg-primary-600 border border-primary-600',
    secondary: 'bg-primary-50 border border-primary-100',
    outline: 'bg-transparent border border-border',
    ghost: 'bg-transparent border-transparent',
    danger: 'bg-red-500 border border-red-500'
  };

  const textVariants = {
    primary: 'text-white',
    secondary: 'text-primary-700',
    outline: 'text-text-primary',
    ghost: 'text-text-primary',
    danger: 'text-white'
  };

  const sizes = {
    sm: 'h-10 px-4 rounded-xl',
    md: 'h-14 px-6 rounded-2xl',
    lg: 'h-16 px-8 rounded-2xl'
  };

  const textSizes = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-bold',
    lg: 'text-lg font-bold'
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      className={`flex-row items-center justify-center ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50' : ''} ${fullWidth ? 'w-full' : 'self-start'} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : '#16a34a'} />
      ) : (
        <>
          {icon && <React.Fragment>{icon}</React.Fragment>}
          <Text className={`${textVariants[variant]} ${textSizes[size]} ${icon ? 'ml-2' : ''}`}>
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
