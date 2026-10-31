import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { AuthContext } from './AuthContext';
import { isProductUnavailable } from '../utils/productAvailability';

const CartContext = createContext();
const normalizeVariantId = (variantId) => variantId || 'default';

export function CartProvider({ children }) {
  const { token } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const itemsRef = useRef([]);
  const cartRevisionRef = useRef(0);
  const cartSyncQueueRef = useRef(Promise.resolve());
  const cartSyncPendingRef = useRef(null);
  const cartSyncRunningRef = useRef(false);
  const cartHydrationTokenRef = useRef(token);
  const cartHydratedRef = useRef(false);
  const cartHydrationPromiseRef = useRef(null);
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  const [couponCode, setCouponCode] = useState(null);
  const [couponDetails, setCouponDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const lastLoadedAtRef = useRef(0);
  const SILENT_REFRESH_THROTTLE_MS = 15_000;

  const commitItems = (nextItems, { localChange = false } = {}) => {
    itemsRef.current = nextItems;
    if (localChange) cartRevisionRef.current += 1;
    setItems(nextItems);
  };

  const computeTotals = (cartItems, customDetails = undefined, customDiscount = undefined) => {
    const sub = cartItems.reduce((acc, i) => acc + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
    const rounded = Number(sub.toFixed(2));
    setSubtotal(rounded);

    const activeDetails = customDetails !== undefined ? customDetails : couponDetails;
    let activeDisc = customDiscount !== undefined ? customDiscount : discount;

    if (activeDetails) {
      if (activeDetails.minValue && rounded < activeDetails.minValue) {
        activeDisc = 0;
      } else if (activeDetails.kind === 'PERCENT') {
        const percDisc = (rounded * (Number(activeDetails.value) || 0)) / 100;
        activeDisc = activeDetails.maxDiscount ? Math.min(activeDetails.maxDiscount, percDisc) : percDisc;
        activeDisc = Number(Math.min(activeDisc, rounded).toFixed(2));
      } else if (activeDetails.kind === 'FLAT') {
        activeDisc = Number(Math.min(Number(activeDetails.value) || 0, rounded).toFixed(2));
      }
    } else if (customDiscount === undefined) {
      activeDisc = 0;
    }

    setDiscount(activeDisc);
    setTotal(Math.max(0, Number((rounded - activeDisc).toFixed(2))));
  };

  const loadCart = useCallback(async (silent = false, { force = false } = {}) => {
    // Drain pending writes before reading. Otherwise a refresh can see an older
    // server snapshot and replace the newer optimistic cart after fast taps.
    if (token) {
      let queueAtStart;
      do {
        queueAtStart = cartSyncQueueRef.current;
        await queueAtStart;
      } while (queueAtStart !== cartSyncQueueRef.current);
    }
    const startingRevision = cartRevisionRef.current;
    // 1. If not logged in, restore from local cache instantly
    if (!token) {
      try {
        const local = await AsyncStorage.getItem('localCart');
        if (local) {
          const parsed = JSON.parse(local);
          if (startingRevision === cartRevisionRef.current) {
            commitItems(parsed);
            computeTotals(parsed);
          }
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
      if (startingRevision !== cartRevisionRef.current) return;
      lastLoadedAtRef.current = Date.now();
      const serverItems = data.items || [];
      const srvDiscount = data.discount ?? 0;
      const srvTotal = data.total ?? 0;
      const srvCouponCode = data.couponCode ?? null;
      const srvCouponDetails = data.couponDetails ?? null;

      commitItems(serverItems);
      setDiscount(srvDiscount);
      setTotal(srvTotal);
      setCouponCode(srvCouponCode);
      setCouponDetails(srvCouponDetails);
      computeTotals(serverItems, srvCouponDetails, srvDiscount);
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
          if (startingRevision === cartRevisionRef.current) {
            commitItems(parsed);
            computeTotals(parsed);
          }
        }
      } catch {
        // ignore
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  const ensureCartHydrated = useCallback(() => {
    if (cartHydrationTokenRef.current !== token) {
      cartHydrationTokenRef.current = token;
      cartHydratedRef.current = false;
      cartHydrationPromiseRef.current = null;
    }
    if (cartHydratedRef.current) return Promise.resolve();
    if (!cartHydrationPromiseRef.current) {
      cartHydrationPromiseRef.current = loadCart();
      cartHydrationPromiseRef.current.then(
        () => { if (cartHydrationTokenRef.current === token) cartHydratedRef.current = true; },
        () => { if (cartHydrationTokenRef.current === token) cartHydratedRef.current = true; }
      );
    }
    return cartHydrationPromiseRef.current;
  }, [loadCart, token]);

  useEffect(() => {
    ensureCartHydrated();
  }, [ensureCartHydrated]);

  const putCart = (newItems, { clearCoupon = false } = {}) => {
    const snapshot = newItems.map((item) => ({ ...item }));
    const revision = cartRevisionRef.current;
    // Keep only the newest unsent snapshot. The local cart applies every tap
    // immediately, while one in flight request plus one latest snapshot keeps
    // fast multi item taps from flooding and reordering full cart writes.
    cartSyncPendingRef.current = {
      snapshot,
      revision,
      clearCoupon: clearCoupon || cartSyncPendingRef.current?.clearCoupon || false,
    };
    if (!cartSyncRunningRef.current) {
      cartSyncRunningRef.current = true;
      cartSyncQueueRef.current = (async () => {
        while (cartSyncPendingRef.current) {
          const pending = cartSyncPendingRef.current;
          cartSyncPendingRef.current = null;
          try {
            await AsyncStorage.setItem('localCart', JSON.stringify(pending.snapshot));
          } catch {}
          if (!token) continue;
          try {
            await apiClient.put(
              '/cart',
              { items: pending.snapshot.map(({ productId, variantId, qty }) => ({ productId, variantId: variantId || 'default', qty })) },
              { __skipErrorToast: true }
            );
            if (pending.clearCoupon) {
              await apiClient.patch('/cart/coupon', { code: null }, { __skipErrorToast: true });
            }
          } catch (err) {
            console.warn('Backend cart sync note:', err.message);
            if (err.response?.status === 409) {
              if (pending.revision === cartRevisionRef.current && !cartSyncPendingRef.current) {
                try {
                  const { data } = await apiClient.get('/cart', { __skipErrorToast: true });
                  if (pending.revision !== cartRevisionRef.current || cartSyncPendingRef.current) continue;
                  const serverItems = data.items || [];
                  commitItems(serverItems);
                  computeTotals(serverItems);
                  await AsyncStorage.setItem('localCart', JSON.stringify(serverItems));
                } catch {}
              }
              if (pending.revision === cartRevisionRef.current && !cartSyncPendingRef.current) {
                Toast.show({ type: 'error', text1: 'Item is out of stock or unavailable' });
              }
            }
          }
        }
      })().finally(() => {
        cartSyncRunningRef.current = false;
      });
    }
    return cartSyncQueueRef.current;
  };

  const addItem = async (product, variant) => {
    await ensureCartHydrated();
    if (isProductUnavailable(product, variant)) {
      Toast.show({ type: 'error', text1: 'This item is out of stock' });
      return;
    }
    const productId = product.id;
    const variantId = variant?.id || 'default';
    const price = variant?.offerPrice ?? variant?.price ?? product?.price ?? 0;

    const currentItems = itemsRef.current;
    const existingIdx = currentItems.findIndex(
      (i) => i.productId === productId && normalizeVariantId(i.variantId) === variantId
    );
    const currentQty = existingIdx >= 0 ? Number(currentItems[existingIdx].qty) || 0 : 0;
    if (variant?.stock != null && currentQty >= Number(variant.stock)) {
      Toast.show({ type: 'error', text1: 'This item is out of stock' });
      return;
    }

    let newItems;
    if (existingIdx >= 0) {
      newItems = currentItems.map((i, idx) =>
        idx === existingIdx ? { ...i, qty: i.qty + 1 } : i
      );
      Toast.show({ type: 'success', text1: 'Quantity updated' });
    } else {
      newItems = [
        ...currentItems,
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

    commitItems(newItems, { localChange: true });
    computeTotals(newItems);
    await putCart(newItems);
  };

  const addItems = async (entries) => {
    await ensureCartHydrated();
    const next = itemsRef.current.map(item => ({ ...item }));
    let added = 0;
    for (const { product, variant, qty = 1 } of entries) {
      if (!product?.id || !variant?.id || isProductUnavailable(product, variant)) continue;
      const existing = next.find(item => item.productId === product.id && item.variantId === variant.id);
      const available = variant.stock == null ? qty : Math.max(0, Number(variant.stock) - (existing?.qty || 0));
      const count = Math.min(qty, available);
      if (count <= 0) continue;
      if (existing) existing.qty += count;
      else next.push({ productId: product.id, variantId: variant.id, name: product.name, variantLabel: variant.label, price: variant.offerPrice ?? variant.price, images: product.images || [], qty: count, availability: product.availability, isAvailableToday: product.isAvailableToday, variantAvailability: variant.availability, stock: variant.stock });
      added += count;
    }
    if (added > 0) {
      commitItems(next, { localChange: true });
      computeTotals(next);
      await putCart(next);
    }
    Toast.show({ type: added ? 'success' : 'info', text1: added ? `${added} item(s) added to cart` : 'These items are currently unavailable', text2: 'Current prices and stock apply.' });
    return added;
  };

  const validateCouponAfterChange = async (newItems) => {
    const newSubtotal = newItems.reduce((acc, i) => acc + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
    if (couponCode && couponDetails?.minValue && newSubtotal < couponDetails.minValue) {
      const removedCode = couponCode;
      setCouponCode(null);
      setCouponDetails(null);
      setDiscount(0);
      setTotal(Number(newSubtotal.toFixed(2)));
      if (token) {
        try {
          await apiClient.patch('/cart/coupon', { code: null }, { __skipErrorToast: true });
        } catch (_) {}
      }
      Toast.show({
        type: 'info',
        text1: `Coupon ${removedCode} removed`,
        text2: `Order value fell below minimum ₹${couponDetails.minValue}`,
      });
      return;
    }
    // Totals are already recalculated locally from the active coupon details.
    // A server refresh here could race with a newer write and restore stale data.
  };

  const removeItem = async (productId, variantId) => {
    await ensureCartHydrated();
    const normalizedVariantId = normalizeVariantId(variantId);
    const newItems = itemsRef.current.filter(
      (i) => !(i.productId === productId && normalizeVariantId(i.variantId) === normalizedVariantId)
    );

    commitItems(newItems, { localChange: true });
    computeTotals(newItems);
    Toast.show({ type: 'success', text1: 'Removed from cart' });
    await putCart(newItems);
    await validateCouponAfterChange(newItems);
  };

  const updateQty = async (productId, variantId, delta) => {
    await ensureCartHydrated();
    const normalizedVariantId = normalizeVariantId(variantId);
    const currentItems = itemsRef.current;
    const item = currentItems.find(
      (i) => i.productId === productId && normalizeVariantId(i.variantId) === normalizedVariantId
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

    const newItems = currentItems.map((i) =>
      i.productId === productId && normalizeVariantId(i.variantId) === normalizedVariantId
        ? { ...i, qty: i.qty + delta }
        : i
    );

    commitItems(newItems, { localChange: true });
    computeTotals(newItems);
    Toast.show({ type: 'success', text1: 'Quantity updated' });
    await putCart(newItems);
    await validateCouponAfterChange(newItems);
  };

  const clearCart = async () => {
    await ensureCartHydrated();
    commitItems([], { localChange: true });
    setSubtotal(0);
    setDiscount(0);
    setTotal(0);
    setCouponCode(null);
    setCouponDetails(null);
    await putCart([], { clearCoupon: true });
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

      if (valData?.minValue && subtotal < valData.minValue) {
        throw new Error(`Minimum order value for ${cleanCode} is ₹${valData.minValue}`);
      }

      const disc = valData.evaluatedDiscount || 0;

      // INSTANT OPTIMISTIC UPDATE: Apply state immediately for zero-lag response
      setCouponCode(cleanCode);
      setCouponDetails(valData);
      setDiscount(disc);
      setTotal(Math.max(0, Number((subtotal - disc).toFixed(2))));
      Toast.show({
        type: 'success',
        text1: 'Coupon applied',
        text2: `Saved ₹${disc}!`,
      });

      if (token) {
        // Sync to backend cart in background silently (no loading spinner or UI freeze)
        apiClient
          .patch('/cart/coupon', { code: cleanCode })
          .then(() => loadCart(true, { force: true }))
          .catch((err) => console.warn('Background cart coupon sync note:', err?.message));
      }

      return valData;
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Could not apply coupon';
      Toast.show({ type: 'error', text1: msg });
      throw err;
    }
  };

  const removeCoupon = async () => {
    // Instant optimistic removal
    setCouponCode(null);
    setCouponDetails(null);
    setDiscount(0);
    setTotal(subtotal);
    Toast.show({ type: 'success', text1: 'Coupon removed' });

    if (token) {
      try {
        await apiClient.patch('/cart/coupon', { code: null });
        await loadCart(true, { force: true });
      } catch (err) {
        console.warn('Coupon removal sync note:', err?.message);
      }
    }
  };

  const getQty = useCallback(
    (productId, variantId) => {
      const normalizedVariantId = normalizeVariantId(variantId);
      const item = items.find(
        (i) => i.productId === productId && normalizeVariantId(i.variantId) === normalizedVariantId
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
        addItems,
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
