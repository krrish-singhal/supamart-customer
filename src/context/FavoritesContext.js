import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { AuthContext } from './AuthContext';

const FavoritesContext = createContext();

export function FavoritesProvider({ children }) {
  const { token, userProfile } = useContext(AuthContext);
  const [favoriteIds, setFavoriteIds] = useState([]);

  useEffect(() => {
    if (token && userProfile) {
      setFavoriteIds(userProfile.favoriteProductIds || []);
    } else {
      setFavoriteIds([]);
    }
  }, [token, userProfile]);

  const isFavorite = useCallback((productId) => favoriteIds.includes(productId), [favoriteIds]);

  const toggleFavorite = useCallback(async (productId) => {
    if (!userProfile?.id) return;
    const wasFavorite = favoriteIds.includes(productId);
    const action = wasFavorite ? 'remove' : 'add';
    const prev = favoriteIds;
    const next = wasFavorite ? favoriteIds.filter((id) => id !== productId) : [...favoriteIds, productId];
    setFavoriteIds(next);
    try {
      await apiClient.patch(`/users/${userProfile.id}/favorites`, { productId, action });
      Toast.show({ type: 'success', text1: wasFavorite ? 'Removed from favorites' : 'Added to favorites' });
    } catch {
      setFavoriteIds(prev);
    }
  }, [favoriteIds, userProfile]);

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);
