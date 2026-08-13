import React from 'react';
import { Pressable } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useFavorites } from '../../context/FavoritesContext';

export default function FavoriteButton({ productId, size = 16, style }) {
  const favorites = useFavorites();
  const active = favorites?.isFavorite?.(productId) ?? false;
  return (
    <Pressable
      onPress={() => favorites?.toggleFavorite?.(productId)}
      hitSlop={8}
      style={[{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Heart size={size} color={active ? '#ef4444' : '#94a3b8'} fill={active ? '#ef4444' : 'transparent'} />
    </Pressable>
  );
}
