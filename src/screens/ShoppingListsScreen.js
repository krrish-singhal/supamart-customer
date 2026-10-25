import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ShoppingBag,
  Leaf,
  Coffee,
  Sparkles,
  Package,
  Trash2,
  X,
  Search,
  Check,
  RotateCcw,
} from '../components/icons';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import apiClient from '../services/api';
import { getProductImageSource } from '../utils/productImages';
import { fonts } from '../theme/typography';

const LIST_SUGGESTIONS = [
  'Monthly groceries',
  'Pooja items',
  'Party snacks',
  'Cleaning supplies',
];

// Curated starter lists matching Image 4
const DEFAULT_CURATED_LISTS = [
  {
    id: 'curated-monthly-groceries',
    name: 'Monthly groceries',
    isCurated: true,
    totalQty: 9,
    approxTotal: 1488,
    theme: {
      Icon: ShoppingBag,
      iconColor: '#087f46',
      bgColor: '#eaf6ee',
    },
    extraCount: 5,
    thumbnails: [
      { id: 'p-rice', name: '786 Surekha Rice' },
      { id: 'p-atta', name: 'Aashirvaad Atta' },
      { id: 'p-dal', name: 'Toor Dal' },
      { id: 'p-oil', name: 'Milma Ghee' },
    ],
    items: [
      { id: 'm1', name: '786 Surekha Rice', variantLabel: '5kg', price: 290, qty: 1 },
      { id: 'm2', name: 'Aashirvaad Atta', variantLabel: '5kg', price: 260, qty: 1 },
      { id: 'm3', name: 'Toor Dal', variantLabel: '1kg', price: 165, qty: 1 },
      { id: 'm4', name: 'Sunflower Oil', variantLabel: '1L', price: 145, qty: 1 },
      { id: 'm5', name: 'Tata Salt', variantLabel: '1kg', price: 28, qty: 1 },
      { id: 'm6', name: 'Sugar', variantLabel: '1kg', price: 48, qty: 1 },
      { id: 'm7', name: 'AVT Premium Tea', variantLabel: '250g', price: 130, qty: 1 },
      { id: 'm8', name: 'Surf Excel Detergent Powder Quick Wash 1kg', variantLabel: '1kg', price: 230, qty: 1 },
      { id: 'm9', name: 'Vim Dishwash Bar Tub 500g', variantLabel: '500g', price: 55, qty: 1 },
    ],
  },
  {
    id: 'curated-weekly-veg',
    name: 'Weekly vegetables',
    isCurated: true,
    totalQty: 7,
    approxTotal: 196,
    theme: {
      Icon: Leaf,
      iconColor: '#b45309',
      bgColor: '#fef3c7',
    },
    extraCount: 3,
    thumbnails: [
      { id: 'p-tomato', name: 'Tomato (Local)' },
      { id: 'p-onion', name: 'Onion' },
      { id: 'p-potato', name: 'Potato' },
      { id: 'p-chilli', name: 'Green Chilli' },
    ],
    items: [
      { id: 'v1', name: 'Tomato (Local)', variantLabel: '1kg', price: 35, qty: 1 },
      { id: 'v2', name: 'Onion', variantLabel: '1kg', price: 40, qty: 1 },
      { id: 'v3', name: 'Potato', variantLabel: '1kg', price: 38, qty: 1 },
      { id: 'v4', name: 'Green Chilli', variantLabel: '200g', price: 18, qty: 1 },
      { id: 'v5', name: 'Ginger', variantLabel: '200g', price: 25, qty: 1 },
      { id: 'v6', name: 'Beans', variantLabel: '500g', price: 30, qty: 1 },
      { id: 'v7', name: 'Curry Leaves (K. Leaves)', variantLabel: '1 bunch', price: 10, qty: 1 },
    ],
  },
  {
    id: 'curated-breakfast',
    name: 'Breakfast',
    isCurated: true,
    totalQty: 4,
    approxTotal: 141,
    theme: {
      Icon: Coffee,
      iconColor: '#475569',
      bgColor: '#f1f5f9',
    },
    extraCount: 0,
    thumbnails: [
      { id: 'p-milk', name: 'Full Cream Milk' },
      { id: 'p-bread', name: 'Modern Bread' },
      { id: 'p-eggs', name: 'Farm Fresh Eggs' },
      { id: 'p-biscuit', name: '50-50 Biscuits' },
    ],
    items: [
      { id: 'b1', name: 'Full Cream Milk', variantLabel: '500ml', price: 28, qty: 1 },
      { id: 'b2', name: 'Modern Bread', variantLabel: '400g', price: 45, qty: 1 },
      { id: 'b3', name: 'Farm Fresh Eggs', variantLabel: '6 pcs', price: 48, qty: 1 },
      { id: 'b4', name: '50-50 Biscuits', variantLabel: '100g', price: 20, qty: 1 },
    ],
  },
];

