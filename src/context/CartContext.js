import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { AuthContext } from './AuthContext';
import { isProductUnavailable } from '../utils/productAvailability';

const CartContext = createContext();

export function CartProvider({ children }) {
  const { token } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  const [couponCode, setCouponCode] = useState(null);
  const [couponDetails, setCouponDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const lastLoadedAtRef = useRef(0);
  const SILENT_REFRESH_THROTTLE_MS = 15_000;

  const computeTotals = (cartItems) => {
    const sub = cartItems.reduce((acc, i) => acc + i.price * i.qty, 0);
    const rounded = Number(sub.toFixed(2));
    setSubtotal(rounded);
    setTotal(rounded);
  };

  const loadCart = useCallback(async (silent = false, { force = false } = {}) => {
    // 1. If not logged in, restore from local cache instantly
    if (!token) {
      try {
        const local = await AsyncStorage.getItem('localCart');
        if (local) {
          const parsed = JSON.parse(local);
          setItems(parsed);
          computeTotals(parsed);
        }
      } catch {
        // ignore
      }
      return;
    }

    if (silent && !force && Date.now() - lastLoadedAtRef.current < SILENT_REFRESH_THROTTLE_MS) {
      return;
    }
    if (!silent) setLoading(true);
    try {
      const { data } = await apiClient.get('/cart', { __skipErrorToast: true });
      lastLoadedAtRef.current = Date.now();
      const serverItems = data.items || [];
      setItems(serverItems);
      computeTotals(serverItems);
      setDiscount(data.discount ?? 0);
      setTotal(data.total ?? 0);
      setCouponCode(data.couponCode ?? null);
      setCouponDetails(data.couponDetails ?? null);
      await AsyncStorage.setItem('localCart', JSON.stringify(serverItems));
      if (data.removedCount > 0) {
        Toast.show({
          type: 'info',
          text1: `${data.removedCount} item${data.removedCount > 1 ? 's' : ''} removed from cart`,
          text2: 'No longer available.',
        });
      }
    } catch {
      // Non-fatal: fall back to local cart
      try {
        const local = await AsyncStorage.getItem('localCart');
        if (local) {
          const parsed = JSON.parse(local);
          setItems(parsed);
          computeTotals(parsed);
        }
      } catch {
        // ignore
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadCart();
  }, [token, loadCart]);

  const putCart = async (newItems) => {
    // Always persist to local cache first so user never loses items
    try {
      await AsyncStorage.setItem('localCart', JSON.stringify(newItems));
    } catch {
      // ignore
    }

    // If not authenticated, do not make backend request (prevents 401 error toast)
    if (!token) return;

    try {
      await apiClient.put(
        '/cart',
        {
          items: newItems.map(({ productId, variantId, qty }) => ({
            productId,
            variantId: variantId || 'default',
            qty,
          })),
        },
        { __skipErrorToast: true }
      );
    } catch (err) {
      // Silent catch on session/network hiccup — local cart remains intact
      console.warn('Backend cart sync note:', err.message);
      if (err.response?.status === 409) {
        try {
          const { data } = await apiClient.get('/cart', { __skipErrorToast: true });
          const serverItems = data.items || [];
          setItems(serverItems);
          computeTotals(serverItems);
          await AsyncStorage.setItem('localCart', JSON.stringify(serverItems));
        } catch {
          // Keep the local cache if the follow-up refresh is also unavailable.
        }
        Toast.show({ type: 'error', text1: 'Item is out of stock or unavailable' });
      }
    }
  };

  const addItem = async (product, variant) => {
    if (isProductUnavailable(product, variant)) {
      Toast.show({ type: 'error', text1: 'This item is out of stock' });
      return;
    }
    const productId = product.id;
    const variantId = variant?.id || 'default';
    const price = variant?.offerPrice ?? variant?.price ?? product?.price ?? 0;

    const existingIdx = items.findIndex(
      (i) => i.productId === productId && i.variantId === variantId
    );

    let newItems;
    if (existingIdx >= 0) {
      newItems = items.map((i, idx) =>
        idx === existingIdx ? { ...i, qty: i.qty + 1 } : i
      );
      Toast.show({ type: 'success', text1: 'Quantity updated' });
    } else {
      newItems = [
        ...items,
        {
          productId,
          variantId,
          qty: 1,
          name: product.name,
          variantLabel: variant?.label || '1 Unit',
          price,
          images: product.images,
          availability: product.availability || 'AVAILABLE',
          isAvailableToday: product.isAvailableToday !== false,
          variantAvailability: variant?.availability || 'AVAILABLE',
          stock: variant?.stock,
        },
      ];
      Toast.show({ type: 'success', text1: 'Added to cart' });
    }

    setItems(newItems);
    computeTotals(newItems);
    await putCart(newItems);
  };

  const removeItem = async (productId, variantId) => {
    const newItems = items.filter(
      (i) => !(i.productId === productId && i.variantId === variantId)
    );

    setItems(newItems);
    computeTotals(newItems);
    Toast.show({ type: 'success', text1: 'Removed from cart' });
    await putCart(newItems);
  };

  const updateQty = async (productId, variantId, delta) => {
    const item = items.find(
      (i) => i.productId === productId && i.variantId === variantId
    );
    if (!item) return;
    if (delta > 0 && (
      (item.availability && item.availability !== 'AVAILABLE') ||
      item.isAvailableToday === false ||
      (item.variantAvailability && item.variantAvailability !== 'AVAILABLE') ||
      (item.stock != null && item.qty + delta > item.stock)
    )) {
      Toast.show({ type: 'error', text1: 'This item is out of stock' });
      return;
    }
    if (item.qty + delta <= 0) return removeItem(productId, variantId);

    const newItems = items.map((i) =>
      i.productId === productId && i.variantId === variantId
        ? { ...i, qty: i.qty + delta }
        : i
    );

    setItems(newItems);
    computeTotals(newItems);
    Toast.show({ type: 'success', text1: 'Quantity updated' });
    await putCart(newItems);
  };

  const clearCart = async () => {
    const prevItems = [...items];
    setItems([]);
    setSubtotal(0);
    setDiscount(0);
    setTotal(0);
    setCouponCode(null);
    setCouponDetails(null);
    try {
      await apiClient.delete('/cart');
    } catch {
      setItems(prevItems);
      computeTotals(prevItems);
    }
  };

  const applyCoupon = async (code) => {
    const cleanCode = code ? code.trim().toUpperCase() : '';
    if (!cleanCode) {
      Toast.show({ type: 'error', text1: 'Please enter a coupon code' });
      return;
    }

    try {
      // Validate coupon with backend (supports both authenticated & guest sessions)
      const { data: valData } = await apiClient.post('/offers/validate', {
        code: cleanCode,
        subtotal,
        items,
      });

      if (token) {
        await apiClient.patch('/cart/coupon', { code: cleanCode });
        await loadCart(false, { force: true });
        Toast.show({
          type: 'success',
          text1: 'Coupon applied',
          text2: `Saved ₹${valData.evaluatedDiscount}!`,
        });
        return;
      }

      // Local/guest cart mode
      const disc = valData.evaluatedDiscount || 0;
      setCouponCode(cleanCode);
      setCouponDetails(valData);
      setDiscount(disc);
      setTotal(Math.max(0, Number((subtotal - disc).toFixed(2))));
      Toast.show({
        type: 'success',
        text1: 'Coupon applied',
        text2: `Saved ₹${disc}!`,
      });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Could not apply coupon';
      Toast.show({ type: 'error', text1: msg });
      throw err;
    }
  };

  const removeCoupon = async () => {
    if (token) {
      try {
        await apiClient.patch('/cart/coupon', { code: null });
        await loadCart();
      } catch {}
    }
    setCouponCode(null);
    setCouponDetails(null);
    setDiscount(0);
    setTotal(subtotal);
    Toast.show({ type: 'success', text1: 'Coupon removed' });
  };

  const getQty = useCallback(
    (productId, variantId) => {
      const item = items.find(
        (i) => i.productId === productId && i.variantId === variantId
      );
      return item?.qty ?? 0;
    },
    [items]
  );

  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        subtotal,
        discount,
        total,
        couponCode,
        couponDetails,
        loading,
        itemCount,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        applyCoupon,
        removeCoupon,
        getQty,
        loadCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
