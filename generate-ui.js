const fs = require('fs');
const path = require('path');

const uiDir = path.join(__dirname, 'src', 'components', 'ui');
fs.mkdirSync(uiDir, { recursive: true });

const components = {
  'Button.js': `import React from 'react';
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
      className={\`flex-row items-center justify-center \${variants[variant]} \${sizes[size]} \${disabled ? 'opacity-50' : ''} \${fullWidth ? 'w-full' : 'self-start'} \${className}\`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : '#16a34a'} />
      ) : (
        <>
          {icon && <React.Fragment>{icon}</React.Fragment>}
          <Text className={\`\${textVariants[variant]} \${textSizes[size]} \${icon ? 'ml-2' : ''}\`}>
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
`,
  'Input.js': `import React, { useState } from 'react';
import { View, TextInput, Text } from 'react-native';

export default function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  containerClassName = '',
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={\`mb-4 \${containerClassName}\`}>
      {label && <Text className="text-sm font-medium text-text-secondary mb-1.5">{label}</Text>}
      <View 
        className={\`flex-row items-center bg-surface-100 border rounded-2xl h-14 px-4 transition-colors \${
          error ? 'border-red-400 bg-red-50' : 
          isFocused ? 'border-primary-500 bg-white shadow-sm' : 'border-border'
        } \${className}\`}
      >
        {leftIcon && <View className="mr-3">{leftIcon}</View>}
        <TextInput
          className="flex-1 text-base text-text-primary font-medium h-full"
          placeholderTextColor="#a3a3a3"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {rightIcon && <View className="ml-3">{rightIcon}</View>}
      </View>
      {error && <Text className="text-xs font-medium text-red-500 mt-1.5 ml-1">{error}</Text>}
    </View>
  );
}
`,
  'Card.js': `import React from 'react';
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
      className={\`bg-white rounded-3xl p-5 border border-border-light \${shadows[elevation]} \${className}\`}
      {...props}
    >
      {children}
    </Component>
  );
}
`,
  'OTPInput.js': `import React, { useRef, useState, useEffect } from 'react';
import { View, TextInput, Pressable, Keyboard } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';

export default function OTPInput({ length = 6, value, onChange, error }) {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  
  const handlePress = () => {
    inputRef.current?.focus();
  };

  return (
    <View className="mb-6">
      <Pressable onPress={handlePress} className="flex-row justify-between w-full">
        {Array.from({ length }).map((_, index) => {
          const char = value[index] || '';
          const isCurrentFocus = isFocused && value.length === index;
          const isFilled = char !== '';
          
          return (
            <View 
              key={index} 
              className={\`w-12 h-14 rounded-2xl border items-center justify-center \${
                error ? 'border-red-400 bg-red-50' :
                isCurrentFocus ? 'border-primary-500 bg-white shadow-sm' : 
                isFilled ? 'border-primary-200 bg-primary-50' : 'border-border bg-surface-100'
              }\`}
            >
              <Animated.Text className="text-2xl font-bold text-text-primary">
                {char}
              </Animated.Text>
            </View>
          );
        })}
      </Pressable>
      
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        maxLength={length}
        keyboardType="number-pad"
        className="absolute w-full h-full opacity-0"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoFocus
      />
    </View>
  );
}
`,
  'Header.js': `import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Header({ title, showBack = true, rightComponent, transparent = false }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View 
      className={\`flex-row items-center justify-between px-4 pb-3 \${transparent ? 'bg-transparent' : 'bg-white border-b border-border-light'}\`}
      style={{ paddingTop: Math.max(insets.top, 16) }}
    >
      <View className="w-10 items-start">
        {showBack && navigation.canGoBack() && (
          <Pressable 
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-surface-100 items-center justify-center active:bg-surface-200"
          >
            <ChevronLeft size={24} color="#171717" />
          </Pressable>
        )}
      </View>
      
      <View className="flex-1 items-center">
        {title && <Text className="text-lg font-bold text-text-primary" numberOfLines={1}>{title}</Text>}
      </View>

      <View className="w-10 items-end">
        {rightComponent}
      </View>
    </View>
  );
}
`,
  'Badge.js': `import React from 'react';
import { View, Text } from 'react-native';

export default function Badge({ count, className = '' }) {
  if (!count || count <= 0) return null;
  
  return (
    <View className={\`absolute -top-2 -right-2 bg-red-500 border-2 border-white rounded-full min-w-[20px] h-5 items-center justify-center px-1 z-10 \${className}\`}>
      <Text className="text-[10px] font-bold text-white">
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}
`,
  'StatusChip.js': `import React from 'react';
import { View, Text } from 'react-native';

export default function StatusChip({ status, label }) {
  const config = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    processing: { bg: 'bg-blue-100', text: 'text-blue-700' },
    ready: { bg: 'bg-purple-100', text: 'text-purple-700' },
    out_for_delivery: { bg: 'bg-orange-100', text: 'text-orange-700' },
    delivered: { bg: 'bg-green-100', text: 'text-green-700' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
  };

  const style = config[status?.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-700' };

  return (
    <View className={\`px-3 py-1 rounded-full \${style.bg} self-start\`}>
      <Text className={\`text-xs font-bold uppercase tracking-wider \${style.text}\`}>
        {label || status}
      </Text>
    </View>
  );
}
`,
  'Avatar.js': `import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { User } from 'lucide-react-native';

export default function Avatar({ src, name, size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-8 h-8 rounded-full',
    md: 'w-12 h-12 rounded-full',
    lg: 'w-16 h-16 rounded-full',
    xl: 'w-24 h-24 rounded-full',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };

  const initial = name ? name.charAt(0).toUpperCase() : '';

  return (
    <View className={\`bg-primary-100 items-center justify-center overflow-hidden \${sizes[size]} \${className}\`}>
      {src ? (
        <Image source={{ uri: src }} className="w-full h-full" contentFit="cover" />
      ) : initial ? (
        <Text className={\`font-bold text-primary-700 \${textSizes[size]}\`}>{initial}</Text>
      ) : (
        <User size={size === 'sm' ? 16 : size === 'xl' ? 40 : 24} color="#16a34a" />
      )}
    </View>
  );
}
`,
  'SearchBar.js': `import React from 'react';
import { View, TextInput } from 'react-native';
import { Search } from 'lucide-react-native';

export default function SearchBar({ placeholder = "Search for anything...", value, onChangeText, className = '' }) {
  return (
    <View className={\`flex-row items-center bg-surface-100 rounded-2xl h-12 px-4 border border-border-light shadow-sm \${className}\`}>
      <Search size={20} color="#737373" className="mr-2" />
      <TextInput
        className="flex-1 text-base text-text-primary font-medium h-full"
        placeholder={placeholder}
        placeholderTextColor="#a3a3a3"
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}
`,
  'SectionHeader.js': `import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

export default function SectionHeader({ title, subtitle, actionText, onAction, className = '' }) {
  return (
    <View className={\`flex-row items-end justify-between mb-4 \${className}\`}>
      <View>
        <Text className="text-xl font-bold text-text-primary">{title}</Text>
        {subtitle && <Text className="text-sm text-text-secondary mt-0.5">{subtitle}</Text>}
      </View>
      {actionText && (
        <Pressable onPress={onAction} className="flex-row items-center active:opacity-70 pb-1">
          <Text className="text-sm font-bold text-primary-600 mr-0.5">{actionText}</Text>
          <ChevronRight size={16} color="#16a34a" />
        </Pressable>
      )}
    </View>
  );
}
`,
  'Loader.js': `import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

export default function Loader({ text, fullScreen = true }) {
  const content = (
    <View className="items-center justify-center p-4">
      <ActivityIndicator size="large" color="#16a34a" />
      {text && <Text className="mt-4 text-sm font-medium text-text-secondary">{text}</Text>}
    </View>
  );

  if (fullScreen) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-50">
        {content}
      </View>
    );
  }

  return content;
}
`,
  'Skeleton.js': `import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence } from 'react-native-reanimated';

export default function Skeleton({ width, height, borderRadius = 12, className = '' }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius }, animatedStyle]}
      className={\`bg-surface-300 \${className}\`}
    />
  );
}
`,
  'index.js': `export { default as Button } from './Button';
export { default as Input } from './Input';
export { default as OTPInput } from './OTPInput';
export { default as Card } from './Card';
export { default as Header } from './Header';
export { default as SectionHeader } from './SectionHeader';
export { default as Badge } from './Badge';
export { default as StatusChip } from './StatusChip';
export { default as Avatar } from './Avatar';
export { default as SearchBar } from './SearchBar';
export { default as Loader } from './Loader';
export { default as Skeleton } from './Skeleton';
`
};

for (const [filename, content] of Object.entries(components)) {
  fs.writeFileSync(path.join(uiDir, filename), content);
}
console.log('UI Components generated in customer/src/components/ui');

// Generate the tailwind.config.js for customer app
const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.js',
    './app.config.js',
    './src/**/*.{js,jsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          DEFAULT: '#16a34a',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          DEFAULT: '#ffffff',
        },
        text: {
          primary: '#0f172a',
          secondary: '#64748b',
          tertiary: '#94a3b8',
        },
        border: {
          light: '#f1f5f9',
          DEFAULT: '#e2e8f0',
          dark: '#cbd5e1',
        }
      },
      fontFamily: {
        sans: ['PlusJakartaSans-Regular', 'sans-serif'],
        medium: ['PlusJakartaSans-Medium', 'sans-serif'],
        semibold: ['PlusJakartaSans-SemiBold', 'sans-serif'],
        bold: ['PlusJakartaSans-Bold', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'soft': '0 8px 30px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
      }
    },
  },
  plugins: [],
};`;

fs.writeFileSync(path.join(__dirname, 'tailwind.config.js'), tailwindConfig);
console.log('customer/tailwind.config.js updated');