// Helper to determine icon & soft background matching Image 4 aesthetics
function getThemeForList(name, index = 0) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('veg') || lower.includes('fruit') || lower.includes('fresh')) {
    return {
      Icon: Leaf,
      iconColor: '#b45309',
      bgColor: '#fef3c7',
    };
  }
  if (lower.includes('breakfast') || lower.includes('coffee') || lower.includes('tea') || lower.includes('milk') || lower.includes('bread')) {
    return {
      Icon: Coffee,
      iconColor: '#475569',
      bgColor: '#f1f5f9',
    };
  }
  if (lower.includes('pooja') || lower.includes('party') || lower.includes('snack') || lower.includes('clean') || lower.includes('soap')) {
    return {
      Icon: Sparkles,
      iconColor: '#9333ea',
      bgColor: '#f3e8ff',
    };
  }
  if (lower.includes('order')) {
    return {
      Icon: Package,
      iconColor: '#087f46',
      bgColor: '#eaf6ee',
    };
  }
  // Default alternating themes matching Image 4
  const themes = [
    { Icon: ShoppingBag, iconColor: '#087f46', bgColor: '#eaf6ee' },
    { Icon: Leaf, iconColor: '#b45309', bgColor: '#fef3c7' },
    { Icon: Coffee, iconColor: '#475569', bgColor: '#f1f5f9' },
    { Icon: Sparkles, iconColor: '#9333ea', bgColor: '#f3e8ff' },
  ];
  return themes[index % themes.length];
}

