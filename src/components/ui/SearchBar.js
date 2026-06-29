import React from 'react';
import { View, TextInput } from 'react-native';
import { Search } from 'lucide-react-native';

export default function SearchBar({ placeholder = "Search for anything...", value, onChangeText, className = '' }) {
  return (
    <View className={`flex-row items-center bg-surface-100 rounded-2xl h-12 px-4 border border-border-light shadow-sm ${className}`}>
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
