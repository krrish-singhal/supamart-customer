import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  Search,
  RotateCcw,
  ShoppingBag,
  Plus,
  Minus,
  X,
  Package,
} from '../components/icons';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { useCart } from '../context/CartContext';
import { getProductImageSource } from '../utils/productImages';
import { isProductUnavailable } from '../utils/productAvailability';
import { fonts } from '../theme/typography';

function formatOrderDate(timestamp) {
  if (!timestamp) return 'Recent';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Recent';
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'short' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-IN', { month: 'short' });
  return `${weekday}, ${day} ${month}`;
}

function formatShortDate(timestamp) {
  if (!timestamp) return 'Recent';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Recent';
  const day = date.getDate();
  const month = date.toLocaleDateString('en-IN', { month: 'short' });
  return `${day} ${month}`;
}

function getDisplayCategory(rawCat, prodName = '') {
  const cat = (rawCat || '').toLowerCase();
  const name = (prodName || '').toLowerCase();

  if (
    cat.includes('veg') ||
    cat.includes('green') ||
    cat.includes('gourd') ||
    cat.includes('onion') ||
    cat.includes('potato') ||
    cat.includes('chilli') ||
    name.includes('tomato') ||
    name.includes('onion') ||
    name.includes('potato') ||
    name.includes('carrot') ||
    name.includes('cabbage') ||
    name.includes('cauliflower') ||
    name.includes('ginger') ||
    name.includes('garlic')
  ) {
    return 'Vegetables';
  }
  if (
    cat.includes('dairy') ||
    cat.includes('milk') ||
    cat.includes('butter') ||
    cat.includes('paneer') ||
    cat.includes('egg') ||
    cat.includes('cheese') ||
    name.includes('milk') ||
    name.includes('butter') ||
    name.includes('paneer') ||
    name.includes('egg') ||
    name.includes('curd') ||
    name.includes('ghee')
  ) {
    return 'Dairy & eggs';
  }
  if (
    cat.includes('rice') ||
    cat.includes('atta') ||
    cat.includes('grain') ||
    cat.includes('dal') ||
    cat.includes('pulse') ||
    cat.includes('flour') ||
    cat.includes('rava') ||
    name.includes('rice') ||
    name.includes('atta') ||
    name.includes('dal') ||
    name.includes('maida') ||
    name.includes('wheat') ||
    name.includes('sugar') ||
    name.includes('salt')
  ) {
    return 'Staples';
  }
  if (
    cat.includes('spice') ||
    cat.includes('masala') ||
    name.includes('masala') ||
    name.includes('powder') ||
    name.includes('pepper') ||
    name.includes('turmeric')
  ) {
    return 'Spices & Masala';
  }
  if (cat.includes('oil') || name.includes('oil')) {
    return 'Cooking Oils';
  }
  if (
    cat.includes('beverage') ||
    cat.includes('tea') ||
    cat.includes('coffee') ||
    name.includes('tea') ||
    name.includes('coffee')
  ) {
    return 'Beverages';
  }
  if (
    cat.includes('clean') ||
    cat.includes('detergent') ||
    cat.includes('wash') ||
    cat.includes('soap') ||
    cat.includes('fabric') ||
    cat.includes('bleach') ||
    name.includes('surf') ||
    name.includes('vim') ||
    name.includes('tide') ||
    name.includes('dettol') ||
    name.includes('comfort')
  ) {
    return 'Household & Cleaning';
  }
  if (
    cat.includes('snack') ||
    cat.includes('biscuit') ||
    cat.includes('cookie') ||
    cat.includes('chip') ||
    cat.includes('noodle') ||
    name.includes('biscuit') ||
    name.includes('maggi')
  ) {
    return 'Snacks & Munchies';
  }
  if (
    cat.includes('personal') ||
    cat.includes('shampoo') ||
    cat.includes('face') ||
    cat.includes('oral') ||
    cat.includes('talc') ||
    name.includes('talc') ||
    name.includes('shampoo') ||
    name.includes('conditioner') ||
    name.includes('paste')
  ) {
    return 'Personal Care';
  }

  return rawCat || 'Other';
}

