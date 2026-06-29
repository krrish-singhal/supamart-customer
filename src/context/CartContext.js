import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { AuthContext } from './AuthContext';

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

  const computeTotals = (cartItems) => {
    const sub = cartItems.reduce((acc, i) => acc + i.price * i.qty, 0);
    const rounded = Number(sub.toFixed(2));
    setSubtotal(rounded);
    setTotal(rounded);
  };

  const loadCart = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const { data } = await apiClient.get('/cart');
      setItems(data.items || []);
      setSubtotal(data.subtotal ?? 0);
      setDiscount(data.discount ?? 0);
      setTotal(data.total ?? 0);
      setCouponCode(data.couponCode ?? null);
      setCouponDetails(data.couponDetails ?? null);
    } catch {
      // non-fatal
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadCart();
    } else {
      setItems([]);
      setSubtotal(0);
      setDiscount(0);
      setTotal(0);
      setCouponCode(null);
      setCouponDetails(null);
    }
  }, [token, loadCart]);

  const putCart = async (newItems) => {
    await apiClient.put('/cart', {
      items: newItems.map(({ productId, variantId, qty }) => ({ productId, variantId, qty })),
    });
  };

  const addItem = async (product, variant) => {
    const productId = product.id;
    const variantId = variant.id;
    const price = variant.offerPrice ?? variant.price ?? 0;

    const prevItems = [...items];
    const existingIdx = items.findIndex(
      (i) => i.productId === productId && i.variantId === variantId
    );

    let newItems;
    if (existingIdx >= 0) {
      newItems = items.map((i, idx) =>
        idx === existingIdx ? { ...i, qty: i.qty + 1 } : i
      );
      Toast.show({ type: 'success', text1: 'Quantity updated.' });
    } else {
      newItems = [
        ...items,
        {
          productId,
          variantId,
          qty: 1,
          name: product.name,
          variantLabel: variant.label,
          price,
          images: product.images,
        },
      ];
      Toast.show({ type: 'success', text1: 'Added to cart.' });
    }

    setItems(newItems);
    computeTotals(newItems);

    try {
      await putCart(newItems);
    } catch {
      setItems(prevItems);
      computeTotals(prevItems);
      Toast.show({ type: 'error', text1: 'Failed to update cart.' });
    }
  };

  const removeItem = async (productId, variantId) => {
    const prevItems = [...items];
    const newItems = items.filter(
      (i) => !(i.productId === productId && i.variantId === variantId)
    );

    setItems(newItems);
    computeTotals(newItems);
    Toast.show({ type: 'success', text1: 'Removed from cart.' });

    try {
      await putCart(newItems);
    } catch {
      setItems(prevItems);
      computeTotals(prevItems);
      Toast.show({ type: 'error', text1: 'Failed to update cart.' });
    }
  };

  const updateQty = async (productId, variantId, delta) => {
    const item = items.find(
      (i) => i.productId === productId && i.variantId === variantId
    );
    if (!item) return;
    if (item.qty + delta <= 0) return removeItem(productId, variantId);

    const prevItems = [...items];
    const newItems = items.map((i) =>
      i.productId === productId && i.variantId === variantId
        ? { ...i, qty: i.qty + delta }
        : i
    );

    setItems(newItems);
    computeTotals(newItems);
    Toast.show({ type: 'success', text1: 'Quantity updated.' });

    try {
      await putCart(newItems);
    } catch {
      setItems(prevItems);
      computeTotals(prevItems);
      Toast.show({ type: 'error', text1: 'Failed to update cart.' });
    }
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
    try {
      await apiClient.post('/offers/validate', { code: code.trim().toUpperCase(), subtotal, items });
      await apiClient.patch('/cart/coupon', { code: code.trim().toUpperCase() });
      await loadCart();
      Toast.show({ type: 'success', text1: 'Coupon applied.' });
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid coupon code.';
      Toast.show({ type: 'error', text1: msg });
    }
  };

  const removeCoupon = async () => {
    await apiClient.patch('/cart/coupon', { code: null });
    setCouponCode(null);
    setCouponDetails(null);
    await loadCart();
    Toast.show({ type: 'success', text1: 'Coupon removed.' });
  };

  const getQty = (productId, variantId) => {
    const item = items.find(
      (i) => i.productId === productId && i.variantId === variantId
    );
    return item?.qty ?? 0;
  };

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
