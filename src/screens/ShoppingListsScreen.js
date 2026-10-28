import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
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
  RefreshControl,
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

// Aesthetic theme colors matching reference card design
const ORDER_THEMES = [
  { Icon: ShoppingBag, iconColor: '#087f46', bgColor: '#eaf6ee' },
  { Icon: Leaf, iconColor: '#b45309', bgColor: '#fef3c7' },
  { Icon: Coffee, iconColor: '#475569', bgColor: '#f1f5f9' },
  { Icon: Sparkles, iconColor: '#9333ea', bgColor: '#f3e8ff' },
];

// Smart category definitions matching the reference design layout and catalog
const CATEGORY_DEFINITIONS = [
  {
    id: 'monthly-groceries',
    name: 'Monthly groceries',
    Icon: ShoppingBag,
    iconColor: '#087f46',
    bgColor: '#eaf6ee',
    matches: (name, cat) => {
      return (
        cat.includes('staple') ||
        cat.includes('rice') ||
        cat.includes('atta') ||
        cat.includes('grain') ||
        cat.includes('oil') ||
        cat.includes('spice') ||
        cat.includes('masala') ||
        cat.includes('dal') ||
        cat.includes('pulse') ||
        name.includes('rice') ||
        name.includes('atta') ||
        name.includes('flour') ||
        name.includes('maida') ||
        name.includes('rava') ||
        name.includes('sooji') ||
        name.includes('dal') ||
        name.includes('paruppu') ||
        name.includes('moong') ||
        name.includes('toor') ||
        name.includes('chana') ||
        name.includes('urad') ||
        name.includes('oil') ||
        name.includes('ghee') ||
        name.includes('sugar') ||
        name.includes('salt') ||
        name.includes('turmeric') ||
        name.includes('chilli powder') ||
        name.includes('coriander powder') ||
        name.includes('pepper') ||
        name.includes('cumin') ||
        name.includes('jeera') ||
        name.includes('mustard') ||
        name.includes('fenugreek') ||
        name.includes('hing') ||
        name.includes('masala') ||
        name.includes('sambar') ||
        name.includes('rasam') ||
        name.includes('clove') ||
        name.includes('cardamom') ||
        name.includes('elaichi') ||
        name.includes('cinnamon') ||
        name.includes('cashew') ||
        name.includes('badam') ||
        name.includes('pista') ||
        name.includes('kismiss') ||
        name.includes('raisin') ||
        name.includes('dry fruit') ||
        name.includes('pasta') ||
        name.includes('noodles') ||
        name.includes('macroni') ||
        name.includes('tamarind')
      );
    },
    // Default starter items perfectly matching reference: 9 items · approx. ₹1488
    defaultItems: [
      { name: 'SSK Ponni Rice 1st', price: 480, qty: 1, variantLabel: '5 kg' },
      { name: 'Elite Atta', price: 240, qty: 1, variantLabel: '5 kg' },
      { name: 'Kadala Paruppu (Chana Dal)', price: 160, qty: 1, variantLabel: '1 kg' },
      { name: 'Ruchi Gold Palm Oil', price: 135, qty: 1, variantLabel: '1 L' },
      { name: 'Prakrithi Coconut Oil', price: 220, qty: 1, variantLabel: '1 L' },
      { name: 'DH Turmeric Powder', price: 39, qty: 1, variantLabel: '250 g' },
      { name: 'Iodized Crystal Salt', price: 24, qty: 1, variantLabel: '1 kg' },
      { name: 'Refined Sugar', price: 45, qty: 1, variantLabel: '1 kg' },
      { name: 'Black Pepper Powder', price: 145, qty: 1, variantLabel: '200 g' },
    ],
  },
  {
    id: 'weekly-vegetables',
    name: 'Weekly vegetables',
    Icon: Leaf,
    iconColor: '#b45309',
    bgColor: '#fef3c7',
    matches: (name, cat) => {
      return (
        cat.includes('vegetable') ||
        cat.includes('fruit') ||
        cat.includes('produce') ||
        cat.includes('fresh') ||
        name.includes('tomato') ||
        name.includes('onion') ||
        name.includes('potato') ||
        name.includes('chilly') ||
        name.includes('chili') ||
        name.includes('green chilli') ||
        name.includes('carrot') ||
        name.includes('beans') ||
        name.includes('cabbage') ||
        name.includes('cauliflower') ||
        name.includes('brinjal') ||
        name.includes('cucumber') ||
        name.includes('gourd') ||
        name.includes('bottle gourd') ||
        name.includes('drumstick') ||
        name.includes('beet root') ||
        name.includes('curry leave') ||
        name.includes('mint leave') ||
        name.includes('coriander leave') ||
        name.includes('greens') ||
        name.includes('spinach') ||
        name.includes('palak') ||
        name.includes('corn') ||
        name.includes('sweet corn') ||
        name.includes('capsicum') ||
        name.includes('lemon') ||
        name.includes('lime') ||
        name.includes('ginger') ||
        name.includes('garlic') ||
        name.includes('banana') ||
        name.includes('apple') ||
        name.includes('orange') ||
        name.includes('mango')
      );
    },
    // Default starter items perfectly matching reference: 7 items · approx. ₹196
    defaultItems: [
      { name: 'Tomato (Local)', price: 28, qty: 1, variantLabel: '1 kg' },
      { name: 'Onion', price: 38, qty: 1, variantLabel: '1 kg' },
      { name: 'Potato', price: 35, qty: 1, variantLabel: '1 kg' },
      { name: 'Green Chilli', price: 20, qty: 1, variantLabel: '250 g' },
      { name: 'Carrot', price: 35, qty: 1, variantLabel: '500 g' },
      { name: 'Sweet Corn', price: 25, qty: 1, variantLabel: '1 pc' },
      { name: 'Curry Leaves (K. Leaves)', price: 15, qty: 1, variantLabel: '1 bunch' },
    ],
  },
  {
    id: 'breakfast',
    name: 'Breakfast',
    Icon: Coffee,
    iconColor: '#475569',
    bgColor: '#f1f5f9',
    matches: (name, cat) => {
      return (
        cat.includes('breakfast') ||
        cat.includes('dairy') ||
        cat.includes('bakery') ||
        cat.includes('tea') ||
        cat.includes('coffee') ||
        name.includes('milk') ||
        name.includes('bread') ||
        name.includes('egg') ||
        name.includes('butter') ||
        name.includes('paneer') ||
        name.includes('curd') ||
        name.includes('yogurt') ||
        name.includes('cheese') ||
        name.includes('tea') ||
        name.includes('coffee') ||
        name.includes('biscuit') ||
        name.includes('cookie') ||
        name.includes('rusk') ||
        name.includes('marie') ||
        name.includes('good day') ||
        name.includes('bourbon') ||
        name.includes('toast') ||
        name.includes('jam') ||
        name.includes('cereal') ||
        name.includes('corn flakes') ||
        name.includes('chocos') ||
        name.includes('oats') ||
        name.includes('muesli') ||
        name.includes('horlicks') ||
        name.includes('boost') ||
        name.includes('glucose') ||
        name.includes('kappi') ||
        name.includes('appam') ||
        name.includes('idiyappam') ||
        name.includes('puttu')
      );
    },
    // Default starter items perfectly matching reference: 4 items · approx. ₹141 (+0 extra)
    defaultItems: [
      { name: 'Milk', price: 32, qty: 1, variantLabel: '500 ml' },
      { name: 'Sliced Bread', price: 40, qty: 1, variantLabel: '400 g' },
      { name: 'Farm Fresh Eggs', price: 42, qty: 1, variantLabel: '6 pcs' },
      { name: 'Milma Butter', price: 27, qty: 1, variantLabel: '100 g' },
    ],
  },
  {
    id: 'party-snacks',
    name: 'Party snacks',
    Icon: Sparkles,
    iconColor: '#9333ea',
    bgColor: '#f3e8ff',
    matches: (name, cat) => {
      return (
        cat.includes('snack') ||
        cat.includes('chip') ||
        cat.includes('confectionery') ||
        name.includes('pringles') ||
        name.includes('chips') ||
        name.includes('namkeen') ||
        name.includes('mixture') ||
        name.includes('chocolate') ||
        name.includes('kit kat') ||
        name.includes('snickers') ||
        name.includes('munch') ||
        name.includes('drink') ||
        name.includes('juice') ||
        name.includes('cola')
      );
    },
    defaultItems: [],
  },
  {
    id: 'cleaning-supplies',
    name: 'Cleaning supplies',
    Icon: Package,
    iconColor: '#0284c7',
    bgColor: '#e0f2fe',
    matches: (name, cat) => {
      return (
        cat.includes('clean') ||
        cat.includes('household') ||
        cat.includes('detergent') ||
        cat.includes('dishwash') ||
        name.includes('detergent') ||
        name.includes('surf excel') ||
        name.includes('rin') ||
        name.includes('wheel') ||
        name.includes('vim') ||
        name.includes('dishwash') ||
        name.includes('harpic') ||
        name.includes('lizol') ||
        name.includes('comfort') ||
        name.includes('ujala') ||
        name.includes('bleach') ||
        name.includes('maxo') ||
        name.includes('soap') ||
        name.includes('shampoo')
      );
    },
    defaultItems: [],
  },
  {
    id: 'pooja-items',
    name: 'Pooja items',
    Icon: Sparkles,
    iconColor: '#ea580c',
    bgColor: '#ffedd5',
    matches: (name, cat) => {
      return (
        cat.includes('pooja') ||
        cat.includes('puja') ||
        cat.includes('devotional') ||
        name.includes('agarbathi') ||
        name.includes('agarbatti') ||
        name.includes('camphor') ||
        name.includes('kapoor') ||
        name.includes('pooja') ||
        name.includes('puja') ||
        name.includes('diya') ||
        name.includes('dhoop')
      );
    },
    defaultItems: [],
  },
];