export default function BuyAgainScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [busyItem, setBusyItem] = useState(null);
  const [reorderingId, setReorderingId] = useState(null);
  const [addingAll, setAddingAll] = useState(false);

  const { addItem, addItems, updateQty, getQty } = useCart();

  const fetchBuyAgainData = useCallback(async (isRefresh = false) => {
    let active = true;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data } = await apiClient.get('/orders/buy-again');
      if (!active) return;

      if (
        data &&
        ((data.items && data.items.length > 0) ||
          (data.recentOrders && data.recentOrders.length > 0))
      ) {
        setItems(data.items || []);
        setRecentOrders(data.recentOrders || []);
        setTotalOrdersCount(
          data.totalOrdersCount || data.recentOrders?.length || 0
        );
        setError(false);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Client Fallback: If /orders/buy-again returned 0 items, check /orders/mine directly
      const mineRes = await apiClient.get('/orders/mine?limit=50');
      if (!active) return;
      const mineOrders = (mineRes.data?.items || []).filter(
        (o) =>
          !o.hiddenFromUser &&
          o.status !== 'CANCELLED' &&
          o.status !== 'PAYMENT_FAILED'
      );

      if (mineOrders.length > 0) {
        const historyMap = new Map();
        for (const order of mineOrders) {
          for (const it of order.items || []) {
            const key = `${it.productId}:${it.variantId}`;
            if (!historyMap.has(key)) {
              historyMap.set(key, {
                productId: it.productId,
                variantId: it.variantId,
                name: it.name || it.productName,
                variantLabel: it.variantLabel || '1 Unit',
                images: it.images || [],
                purchaseCount: 1,
                lastPurchasedAt: order.createdAt,
                lastPrice: it.price,
                product: it.product || {
                  id: it.productId,
                  name: it.name || it.productName,
                  variants: [
                    {
                      id: it.variantId || 'default',
                      label: it.variantLabel || '1 Unit',
                      price: it.price,
                      offerPrice: it.price,
                    },
                  ],
                  images: it.images || [],
                  categoryName: it.categoryName || 'Other',
                },
              });
            } else {
              const ex = historyMap.get(key);
              ex.purchaseCount = (ex.purchaseCount || 1) + 1;
            }
          }
        }
        setItems(Array.from(historyMap.values()));
        setRecentOrders(mineOrders.slice(0, 8));
        setTotalOrdersCount(mineOrders.length);
        setError(false);
      } else {
        setItems([]);
        setRecentOrders([]);
        setTotalOrdersCount(0);
      }
    } catch (err) {
      if (active) setError(true);
    } finally {
      if (active) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBuyAgainData();
    }, [fetchBuyAgainData])
  );

  // Extract clean category tabs dynamically from purchased items
  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((item) => {
      const cat = getDisplayCategory(
        item.product?.category || item.product?.categoryName,
        item.product?.name
      );
      if (cat && cat !== 'Other') {
        set.add(cat);
      }
    });
    return ['All', ...Array.from(set)];
  }, [items]);

  // Filter items by category and search query
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const product = item.product;
      if (!product) return false;

      // Category filter
      if (selectedCategory !== 'All') {
        const itemCat = getDisplayCategory(
          product.category || product.categoryName,
          product.name
        );
        if (itemCat !== selectedCategory) return false;
      }

      // Search query filter
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.trim().toLowerCase();
        const nameMatch = product.name?.toLowerCase().includes(query);
        const catMatch = (product.category || product.categoryName || '')
          .toLowerCase()
          .includes(query);
        if (!nameMatch && !catMatch) return false;
      }

      return true;
    });
  }, [items, selectedCategory, searchQuery]);

  // Available items eligible to be added to cart
  const availableItems = useMemo(() => {
    return filteredItems.filter((item) => {
      const product = item.product;
      if (!product || product.isUnavailable) return false;
      const variant =
        product?.variants?.find((v) => v.id === item.variantId) ||
        product?.variants?.[0];
      return !isProductUnavailable(product, variant);
    });
  }, [filteredItems]);

  // Compute total count and price for the bottom action bar
  const { totalAvailableCount, totalAvailablePrice } = useMemo(() => {
    let price = 0;
    availableItems.forEach((item) => {
      const product = item.product;
      const variant =
        product?.variants?.find((v) => v.id === item.variantId) ||
        product?.variants?.[0];
      const p = variant?.offerPrice ?? variant?.price ?? 0;
      price += p;
    });
    return {
      totalAvailableCount: availableItems.length,
      totalAvailablePrice: Math.round(price),
    };
  }, [availableItems]);

  // Handle re-ordering an entire past order
  const handleReorder = async (order) => {
    if (reorderingId) return;
    setReorderingId(order.id);
    try {
      const entries = [];
      for (const orderItem of order.items || []) {
        try {
          let prod = orderItem.product;
          if (!prod) {
            const { data } = await apiClient.get(`/products/${orderItem.productId}`);
            prod = data;
          }
          const variant =
            prod?.variants?.find((v) => v.id === orderItem.variantId) ||
            prod?.variants?.[0];
          if (prod && variant && !isProductUnavailable(prod, variant)) {
            entries.push({ product: prod, variant, qty: orderItem.qty || 1 });
          }
        } catch {
          // Skip unavailable items gracefully
        }
      }

      if (entries.length > 0) {
        await addItems(entries);
        Toast.show({
          type: 'success',
          text1: 'Order items added to cart',
          text2: `Added items from order #${order.orderNo}`,
        });
      } else {
        Toast.show({
          type: 'info',
          text1: 'Items unavailable',
          text2: 'The items in this order are currently out of stock.',
        });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Could not reorder items' });
    } finally {
      setReorderingId(null);
    }
  };

  // Handle adding a single item
  const handleAddItem = async (item) => {
    const itemKey = `${item.productId}:${item.variantId}`;
    if (busyItem === itemKey) return;
    setBusyItem(itemKey);
    try {
      const product = item.product;
      const variant =
        product?.variants?.find((v) => v.id === item.variantId) ||
        product?.variants?.[0];
      await addItem(product, variant);
    } catch {
      // Handled
    } finally {
      setBusyItem(null);
    }
  };

  // Handle adding all available items
  const handleAddAll = async () => {
    if (addingAll || availableItems.length === 0) return;
    setAddingAll(true);
    try {
      const entries = availableItems.map((item) => {
        const product = item.product;
        const variant =
          product?.variants?.find((v) => v.id === item.variantId) ||
          product?.variants?.[0];
        return { product, variant, qty: 1 };
      });
      await addItems(entries);
      Toast.show({
        type: 'success',
        text1: `Added ${entries.length} items to cart · ₹${totalAvailablePrice}`,
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not add all items' });
    } finally {
      setAddingAll(false);
    }
  };

  const dynamicSubtitle =
    totalOrdersCount > 0
      ? `From your last ${totalOrdersCount} order${totalOrdersCount === 1 ? '' : 's'}`
      : 'From your previous orders';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Screen Header matching Image 1 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Buy again</Text>
            <Text style={styles.headerSubtitle}>{dynamicSubtitle}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            setSearchOpen(!searchOpen);
            if (searchOpen) setSearchQuery('');
          }}
          hitSlop={10}
          style={styles.searchIconButton}
          accessibilityLabel="Search previous purchases"
        >
          {searchOpen ? (
            <X size={22} color="#0f172a" strokeWidth={2.2} />
          ) : (
            <Search size={22} color="#0f172a" strokeWidth={2.2} />
          )}
        </Pressable>
      </View>

      {/* Search Input Bar */}
      {searchOpen && (
        <View style={styles.searchBarContainer}>
          <View style={styles.searchInputWrap}>
            <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search previous purchases..."
              placeholderTextColor="#94a3b8"
              autoFocus
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <X size={16} color="#94a3b8" />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color="#087f46" size="large" />
          <Text style={styles.loadingText}>Loading your purchases...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            availableItems.length > 0 && { paddingBottom: 110 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchBuyAgainData(true)}
              colors={['#087f46']}
              tintColor="#087f46"
            />
          }
        >
          {/* Order It All Again Carousel Section */}
          {recentOrders.length > 0 && (
            <View style={styles.carouselSection}>
              <Text style={styles.sectionTitle}>Order it all again</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContent}
              >
                {recentOrders.map((order) => {
                  const orderItems = order.items || [];
                  const displayItems = orderItems.slice(0, 3);
                  const extraCount =
                    orderItems.length > 3 ? orderItems.length - 3 : 0;
                  const isReordering = reorderingId === order.id;

                  return (
                    <View key={order.id} style={styles.orderCard}>
                      {/* Order Card Header */}
                      <View style={styles.orderCardHeader}>
                        <Text style={styles.orderCardDate}>
                          {formatOrderDate(order.createdAt)}
                        </Text>
                        <Text style={styles.orderCardNo}>#{order.orderNo}</Text>
                      </View>

                      {/* Thumbnails */}
                      <View style={styles.thumbnailsRow}>
                        {displayItems.map((it, idx) => {
                          const imgSource = getProductImageSource(
                            it.product || it,
                            120
                          );
                          return (
                            <View
                              key={`thumb-${order.id}-${idx}`}
                              style={styles.thumbnailBox}
                            >
                              <Image
                                source={imgSource}
                                style={styles.thumbnailImg}
                                contentFit="contain"
                              />
                            </View>
                          );
                        })}
                        {extraCount > 0 && (
                          <View style={styles.extraBadgeBox}>
                            <Text style={styles.extraBadgeText}>
                              +{extraCount}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Order Card Price & Items Row */}
                      <View style={styles.orderCardSummaryRow}>
                        <View>
                          <Text style={styles.orderCardSummaryLabel}>Order total</Text>
                          <Text style={styles.orderTotal}>
                            ₹{Math.round(order.total)}
                          </Text>
                        </View>
                        <View style={styles.orderItemCountBadge}>
                          <Text style={styles.orderItemCountText}>
                            {orderItems.length} {orderItems.length === 1 ? 'item' : 'items'}
                          </Text>
                        </View>
                      </View>

                      {/* Prominent Full-Width Reorder Button */}
                      <Pressable
                        onPress={() => handleReorder(order)}
                        disabled={isReordering}
                        style={({ pressed }) => [
                          styles.reorderCompleteBtn,
                          pressed && { opacity: 0.88 },
                          isReordering && { opacity: 0.7 },
                        ]}
                        accessibilityLabel={`Reorder complete order ${order.orderNo}`}
                      >
                        {isReordering ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <RotateCcw
                              size={15}
                              color="#ffffff"
                              strokeWidth={2.4}
                            />
                            <Text style={styles.reorderCompleteBtnText}>
                              Reorder complete order
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Category Filter Pills Bar */}
          {categories.length > 1 && (
            <View style={styles.categoryPillsBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryPillsContent}
              >
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setSelectedCategory(cat)}
                      style={[
                        styles.categoryPill,
                        isSelected
                          ? styles.categoryPillSelected
                          : styles.categoryPillUnselected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          isSelected
                            ? styles.categoryPillTextSelected
                            : styles.categoryPillTextUnselected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Product Items Grouped in White Card Container matching Images 1 & 2 */}
          {filteredItems.length > 0 ? (
            <View style={styles.productsCard}>
              {filteredItems.map((item, index) => {
                const product = item.product;
                const variant =
                  product?.variants?.find((v) => v.id === item.variantId) ||
                  product?.variants?.[0];
                const currentPrice =
                  variant?.offerPrice ?? variant?.price ?? item.lastPrice ?? 0;
                const unavailable =
                  product?.isUnavailable ||
                  !variant ||
                  isProductUnavailable(product, variant);
                const cartQty = getQty(product.id, variant?.id);
                const isBusy = busyItem === `${item.productId}:${item.variantId}`;

                // Check if price dropped from user's last ordered price
                const hasPriceDrop =
                  item.lastPrice != null &&
                  currentPrice < item.lastPrice &&
                  item.lastPrice - currentPrice >= 1;
                const priceDropAmount = hasPriceDrop
                  ? Math.round(item.lastPrice - currentPrice)
                  : 0;

                const purchaseCount = item.purchaseCount || 1;
                const lastDate = item.lastPurchasedAt
                  ? formatShortDate(item.lastPurchasedAt)
                  : null;
                const isLastRow = index === filteredItems.length - 1;

                return (
                  <View
                    key={`${item.productId}:${item.variantId}`}
                    style={[
                      styles.productRow,
                      isLastRow && styles.productRowLast,
                    ]}
                  >
                    {/* Product Image */}
                    <Pressable
                      onPress={() =>
                        product.id &&
                        !product.isUnavailable &&
                        navigation.navigate('ProductDetail', { id: product.id })
                      }
                      style={styles.productImgContainer}
                    >
                      <Image
                        source={getProductImageSource(product, 160)}
                        style={styles.productImg}
                        contentFit="contain"
                      />
                    </Pressable>

                    {/* Product Details */}
                    <View style={styles.productDetails}>
                      <Pressable
                        onPress={() =>
                          product.id &&
                          !product.isUnavailable &&
                          navigation.navigate('ProductDetail', {
                            id: product.id,
                          })
                        }
                      >
                        <Text numberOfLines={2} style={styles.productName}>
                          {product.name}
                        </Text>
                      </Pressable>

                      <Text style={styles.variantLabel}>
                        {variant?.label || item.variantLabel || '1 Unit'}
                      </Text>

                      {/* Frequency & Recency Row */}
                      <View style={styles.purchaseMetaRow}>
                        <View style={styles.boughtBadge}>
                          <RotateCcw
                            size={10}
                            color="#1e293b"
                            strokeWidth={2.4}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.boughtCountText}>
                            Bought {purchaseCount} ×
                          </Text>
                        </View>
                        {lastDate && (
                          <Text style={styles.lastPurchasedText}>
                            Last on {lastDate}
                          </Text>
                        )}
                      </View>

                      {/* Price Dropped Badge */}
                      {hasPriceDrop && priceDropAmount > 0 && (
                        <View style={styles.priceDropPill}>
                          <Text style={styles.priceDropText}>
                            PRICE DROPPED ₹{priceDropAmount}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Price and Action Button Column */}
                    <View style={styles.actionColumn}>
                      <Text style={styles.productPrice}>
                        ₹{Math.round(currentPrice)}
                      </Text>

                      {unavailable ? (
                        <View style={styles.notifyBtn}>
                          <Text style={styles.notifyBtnText}>Notify me</Text>
                        </View>
                      ) : cartQty > 0 ? (
                        <View style={styles.stepperContainer}>
                          <Pressable
                            onPress={() =>
                              updateQty(product.id, variant?.id, -1)
                            }
                            hitSlop={6}
                            style={styles.stepperBtn}
                          >
                            <Minus size={13} color="#ffffff" strokeWidth={2.6} />
                          </Pressable>
                          <Text style={styles.stepperQty}>{cartQty}</Text>
                          <Pressable
                            onPress={() => updateQty(product.id, variant?.id, 1)}
                            hitSlop={6}
                            style={styles.stepperBtn}
                          >
                            <Plus size={13} color="#ffffff" strokeWidth={2.6} />
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => handleAddItem(item)}
                          disabled={isBusy}
                          style={({ pressed }) => [
                            styles.addBtn,
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          {isBusy ? (
                            <ActivityIndicator size="small" color="#087f46" />
                          ) : (
                            <Text style={styles.addBtnText}>ADD</Text>
                          )}
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Package
                size={54}
                color="#94a3b8"
                strokeWidth={1.5}
                style={{ marginBottom: 14 }}
              />
              <Text style={styles.emptyTitle}>
                {error
                  ? 'Could not load previous orders'
                  : 'No previous purchases found'}
              </Text>
              <Text style={styles.emptyDesc}>
                {error
                  ? 'Please pull down to refresh or check your internet connection.'
                  : 'Your ordered products will automatically appear here once your orders are completed.'}
              </Text>
              <Pressable
                onPress={() => navigation.navigate('Main', { screen: 'Home' })}
                style={styles.startShoppingBtn}
              >
                <ShoppingBag size={16} color="#ffffff" strokeWidth={2.2} />
                <Text style={styles.startShoppingBtnText}>Start Shopping</Text>
              </Pressable>
            </View>
          )}

          {/* Today's price note right below products card */}
          {filteredItems.length > 0 && (
            <Text style={styles.todayPriceNote}>
              Prices shown are today’s prices
            </Text>
          )}
        </ScrollView>
      )}

      {/* Bottom Sticky Action Bar matching Images 1 & 2 */}
      {!loading && availableItems.length > 0 && (
        <View style={[styles.bottomBarContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            onPress={handleAddAll}
            disabled={addingAll}
            style={({ pressed }) => [
              styles.addAllButton,
              pressed && { opacity: 0.9 },
            ]}
          >
            {addingAll ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <ShoppingBag size={18} color="#ffffff" strokeWidth={2.2} />
                <Text style={styles.addAllButtonText}>
                  Add all {totalAvailableCount} items · ₹ {totalAvailablePrice}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f8f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 1,
  },
  searchIconButton: {
    padding: 6,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: '#0f172a',
    padding: 0,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: '#64748b',
    marginTop: 12,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  carouselSection: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: '#0f172a',
    paddingHorizontal: 16,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  carouselContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  orderCard: {
    width: 290,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderCardDate: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#0f172a',
  },
  orderCardNo: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: '#64748b',
  },
  thumbnailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  thumbnailBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnailImg: {
    width: 42,
    height: 42,
  },
  extraBadgeBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#334155',
  },
  orderCardSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  orderCardSummaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: '#64748b',
    marginBottom: 2,
  },
  orderTotal: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: '#0f172a',
  },
  orderItemCountBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderItemCountText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#475569',
  },
  reorderCompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#087f46',
    borderRadius: 12,
    height: 42,
    gap: 8,
    shadowColor: '#087f46',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  reorderCompleteBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#ffffff',
  },
  orderCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItemCount: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#64748b',
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#087f46',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
    gap: 6,
  },
  reorderBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#ffffff',
  },
  categoryPillsBar: {
    backgroundColor: '#f4f6f4',
    paddingVertical: 10,
    marginBottom: 14,
  },
  categoryPillsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    borderRadius: 24,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  categoryPillSelected: {
    backgroundColor: '#0f172a',
  },
  categoryPillUnselected: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  categoryPillText: {
    fontSize: 13,
  },
  categoryPillTextSelected: {
    fontFamily: fonts.bold,
    color: '#ffffff',
  },
  categoryPillTextUnselected: {
    fontFamily: fonts.medium,
    color: '#334155',
  },
  productsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 16,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  productRowLast: {
    borderBottomWidth: 0,
  },
  productImgContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productImg: {
    width: 60,
    height: 60,
  },
  productDetails: {
    flex: 1,
    paddingRight: 8,
  },
  productName: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 20,
  },
  variantLabel: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 4,
  },
  purchaseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  boughtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    marginRight: 6,
  },
  boughtCountText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#1e293b',
  },
  lastPurchasedText: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: '#64748b',
  },
  priceDropPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  priceDropText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#087f46',
  },
  actionColumn: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  productPrice: {
    fontFamily: fonts.extraBold,
    fontSize: 16.5,
    color: '#0f172a',
    marginBottom: 6,
  },
  notifyBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  notifyBtnText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#334155',
  },
  addBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#087f46',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#087f46',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#087f46',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    gap: 8,
  },
  stepperBtn: {
    padding: 2,
  },
  stepperQty: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#ffffff',
    minWidth: 16,
    textAlign: 'center',
  },
  todayPriceNote: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(246, 248, 246, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  addAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#087f46',
    height: 50,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#087f46',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addAllButtonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#ffffff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 6,
  },
  emptyDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  startShoppingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#087f46',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  startShoppingBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#ffffff',
  },
});