export default function ShoppingListsScreen({ navigation }) {
  const { userProfile, token } = useContext(AuthContext);
  const { items: cartItems, addItems } = useCart();
  const userId = userProfile?.uid || userProfile?.id;

  const [savedLists, setSavedLists] = useState([]);
  const [pastOrders, setPastOrders] = useState([]);
  const [buyAgainItems, setBuyAgainItems] = useState([]);
  const [productDetailsMap, setProductDetailsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);

  // Modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const [catalogSearch, setCatalogSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [createSourceTab, setCreateSourceTab] = useState('orders'); // 'orders' | 'cart' | 'search'

  // View Details Modal
  const [activeListDetail, setActiveListDetail] = useState(null);

  const searchDebounceRef = useRef(null);

  // Load all user's lists and past orders
  const loadData = useCallback(async () => {
    if (!userId || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // 1. Fetch user's saved shopping lists
      const listsPromise = apiClient
        .get(`/users/${userId}/shopping-lists`)
        .then(({ data }) => data.items || [])
        .catch(() => []);

      // 2. Fetch user's actual past orders strictly
      const ordersPromise = apiClient
        .get('/orders/mine?limit=15')
        .then(({ data }) => data.items || [])
        .catch(() => []);

      // 3. Fetch user's buy-again purchases strictly
      const buyAgainPromise = apiClient
        .get('/orders/buy-again')
        .then(({ data }) => data.items || [])
        .catch(() => []);

      const [lists, orders, buyAgain] = await Promise.all([
        listsPromise,
        ordersPromise,
        buyAgainPromise,
      ]);

      setSavedLists(lists);
      setPastOrders(orders);
      setBuyAgainItems(buyAgain);

      // Collect all product IDs in saved lists that need metadata
      const neededIds = new Set();
      lists.forEach((list) => {
        (list.items || []).forEach((item) => {
          if (item.productId) neededIds.add(item.productId);
        });
      });

      // Populate from buyAgain items first
      const pMap = {};
      buyAgain.forEach((item) => {
        if (item.product?.id) {
          pMap[item.product.id] = item.product;
        }
      });

      // Populate from past orders
      orders.forEach((order) => {
        (order.items || []).forEach((item) => {
          if (item.productId && !pMap[item.productId]) {
            pMap[item.productId] = {
              id: item.productId,
              name: item.name,
              images: item.images || (item.image ? [item.image] : []),
              price: item.price,
              variants: [
                {
                  id: item.variantId,
                  label: item.variantLabel || '',
                  price: item.price,
                  offerPrice: item.price,
                },
              ],
            };
          }
        });
      });

      // Fetch remaining missing products
      const missingIds = [...neededIds].filter((id) => !pMap[id]);
      if (missingIds.length > 0) {
        for (let i = 0; i < missingIds.length; i += 8) {
          const slice = missingIds.slice(i, i + 8);
          await Promise.all(
            slice.map(async (id) => {
              try {
                const { data } = await apiClient.get(`/products/${id}`, {
                  __skipErrorToast: true,
                });
                if (data?.id) pMap[data.id] = data;
              } catch {
                // Ignore 404s
              }
            })
          );
        }
      }

      setProductDetailsMap(pMap);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Could not load your lists',
        text2: 'Please check your connection and pull to refresh.',
      });
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Search catalog products live inside list creation modal
  const handleCatalogSearch = (text) => {
    setCatalogSearch(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!text.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const { data } = await apiClient.get(
          `/products/search?q=${encodeURIComponent(text.trim())}&limit=12`,
          { __skipErrorToast: true }
        );
        setSearchResults(data.items || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
  };

  // Add all items in a saved list to cart
  const handleAddAllSavedList = async (list) => {
    if (actionBusy) return;
    setActionBusy(true);

    try {
      const itemsToAdd = [];
      for (const item of list.items || []) {
        const product = productDetailsMap[item.productId];
        if (product) {
          const variant =
            product.variants?.find((v) => v.id === item.variantId) ||
            product.variants?.[0];
          itemsToAdd.push({
            product,
            variant,
            qty: item.qty || 1,
          });
        }
      }

      if (itemsToAdd.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'Products in this list are no longer available',
        });
        return;
      }

      const added = await addItems(itemsToAdd);
      if (added > 0) {
        Toast.show({
          type: 'success',
          text1: `Added ${added} item(s) from "${list.name}" to cart`,
        });
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Could not add items to cart',
        text2: 'Please try again.',
      });
    } finally {
      setActionBusy(false);
    }
  };

  // Add all items from a past order to cart
  const handleAddAllPastOrder = async (order) => {
    if (actionBusy) return;
    setActionBusy(true);

    try {
      const entries = [];
      for (const item of order.items || []) {
        let product = productDetailsMap[item.productId];
        if (!product) {
          try {
            const { data } = await apiClient.get(`/products/${item.productId}`, {
              __skipErrorToast: true,
            });
            product = data;
          } catch {
            product = null;
          }
        }

        if (product) {
          const variant =
            product.variants?.find((v) => v.id === item.variantId) ||
            product.variants?.[0];
          entries.push({
            product,
            variant,
            qty: item.qty || 1,
          });
        }
      }

      if (entries.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'Products from this order are no longer available',
        });
        return;
      }

      const added = await addItems(entries);
      if (added > 0) {
        Toast.show({
          type: 'success',
          text1: `Added ${added} items from order #${order.id.slice(-6).toUpperCase()} to cart`,
        });
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Failed to reorder items',
      });
    } finally {
      setActionBusy(false);
    }
  };

  // Add all items from a curated starter list to cart
  const handleAddAllCuratedList = async (curatedList) => {
    if (actionBusy) return;
    setActionBusy(true);

    try {
      const entries = curatedList.items.map((item) => ({
        product: {
          id: item.id,
          name: item.name,
          images: [],
          availability: 'AVAILABLE',
          isAvailableToday: true,
        },
        variant: {
          id: `${item.id}-v1`,
          label: item.variantLabel,
          price: item.price,
          offerPrice: item.price,
          availability: 'AVAILABLE',
        },
        qty: item.qty || 1,
      }));

      const added = await addItems(entries);
      if (added > 0) {
        Toast.show({
          type: 'success',
          text1: `Added ${added} items from "${curatedList.name}" to cart`,
        });
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Could not add items to cart',
      });
    } finally {
      setActionBusy(false);
    }
  };

  // Delete a saved list
  const handleDeleteList = (list) => {
    Alert.alert(
      'Delete shopping list?',
      `Are you sure you want to remove "${list.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/users/${userId}/shopping-lists/${list.id}`);
              setSavedLists((prev) => prev.filter((l) => l.id !== list.id));
              if (activeListDetail?.id === list.id) setActiveListDetail(null);
              Toast.show({ type: 'success', text1: 'Shopping list removed' });
            } catch {
              Toast.show({ type: 'error', text1: 'Failed to delete list' });
            }
          },
        },
      ]
    );
  };

  // Open List Creation modal pre-filled
  const openCreateModal = (suggestedName = '') => {
    setNewListName(suggestedName || 'Monthly groceries');
    setSelectedItems({});
    setCatalogSearch('');
    setSearchResults([]);
    setCreateSourceTab(buyAgainItems.length > 0 ? 'orders' : cartItems.length > 0 ? 'cart' : 'search');
    setCreateModalVisible(true);
  };

  // Save new list to backend
  const handleSaveNewList = async () => {
    const trimmed = newListName.trim();
    if (!trimmed) {
      Toast.show({ type: 'error', text1: 'Please enter a list name' });
      return;
    }

    const itemsArray = Object.values(selectedItems).filter((item) => item.qty > 0);
    if (itemsArray.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Please select at least 1 product for your list',
      });
      return;
    }

    setActionBusy(true);
    try {
      const payload = {
        name: trimmed,
        items: itemsArray.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          qty: i.qty,
        })),
      };

      const { data } = await apiClient.post(`/users/${userId}/shopping-lists`, payload);
      setSavedLists((prev) => [data, ...prev]);
      setCreateModalVisible(false);
      Toast.show({ type: 'success', text1: 'Shopping list saved!' });
      loadData();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.error || 'Could not save shopping list',
      });
    } finally {
      setActionBusy(false);
    }
  };

  // Toggle item selection in create modal
  const toggleItemSelection = (product, variant, defaultQty = 1) => {
    if (!product || !variant) return;
    const key = `${product.id}:${variant.id}`;
    setSelectedItems((prev) => {
      const existing = prev[key];
      if (existing) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      return {
        ...prev,
        [key]: {
          productId: product.id,
          variantId: variant.id,
          qty: defaultQty,
          name: product.name,
          variantLabel: variant.label,
          price: variant.offerPrice ?? variant.price,
          product,
        },
      };
    });
  };

  const updateItemQty = (productId, variantId, delta) => {
    const key = `${productId}:${variantId}`;
    setSelectedItems((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      const newQty = existing.qty + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      return {
        ...prev,
        [key]: { ...existing, qty: newQty },
      };
    });
  };

  // Render a saved shopping list card matching Image 5
  const renderSavedListCard = (list, index) => {
    const theme = getThemeForList(list.name, index);
    const IconComponent = theme.Icon;

    const items = list.items || [];
    const totalQty = items.reduce((sum, i) => sum + (i.qty || 1), 0);

    // Compute approximate total price
    let approxTotal = 0;
    const thumbnails = [];

    items.forEach((item) => {
      const prod = productDetailsMap[item.productId];
      const variant =
        prod?.variants?.find((v) => v.id === item.variantId) ||
        prod?.variants?.[0];
      const price = variant?.offerPrice ?? variant?.price ?? 0;
      approxTotal += price * (item.qty || 1);

      if (prod && thumbnails.length < 4) {
        thumbnails.push(prod);
      }
    });

    const extraCount = Math.max(0, items.length - 4);

    return (
      <Pressable
        key={list.id}
        onPress={() =>
          setActiveListDetail({
            ...list,
            approxTotal: Math.round(approxTotal),
            totalQty,
            isSavedList: true,
          })
        }
        style={styles.listCard}
      >
        {/* Top row: Icon, Title & subtitle, Chevron */}
        <View style={styles.cardTopRow}>
          <View style={[styles.iconBox, { backgroundColor: theme.bgColor }]}>
            <IconComponent size={20} color={theme.iconColor} strokeWidth={2.2} />
          </View>
          <View style={styles.cardHeaderContent}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {list.name}
            </Text>
            <Text style={styles.cardSubtitle}>
              {totalQty} items · approx. ₹{Math.round(approxTotal)}
            </Text>
          </View>
          <ChevronRight size={18} color="#94a3b8" strokeWidth={2.2} />
        </View>

        {/* Bottom row: Thumbnails + Add all button */}
        <View style={styles.cardBottomRow}>
          <View style={styles.thumbnailsWrap}>
            {thumbnails.map((prod, tIdx) => {
              const source = getProductImageSource(prod, 120);
              return (
                <View key={`thumb-${tIdx}`} style={styles.thumbBox}>
                  {source ? (
                    <Image source={source} style={styles.thumbImg} contentFit="contain" />
                  ) : (
                    <ShoppingBag size={18} color="#94a3b8" />
                  )}
                </View>
              );
            })}
            <Text style={styles.thumbExtraText}>+{extraCount}</Text>
          </View>

          <Pressable
            disabled={actionBusy}
            onPress={() => handleAddAllSavedList(list)}
            hitSlop={6}
            style={({ pressed }) => [
              styles.addAllBtn,
              pressed && { opacity: 0.75 },
              actionBusy && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.addAllText}>Add all</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  // Render a past order card matching Image 5
  const renderPastOrderCard = (order, index) => {
    const theme = {
      Icon: Package,
      iconColor: '#087f46',
      bgColor: '#e8f5e9',
    };
    const items = order.items || [];
    const totalQty = items.reduce((sum, i) => sum + (i.qty || 1), 0);
    const approxTotal = order.total || order.pricing?.total || 0;

    const thumbnails = [];
    items.forEach((item) => {
      if (thumbnails.length < 4) {
        thumbnails.push(item);
      }
    });
    const extraCount = Math.max(0, items.length - 4);

    const orderNo = order.id.slice(-6).toUpperCase();
    const dateStr = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        })
      : '';

    return (
      <Pressable
        key={`order-${order.id}`}
        onPress={() =>
          setActiveListDetail({
            id: order.id,
            name: `Order #${orderNo} · ${dateStr}`,
            items: order.items,
            approxTotal: Math.round(approxTotal),
            totalQty,
            isPastOrder: true,
            order,
          })
        }
        style={styles.listCard}
      >
        {/* Top row */}
        <View style={styles.cardTopRow}>
          <View style={[styles.iconBox, { backgroundColor: theme.bgColor }]}>
            <theme.Icon size={20} color={theme.iconColor} strokeWidth={2.2} />
          </View>
          <View style={styles.cardHeaderContent}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              Order #{orderNo} · {dateStr}
            </Text>
            <Text style={styles.cardSubtitle}>
              {totalQty} items · approx. ₹{Math.round(approxTotal)}
            </Text>
          </View>
          <ChevronRight size={18} color="#94a3b8" strokeWidth={2.2} />
        </View>

        {/* Bottom row */}
        <View style={styles.cardBottomRow}>
          <View style={styles.thumbnailsWrap}>
            {thumbnails.map((item, tIdx) => {
              const source = getProductImageSource(item, 120);
              return (
                <View key={`thumb-order-${tIdx}`} style={styles.thumbBox}>
                  {source ? (
                    <Image source={source} style={styles.thumbImg} contentFit="contain" />
                  ) : (
                    <ShoppingBag size={18} color="#94a3b8" />
                  )}
                </View>
              );
            })}
            <Text style={styles.thumbExtraText}>+{extraCount}</Text>
          </View>

          <Pressable
            disabled={actionBusy}
            onPress={() => handleAddAllPastOrder(order)}
            hitSlop={6}
            style={({ pressed }) => [
              styles.addAllBtn,
              pressed && { opacity: 0.75 },
              actionBusy && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.addAllText}>Add all</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  // Render a curated starter list card matching Image 4
  const renderCuratedListCard = (curatedList) => {
    const { theme } = curatedList;
    const IconComponent = theme.Icon;

    return (
      <Pressable
        key={curatedList.id}
        onPress={() =>
          setActiveListDetail({
            ...curatedList,
            isCurated: true,
          })
        }
        style={styles.listCard}
      >
        {/* Top row: Icon, Title & subtitle, Chevron */}
        <View style={styles.cardTopRow}>
          <View style={[styles.iconBox, { backgroundColor: theme.bgColor }]}>
            <IconComponent size={21} color={theme.iconColor} strokeWidth={2.3} />
          </View>
          <View style={styles.cardHeaderContent}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {curatedList.name}
            </Text>
            <Text style={styles.cardSubtitle}>
              {curatedList.totalQty} items · approx. ₹{curatedList.approxTotal}
            </Text>
          </View>
          <ChevronRight size={18} color="#94a3b8" strokeWidth={2.2} />
        </View>

        {/* Bottom row: Thumbnails + Add all button */}
        <View style={styles.cardBottomRow}>
          <View style={styles.thumbnailsWrap}>
            {curatedList.thumbnails.map((item, tIdx) => {
              const source = getProductImageSource(item, 120);
              return (
                <View key={`curated-thumb-${tIdx}`} style={styles.thumbBox}>
                  {source ? (
                    <Image source={source} style={styles.thumbImg} contentFit="contain" />
                  ) : (
                    <ShoppingBag size={18} color="#94a3b8" />
                  )}
                </View>
              );
            })}
            <Text style={styles.thumbExtraText}>+{curatedList.extraCount}</Text>
          </View>

          <Pressable
            disabled={actionBusy}
            onPress={() => handleAddAllCuratedList(curatedList)}
            hitSlop={6}
            style={({ pressed }) => [
              styles.addAllBtn,
              pressed && { opacity: 0.75 },
              actionBusy && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.addAllText}>Add all</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f6f3" />

      {/* Header matching Image 4: Back, "My lists", and "+ New list" pill button */}
      <View style={styles.header}>
        <View style={styles.headerLeftGroup}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            accessibilityLabel="Go back"
            style={styles.backButton}
          >
            <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
          </Pressable>
          <Text style={styles.headerTitle}>My lists</Text>
        </View>

        <Pressable
          onPress={() => openCreateModal()}
          style={({ pressed }) => [
            styles.newListHeaderBtn,
            pressed && { opacity: 0.75 },
          ]}
          accessibilityLabel="Create new list"
        >
          <Plus size={16} color="#087f46" strokeWidth={2.4} style={{ marginRight: 4 }} />
          <Text style={styles.newListHeaderText}>New list</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Subtitle text matching Image 4 */}
        <Text style={styles.subtitleText}>
          Keep your regular shopping in one place and add a whole list to the cart in one tap.
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#087f46" />
          </View>
        ) : (
          <>
            {/* 1. Saved Lists from user account */}
            {savedLists.map((list, idx) => renderSavedListCard(list, idx))}

            {/* 2. Default Curated Starter Lists matching Image 4 */}
            {savedLists.length === 0 &&
              DEFAULT_CURATED_LISTS.map((curated) => renderCuratedListCard(curated))}

            {/* 3. Quick Order from actual past orders */}
            {pastOrders.length > 0 && (
              <>
                <Text style={styles.sectionHeaderLabel}>Quick reorder from recent orders</Text>
                {pastOrders.slice(0, 5).map((order, idx) => renderPastOrderCard(order, idx))}
              </>
            )}

            {savedLists.length > 0 && (
              <>
                <Text style={styles.sectionHeaderLabel}>Starter list templates</Text>
                {DEFAULT_CURATED_LISTS.map((curated) => renderCuratedListCard(curated))}
              </>
            )}

            {/* "Start a new list" Section matching Image 4 */}
            <View style={styles.startListSection}>
              <Text style={styles.startListTitle}>Start a new list</Text>
              <View style={styles.chipsWrap}>
                {LIST_SUGGESTIONS.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    onPress={() => openCreateModal(suggestion)}
                    style={({ pressed }) => [
                      styles.suggestionChip,
                      pressed && { opacity: 0.75, backgroundColor: '#f0fdf4' },
                    ]}
                  >
                    <Text style={styles.suggestionChipText}>+ {suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* ================= CREATE LIST MODAL ================= */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New shopping list</Text>
            <Pressable
              onPress={() => setCreateModalVisible(false)}
              hitSlop={12}
              style={styles.modalCloseBtn}
            >
              <X size={22} color="#0f172a" />
            </Pressable>
          </View>

          {/* List Name Input */}
          <View style={styles.modalNameInputWrap}>
            <Text style={styles.inputLabel}>List name</Text>
            <TextInput
              value={newListName}
              onChangeText={setNewListName}
              placeholder="e.g. Monthly groceries"
              placeholderTextColor="#94a3b8"
              style={styles.modalTextInput}
              maxLength={60}
            />
          </View>

          {/* Source Tabs: Past orders vs Cart vs Catalog search */}
          <View style={styles.tabBarRow}>
            <Pressable
              onPress={() => setCreateSourceTab('orders')}
              style={[
                styles.tabBtn,
                createSourceTab === 'orders' && styles.tabBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  createSourceTab === 'orders' && styles.tabBtnTextActive,
                ]}
              >
                Past purchases ({buyAgainItems.length})
              </Text>
            </Pressable>

            {cartItems.length > 0 && (
              <Pressable
                onPress={() => setCreateSourceTab('cart')}
                style={[
                  styles.tabBtn,
                  createSourceTab === 'cart' && styles.tabBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    createSourceTab === 'cart' && styles.tabBtnTextActive,
                  ]}
                >
                  Cart ({cartItems.length})
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => setCreateSourceTab('search')}
              style={[
                styles.tabBtn,
                createSourceTab === 'search' && styles.tabBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  createSourceTab === 'search' && styles.tabBtnTextActive,
                ]}
              >
                Search store
              </Text>
            </Pressable>
          </View>

          {/* Tab Content */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScrollContent}
          >
            {createSourceTab === 'search' && (
              <View style={styles.searchBoxWrap}>
                <Search size={18} color="#64748b" style={{ marginRight: 8 }} />
                <TextInput
                  value={catalogSearch}
                  onChangeText={handleCatalogSearch}
                  placeholder="Search products to add..."
                  placeholderTextColor="#94a3b8"
                  style={styles.searchTextInput}
                />
                {searching && <ActivityIndicator size="small" color="#087f46" />}
              </View>
            )}

            {/* List of items available to add */}
            {createSourceTab === 'orders' && (
              <>
                {buyAgainItems.length === 0 ? (
                  <Text style={styles.emptyTabText}>
                    No past purchases yet. Use “Search store” to add items from the catalog.
                  </Text>
                ) : (
                  buyAgainItems.map((item) => {
                    const prod = item.product;
                    const variant =
                      prod?.variants?.find((v) => v.id === item.variantId) ||
                      prod?.variants?.[0];
                    if (!prod || !variant) return null;
                    const key = `${prod.id}:${variant.id}`;
                    const isSelected = Boolean(selectedItems[key]);
                    const selectedQty = selectedItems[key]?.qty || 1;

                    return (
                      <View key={key} style={styles.modalProductRow}>
                        <Pressable
                          onPress={() => toggleItemSelection(prod, variant)}
                          style={styles.modalProductLeft}
                        >
                          <View
                            style={[
                              styles.checkboxSquare,
                              isSelected && styles.checkboxSquareSelected,
                            ]}
                          >
                            {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                          </View>
                          <View style={styles.modalProductThumb}>
                            <Image
                              source={getProductImageSource(prod, 100)}
                              style={styles.modalThumbImg}
                              contentFit="contain"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text numberOfLines={1} style={styles.modalProdName}>
                              {prod.name}
                            </Text>
                            <Text style={styles.modalProdVariant}>
                              {variant.label} · ₹{variant.offerPrice ?? variant.price}
                            </Text>
                          </View>
                        </Pressable>

                        {isSelected && (
                          <View style={styles.qtyCounterRow}>
                            <Pressable
                              onPress={() => updateItemQty(prod.id, variant.id, -1)}
                              style={styles.qtyBtn}
                            >
                              <Text style={styles.qtyBtnText}>-</Text>
                            </Pressable>
                            <Text style={styles.qtyText}>{selectedQty}</Text>
                            <Pressable
                              onPress={() => updateItemQty(prod.id, variant.id, 1)}
                              style={styles.qtyBtn}
                            >
                              <Text style={styles.qtyBtnText}>+</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </>
            )}

            {createSourceTab === 'cart' && (
              <>
                {cartItems.map((cartItem) => {
                  const key = `${cartItem.productId}:${cartItem.variantId}`;
                  const isSelected = Boolean(selectedItems[key]);
                  const selectedQty = selectedItems[key]?.qty || cartItem.qty || 1;

                  return (
                    <View key={key} style={styles.modalProductRow}>
                      <Pressable
                        onPress={() =>
                          toggleItemSelection(
                            { id: cartItem.productId, name: cartItem.name, images: cartItem.images },
                            { id: cartItem.variantId, label: cartItem.variantLabel, price: cartItem.price },
                            cartItem.qty || 1
                          )
                        }
                        style={styles.modalProductLeft}
                      >
                        <View
                          style={[
                            styles.checkboxSquare,
                            isSelected && styles.checkboxSquareSelected,
                          ]}
                        >
                          {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                        </View>
                        <View style={styles.modalProductThumb}>
                          <Image
                            source={getProductImageSource(cartItem, 100)}
                            style={styles.modalThumbImg}
                            contentFit="contain"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={1} style={styles.modalProdName}>
                            {cartItem.name}
                          </Text>
                          <Text style={styles.modalProdVariant}>
                            {cartItem.variantLabel} · ₹{cartItem.price}
                          </Text>
                        </View>
                      </Pressable>

                      {isSelected && (
                        <View style={styles.qtyCounterRow}>
                          <Pressable
                            onPress={() => updateItemQty(cartItem.productId, cartItem.variantId, -1)}
                            style={styles.qtyBtn}
                          >
                            <Text style={styles.qtyBtnText}>-</Text>
                          </Pressable>
                          <Text style={styles.qtyText}>{selectedQty}</Text>
                          <Pressable
                            onPress={() => updateItemQty(cartItem.productId, cartItem.variantId, 1)}
                            style={styles.qtyBtn}
                          >
                            <Text style={styles.qtyBtnText}>+</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}

            {createSourceTab === 'search' && (
              <>
                {searchResults.map((prod) => {
                  const variant = prod.variants?.[0];
                  if (!variant) return null;
                  const key = `${prod.id}:${variant.id}`;
                  const isSelected = Boolean(selectedItems[key]);
                  const selectedQty = selectedItems[key]?.qty || 1;

                  return (
                    <View key={key} style={styles.modalProductRow}>
                      <Pressable
                        onPress={() => toggleItemSelection(prod, variant)}
                        style={styles.modalProductLeft}
                      >
                        <View
                          style={[
                            styles.checkboxSquare,
                            isSelected && styles.checkboxSquareSelected,
                          ]}
                        >
                          {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                        </View>
                        <View style={styles.modalProductThumb}>
                          <Image
                            source={getProductImageSource(prod, 100)}
                            style={styles.modalThumbImg}
                            contentFit="contain"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={1} style={styles.modalProdName}>
                            {prod.name}
                          </Text>
                          <Text style={styles.modalProdVariant}>
                            {variant.label} · ₹{variant.offerPrice ?? variant.price}
                          </Text>
                        </View>
                      </Pressable>

                      {isSelected && (
                        <View style={styles.qtyCounterRow}>
                          <Pressable
                            onPress={() => updateItemQty(prod.id, variant.id, -1)}
                            style={styles.qtyBtn}
                          >
                            <Text style={styles.qtyBtnText}>-</Text>
                          </Pressable>
                          <Text style={styles.qtyText}>{selectedQty}</Text>
                          <Pressable
                            onPress={() => updateItemQty(prod.id, variant.id, 1)}
                            style={styles.qtyBtn}
                          >
                            <Text style={styles.qtyBtnText}>+</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>

          {/* Modal Bottom Save Action */}
          <View style={styles.modalFooter}>
            <Text style={styles.selectedCountText}>
              {Object.keys(selectedItems).length} item(s) selected
            </Text>
            <Pressable
              disabled={actionBusy || Object.keys(selectedItems).length === 0}
              onPress={handleSaveNewList}
              style={({ pressed }) => [
                styles.saveListBtn,
                (actionBusy || Object.keys(selectedItems).length === 0) && {
                  opacity: 0.5,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              {actionBusy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.saveListBtnText}>Save list</Text>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ================= LIST DETAILS MODAL ================= */}
      <Modal
        visible={Boolean(activeListDetail)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveListDetail(null)}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          {activeListDetail && (
            <>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={styles.modalTitle}>
                    {activeListDetail.name}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {activeListDetail.totalQty} items · approx. ₹{activeListDetail.approxTotal}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setActiveListDetail(null)}
                  hitSlop={12}
                  style={styles.modalCloseBtn}
                >
                  <X size={22} color="#0f172a" />
                </Pressable>
              </View>

              {/* Items List */}
              <ScrollView contentContainerStyle={styles.modalScrollContent}>
                {(activeListDetail.items || []).map((item, idx) => {
                  const prod = productDetailsMap[item.productId] || item.product || item;
                  const source = getProductImageSource(prod, 120);
                  const price = item.price || (prod?.variants?.[0]?.offerPrice ?? prod?.variants?.[0]?.price ?? 0);
                  const label = item.variantLabel || prod?.variants?.[0]?.label || '';

                  return (
                    <View key={`detail-item-${idx}`} style={styles.detailItemRow}>
                      <View style={styles.detailThumbBox}>
                        {source ? (
                          <Image source={source} style={styles.thumbImg} contentFit="contain" />
                        ) : (
                          <ShoppingBag size={18} color="#94a3b8" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={styles.detailProdName}>
                          {item.name || prod?.name || 'Product'}
                        </Text>
                        <Text style={styles.detailProdVariant}>
                          {label ? `${label} · ` : ''}Qty: {item.qty || 1}
                        </Text>
                      </View>
                      <Text style={styles.detailItemPrice}>
                        ₹{Math.round(price * (item.qty || 1))}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Footer actions: Add All to cart and Delete/Save */}
              <View style={styles.detailFooter}>
                <Pressable
                  disabled={actionBusy}
                  onPress={() => {
                    if (activeListDetail.isSavedList) {
                      handleAddAllSavedList(activeListDetail);
                    } else if (activeListDetail.isPastOrder) {
                      handleAddAllPastOrder(activeListDetail.order);
                    } else if (activeListDetail.isCurated) {
                      handleAddAllCuratedList(activeListDetail);
                    }
                    setActiveListDetail(null);
                  }}
                  style={({ pressed }) => [
                    styles.saveListBtn,
                    pressed && { opacity: 0.8 },
                    actionBusy && { opacity: 0.6 },
                  ]}
                >
                  <Text style={styles.saveListBtnText}>Add all to cart</Text>
                </Pressable>

                {activeListDetail.isSavedList && (
                  <Pressable
                    onPress={() => handleDeleteList(activeListDetail)}
                    style={styles.deleteListBtn}
                  >
                    <Trash2 size={16} color="#dc2626" style={{ marginRight: 6 }} />
                    <Text style={styles.deleteListText}>Delete this list</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f6f3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f3f6f3',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 10,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: '#0f172a',
  },
  newListHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#087f46',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  newListHeaderText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#087f46',
  },
  subtitleText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#64748b',
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* List Card Matching Image 4 */
  listCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#edf2ed',
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#0f172a',
  },
  cardSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#64748b',
    marginTop: 3,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  thumbnailsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  thumbBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: {
    width: 34,
    height: 34,
  },
  thumbExtraText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#64748b',
    marginLeft: 6,
  },
  addAllBtn: {
    backgroundColor: '#eaf6ee',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addAllText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#047857',
  },

  /* Empty state */
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#edf2ed',
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eaf6ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Start a new list Section Matching Image 4 */
  startListSection: {
    marginTop: 14,
    paddingHorizontal: 16,
  },
  startListTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#0f172a',
    marginBottom: 14,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionChip: {
    borderWidth: 1.2,
    borderColor: '#86efac',
    borderStyle: 'dashed',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  suggestionChipText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#047857',
  },

  /* Modal Styles */
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontWeight: 'normal',
    fontSize: 18,
    color: '#0f172a',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalNameInputWrap: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
  },
  inputLabel: {
    fontFamily: fonts.medium,
    fontWeight: 'normal',
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  modalTextInput: {
    height: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: fonts.medium,
    color: '#0f172a',
  },
  tabBarRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  tabBtnActive: {
    backgroundColor: '#087f46',
  },
  tabBtnText: {
    fontFamily: fonts.medium,
    fontWeight: 'normal',
    fontSize: 12.5,
    color: '#475569',
  },
  tabBtnTextActive: {
    color: '#ffffff',
    fontFamily: fonts.bold,
  },
  modalScrollContent: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    paddingBottom: 40,
  },
  searchBoxWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontFamily: fonts.regular,
  },
  emptyTabText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 24,
  },
  modalProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalProductLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxSquareSelected: {
    backgroundColor: '#087f46',
    borderColor: '#087f46',
  },
  modalProductThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalThumbImg: {
    width: 32,
    height: 32,
  },
  modalProdName: {
    fontFamily: fonts.medium,
    fontWeight: 'normal',
    fontSize: 14,
    color: '#0f172a',
  },
  modalProdVariant: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  qtyCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  qtyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qtyBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#087f46',
  },
  qtyText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#0f172a',
    paddingHorizontal: 6,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  selectedCountText: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
  saveListBtn: {
    backgroundColor: '#087f46',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveListBtnText: {
    fontFamily: fonts.bold,
    fontWeight: 'normal',
    fontSize: 15,
    color: '#ffffff',
  },

  /* List detail modal items */
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailThumbBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailProdName: {
    fontFamily: fonts.bold,
    fontWeight: 'normal',
    fontSize: 14.5,
    color: '#0f172a',
  },
  detailProdVariant: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 2,
  },
  detailItemPrice: {
    fontFamily: fonts.bold,
    fontWeight: 'normal',
    fontSize: 14.5,
    color: '#0f172a',
    marginLeft: 8,
  },
  detailFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  deleteListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  deleteListText: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: '#dc2626',
  },
});