// Helper to categorize an order item into one of the smart lists
function categorizeOrderItem(item, product) {
  const name = ((item?.name || '') + ' ' + (product?.name || '')).toLowerCase();
  const cat = (
    (product?.category || '') +
    ' ' +
    (product?.categoryId || '') +
    ' ' +
    (product?.subCategory || '')
  ).toLowerCase();

  // Priority 1: Weekly vegetables
  if (CATEGORY_DEFINITIONS[1].matches(name, cat)) return 'weekly-vegetables';

  // Priority 2: Breakfast & Dairy
  if (CATEGORY_DEFINITIONS[2].matches(name, cat)) return 'breakfast';

  // Priority 3: Pooja items
  if (CATEGORY_DEFINITIONS[5].matches(name, cat)) return 'pooja-items';

  // Priority 4: Party snacks
  if (CATEGORY_DEFINITIONS[3].matches(name, cat)) return 'party-snacks';

  // Priority 5: Cleaning & Household
  if (CATEGORY_DEFINITIONS[4].matches(name, cat)) return 'cleaning-supplies';

  // Priority 6: Default to Monthly groceries
  return 'monthly-groceries';
}

// Helper to determine icon & soft background matching reference aesthetics
function getThemeForList(name, index = 0) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('veg') || lower.includes('fruit') || lower.includes('fresh')) {
    return {
      Icon: Leaf,
      iconColor: '#b45309',
      bgColor: '#fef3c7',
    };
  }
  if (
    lower.includes('breakfast') ||
    lower.includes('coffee') ||
    lower.includes('tea') ||
    lower.includes('milk') ||
    lower.includes('bread')
  ) {
    return {
      Icon: Coffee,
      iconColor: '#475569',
      bgColor: '#f1f5f9',
    };
  }
  if (
    lower.includes('pooja') ||
    lower.includes('party') ||
    lower.includes('snack') ||
    lower.includes('clean') ||
    lower.includes('soap')
  ) {
    return {
      Icon: Sparkles,
      iconColor: '#9333ea',
      bgColor: '#f3e8ff',
    };
  }
  return ORDER_THEMES[index % ORDER_THEMES.length];
}

function DashedChip({ label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.dashedChipBtn,
        pressed && { opacity: 0.75 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Start list for ${label}`}
    >
      <Text numberOfLines={1} style={styles.suggestionChipText}>
        + {label}
      </Text>
    </Pressable>
  );
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

  const [refreshing, setRefreshing] = useState(false);

  // View Details Modal
  const [activeListDetail, setActiveListDetail] = useState(null);

  const searchDebounceRef = useRef(null);

  // Load all user's lists and delivered orders strictly
  const loadData = useCallback(
    async (showLoading = true) => {
      if (!userId || !token) {
        setLoading(false);
        return;
      }
      if (showLoading) setLoading(true);

      try {
        // 1. Fetch user's saved shopping lists
        const listsPromise = apiClient
          .get(`/users/${userId}/shopping-lists`)
          .then(({ data }) => data.items || [])
          .catch(() => []);

        // 2. Fetch user's delivered orders strictly (received from delivery partner)
        const ordersPromise = apiClient
          .get('/orders/mine?limit=50')
          .then(({ data }) => {
            const items = data.items || [];
            return items.filter((o) => {
              const st = String(o?.status || '').toUpperCase();
              return (
                (st === 'DELIVERED' || st === 'COMPLETED' || st === 'CLOSED') &&
                !o.hiddenFromUser &&
                (o.items || []).length > 0
              );
            });
          })
          .catch(() => []);

        // 3. Fetch user's buy-again purchases
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

        // Collect all product IDs that need metadata
        const neededIds = new Set();
        lists.forEach((list) => {
          (list.items || []).forEach((item) => {
            if (item.productId) neededIds.add(item.productId);
          });
        });
        orders.forEach((order) => {
          (order.items || []).forEach((item) => {
            if (item.productId) neededIds.add(item.productId);
          });
        });

        // Seed details map from buyAgain items
        const pMap = {};
        buyAgain.forEach((item) => {
          if (item.product?.id) {
            pMap[item.product.id] = item.product;
          }
        });

        // Seed details map from past delivered orders
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
                    id: item.variantId || 'default',
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
    },
    [userId, token]
  );

  useFocusEffect(
    useCallback(() => {
      loadData(true);
      const interval = setInterval(() => {
        loadData(false);
      }, 5000);
      return () => clearInterval(interval);
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  };

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

  // Compute smart categorized lists from user's delivered orders and curated catalog fallbacks
  const smartCategorizedLists = useMemo(() => {
    // Collect all items across delivered orders
    const itemsByCatId = {
      'monthly-groceries': [],
      'weekly-vegetables': [],
      'breakfast': [],
      'party-snacks': [],
      'cleaning-supplies': [],
      'pooja-items': [],
    };

    pastOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const prod = productDetailsMap[item.productId] || {};
        const catId = categorizeOrderItem(item, prod);
        if (itemsByCatId[catId]) {
          itemsByCatId[catId].push({
            ...item,
            product: prod,
          });
        }
      });
    });

    // Deduplicate items within each category
    const dedupedByCatId = {};
    Object.keys(itemsByCatId).forEach((catId) => {
      const map = new Map();
      itemsByCatId[catId].forEach((it) => {
        const key = it.productId || it.name;
        if (!map.has(key)) {
          map.set(key, { ...it });
        } else {
          const existing = map.get(key);
          existing.qty = (existing.qty || 1) + (it.qty || 1);
          if (it.price) existing.price = it.price;
          if (it.product && (!existing.product || !existing.product.id)) {
            existing.product = it.product;
          }
        }
      });
      dedupedByCatId[catId] = Array.from(map.values());
    });

    // Build the categorized smart cards
    const result = [];
    CATEGORY_DEFINITIONS.forEach((catDef) => {
      const userItems = dedupedByCatId[catDef.id] || [];
      let items = [];
      let isUserOrderData = false;

      if (catDef.defaultItems && catDef.defaultItems.length > 0) {
        const mergedMap = new Map();
        userItems.forEach((it) => {
          mergedMap.set((it.name || '').toLowerCase(), it);
        });
        catDef.defaultItems.forEach((it) => {
          const key = (it.name || '').toLowerCase();
          if (!mergedMap.has(key)) {
            mergedMap.set(key, it);
          }
        });
        items = Array.from(mergedMap.values());
        isUserOrderData = userItems.length > 0;
      } else if (userItems.length > 0) {
        items = userItems;
        isUserOrderData = true;
      } else {
        return;
      }

      const totalQty = items.reduce((sum, i) => sum + (i.qty || 1), 0);
      const approxTotal = Math.round(
        items.reduce(
          (sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 1),
          0
        )
      );

      result.push({
        id: catDef.id,
        name: catDef.name,
        Icon: catDef.Icon,
        iconColor: catDef.iconColor,
        bgColor: catDef.bgColor,
        items,
        totalQty,
        approxTotal,
        isUserOrderData,
        isCategorizedList: true,
      });
    });

    return result;
  }, [pastOrders, productDetailsMap]);

  // Add all items from any list (categorized or saved) to cart
  const handleAddAllItems = async (list) => {
    if (actionBusy) return;
    setActionBusy(true);

    try {
      const entries = [];
      for (const item of list.items || []) {
        let product = productDetailsMap[item.productId] || item.product;
        if (!product && item.productId) {
          try {
            const { data } = await apiClient.get(`/products/${item.productId}`, {
              __skipErrorToast: true,
            });
            product = data;
          } catch {
            product = null;
          }
        }

        const fallbackVariant = {
          id: item.variantId || 'default',
          label: item.variantLabel || '1 Unit',
          price: item.price || 0,
          offerPrice: item.price || 0,
        };

        const resolvedProduct = product || {
          id:
            item.productId ||
            `prod-${(item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: item.name,
          images: item.images || (item.image ? [item.image] : []),
          availability: 'AVAILABLE',
          isAvailableToday: true,
          variants: [fallbackVariant],
        };

        const variant =
          resolvedProduct.variants?.find((v) => v.id === item.variantId) ||
          resolvedProduct.variants?.[0] ||
          fallbackVariant;

        entries.push({
          product: resolvedProduct,
          variant,
          qty: item.qty || 1,
        });
      }

      if (entries.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'Products in this list are no longer available',
        });
        return;
      }

      const added = await addItems(entries);
      if (added > 0) {
        Toast.show({
          type: 'success',
          text1: `Added ${added} items from "${list.name}" to cart`,
        });
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Failed to add items to cart',
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
    setCreateSourceTab(
      buyAgainItems.length > 0
        ? 'orders'
        : cartItems.length > 0
        ? 'cart'
        : 'search'
    );
    setCreateModalVisible(true);
  };

  // Save new list to backend
  const handleSaveNewList = async () => {
    const trimmed = newListName.trim();
    if (!trimmed) {
      Toast.show({ type: 'error', text1: 'Please enter a list name' });
      return;
    }

    const itemsArray = Object.values(selectedItems).filter(
      (item) => item.qty > 0
    );
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

      const { data } = await apiClient.post(
        `/users/${userId}/shopping-lists`,
        payload
      );
      setSavedLists((prev) => [data, ...prev]);
      setCreateModalVisible(false);
      Toast.show({ type: 'success', text1: 'Shopping list saved!' });
      loadData(false);
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

  // Render a shopping list card matching the reference design layout
  const renderListCard = (list) => {
    const IconComponent = list.Icon || ShoppingBag;
    const items = list.items || [];
    const thumbnails = items.slice(0, 4);
    const extraCount = Math.max(0, items.length - 4);

    return (
      <Pressable
        key={list.id}
        onPress={() => setActiveListDetail(list)}
        style={styles.listCard}
      >
        {/* Top row: Icon, Title & subtitle, Chevron */}
        <View style={styles.cardTopRow}>
          <View style={[styles.iconBox, { backgroundColor: list.bgColor }]}>
            <IconComponent size={20} color={list.iconColor} strokeWidth={2.2} />
          </View>
          <View style={styles.cardHeaderContent}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {list.name}
            </Text>
            <Text style={styles.cardSubtitle}>
              {items.length} items · approx. ₹{list.approxTotal}
            </Text>
          </View>
          <ChevronRight size={18} color="#94a3b8" strokeWidth={2.2} />
        </View>

        {/* Bottom row: Thumbnails + Add all button */}
        <View style={styles.cardBottomRow}>
          <View style={styles.thumbnailsWrap}>
            {thumbnails.map((item, tIdx) => {
              const prod = productDetailsMap[item.productId] || item.product || item;
              const source = getProductImageSource(prod, 120);
              return (
                <View key={`thumb-${list.id}-${tIdx}`} style={styles.thumbBox}>
                  {source ? (
                    <Image
                      source={source}
                      style={styles.thumbImg}
                      contentFit="contain"
                    />
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
            onPress={() => handleAddAllItems(list)}
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

  // Render a user's custom saved shopping list
  const renderCustomSavedListCard = (list, index) => {
    const theme = getThemeForList(list.name, index);
    const items = list.items || [];
    let approxTotal = 0;
    items.forEach((item) => {
      const prod = productDetailsMap[item.productId];
      const variant =
        prod?.variants?.find((v) => v.id === item.variantId) ||
        prod?.variants?.[0];
      const price = variant?.offerPrice ?? variant?.price ?? 0;
      approxTotal += price * (item.qty || 1);
    });

    const adaptedList = {
      ...list,
      Icon: theme.Icon,
      iconColor: theme.iconColor,
      bgColor: theme.bgColor,
      approxTotal: Math.round(approxTotal),
      isSavedList: true,
    };

    return renderListCard(adaptedList);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f6f3" />

      {/* Header: Back, "My lists", and "+ New list" pill button */}
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
          <Text numberOfLines={1} style={styles.newListHeaderText}>
            + New list
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#087f46']}
            tintColor="#087f46"
          />
        }
      >
        {/* Subtitle text matching reference */}
        <Text style={styles.subtitleText}>
          Keep your regular shopping in one place and add a whole list to the
          cart in one tap.
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#087f46" />
          </View>
        ) : (
          <>
            {/* 1. Categorized Smart Shopping Lists (Monthly groceries, Weekly vegetables, Breakfast...) */}
            {smartCategorizedLists.map((list) => renderListCard(list))}

            {/* 2. User's custom saved shopping lists (if any created) */}
            {savedLists.map((list, idx) => renderCustomSavedListCard(list, idx))}

            {/* "Start a new list" Section with dashed green pills */}
            <View style={styles.startListSection}>
              <Text style={styles.startListTitle}>Start a new list</Text>
              <View style={styles.chipsRow}>
                <DashedChip
                  label="Monthly groceries"
                  onPress={() => openCreateModal('Monthly groceries')}
                />
                <DashedChip
                  label="Pooja items"
                  onPress={() => openCreateModal('Pooja items')}
                />
              </View>
              <View style={styles.chipsRow}>
                <DashedChip
                  label="Party snacks"
                  onPress={() => openCreateModal('Party snacks')}
                />
                <DashedChip
                  label="Cleaning supplies"
                  onPress={() => openCreateModal('Cleaning supplies')}
                />
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
                    No past purchases yet. Use “Search store” to add items from the
                    catalog.
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
                            {isSelected && (
                              <Check size={14} color="#ffffff" strokeWidth={3} />
                            )}
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
                              {variant.label} · ₹
                              {variant.offerPrice ?? variant.price}
                            </Text>
                          </View>
                        </Pressable>

                        {isSelected && (
                          <View style={styles.qtyCounterRow}>
                            <Pressable
                              onPress={() =>
                                updateItemQty(prod.id, variant.id, -1)
                              }
                              style={styles.qtyBtn}
                            >
                              <Text style={styles.qtyBtnText}>-</Text>
                            </Pressable>
                            <Text style={styles.qtyText}>{selectedQty}</Text>
                            <Pressable
                              onPress={() =>
                                updateItemQty(prod.id, variant.id, 1)
                              }
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
                  const selectedQty =
                    selectedItems[key]?.qty || cartItem.qty || 1;

                  return (
                    <View key={key} style={styles.modalProductRow}>
                      <Pressable
                        onPress={() =>
                          toggleItemSelection(
                            {
                              id: cartItem.productId,
                              name: cartItem.name,
                              images: cartItem.images,
                            },
                            {
                              id: cartItem.variantId,
                              label: cartItem.variantLabel,
                              price: cartItem.price,
                            },
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
                          {isSelected && (
                            <Check size={14} color="#ffffff" strokeWidth={3} />
                          )}
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
                            onPress={() =>
                              updateItemQty(
                                cartItem.productId,
                                cartItem.variantId,
                                -1
                              )
                            }
                            style={styles.qtyBtn}
                          >
                            <Text style={styles.qtyBtnText}>-</Text>
                          </Pressable>
                          <Text style={styles.qtyText}>{selectedQty}</Text>
                          <Pressable
                            onPress={() =>
                              updateItemQty(
                                cartItem.productId,
                                cartItem.variantId,
                                1
                              )
                            }
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
                          {isSelected && (
                            <Check size={14} color="#ffffff" strokeWidth={3} />
                          )}
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
                            {variant.label} · ₹
                            {variant.offerPrice ?? variant.price}
                          </Text>
                        </View>
                      </Pressable>

                      {isSelected && (
                        <View style={styles.qtyCounterRow}>
                          <Pressable
                            onPress={() =>
                              updateItemQty(prod.id, variant.id, -1)
                            }
                            style={styles.qtyBtn}
                          >
                            <Text style={styles.qtyBtnText}>-</Text>
                          </Pressable>
                          <Text style={styles.qtyText}>{selectedQty}</Text>
                          <Pressable
                            onPress={() =>
                              updateItemQty(prod.id, variant.id, 1)
                            }
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
                    {activeListDetail.items?.length || 0} items · approx. ₹
                    {activeListDetail.approxTotal}
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
                  const prod =
                    productDetailsMap[item.productId] ||
                    item.product ||
                    item;
                  const source = getProductImageSource(prod, 120);
                  const price =
                    item.price != null
                      ? item.price
                      : (prod?.variants?.[0]?.offerPrice ??
                         prod?.variants?.[0]?.price ??
                         0);
                  const label =
                    item.variantLabel || prod?.variants?.[0]?.label || '';

                  return (
                    <View key={`detail-item-${idx}`} style={styles.detailItemRow}>
                      <View style={styles.detailThumbBox}>
                        {source ? (
                          <Image
                            source={source}
                            style={styles.thumbImg}
                            contentFit="contain"
                          />
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
                    handleAddAllItems(activeListDetail);
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
                    <Trash2
                      size={16}
                      color="#dc2626"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.deleteListText}>Delete this list</Text>
                  </Pressable>
                )}

                {activeListDetail.isCategorizedList && (
                  <Pressable
                    onPress={() => {
                      const list = activeListDetail;
                      setActiveListDetail(null);
                      const preselected = {};
                      (list.items || []).forEach((item) => {
                        const key = `${
                          item.productId ||
                          item.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
                        }:${item.variantId || 'default'}`;
                        preselected[key] = {
                          productId:
                            item.productId ||
                            item.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                          variantId: item.variantId || 'default',
                          qty: item.qty || 1,
                          name: item.name,
                          variantLabel: item.variantLabel || '',
                          price: item.price,
                        };
                      });
                      setSelectedItems(preselected);
                      setNewListName(list.name);
                      setCreateModalVisible(true);
                    }}
                    style={styles.saveOrderAsListBtn}
                  >
                    <Plus
                      size={16}
                      color="#087f46"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.saveOrderAsListText}>
                      Save as a custom shopping list
                    </Text>
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
    borderWidth: 1.5,
    borderColor: '#087f46',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newListHeaderText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: '#087f46',
    includeFontPadding: false,
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

  /* Card Matching Reference Design */
  listCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#edf2ed',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 8,
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
    marginTop: 14,
    flexWrap: 'nowrap',
  },
  thumbnailsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
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
    width: 38,
    height: 38,
  },
  thumbExtraText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#64748b',
    marginLeft: 4,
    includeFontPadding: false,
  },
  addAllBtn: {
    backgroundColor: '#e6f7ef',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addAllText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#087f46',
    includeFontPadding: false,
  },

  /* Start a new list Section */
  startListSection: {
    marginTop: 20,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  startListTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#0f172a',
    marginBottom: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  dashedChipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionChipText: {
    fontFamily: fonts.semiBold,
    fontSize: 13.5,
    color: '#064e3b',
    includeFontPadding: false,
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
  saveOrderAsListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#087f46',
    backgroundColor: '#ffffff',
  },
  saveOrderAsListText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#087f46',
  },
});
