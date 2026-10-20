import React, { useEffect, useContext } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef } from './navigationRef';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, LayoutGrid, Tag, ShoppingBag, Package } from 'lucide-react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { AuthContext } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { fonts } from '../theme/typography';

import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import CategoryScreen from '../screens/CategoryScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import ProductListScreen from '../screens/ProductListScreen';
import MonthlyStockUpScreen from '../screens/MonthlyStockUpScreen';
import SearchScreen from '../screens/SearchScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import PaymentScreen from '../screens/PaymentScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import OrdersScreen from '../screens/OrdersScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import AddAddressScreen from '../screens/AddAddressScreen';
import AccountScreen from '../screens/AccountScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import MyAddressesScreen from '../screens/MyAddressesScreen';
import LocationPromptScreen from '../screens/LocationPromptScreen';
import ApplyCouponScreen from '../screens/ApplyCouponScreen';
import OrderConfirmationScreen from '../screens/OrderConfirmationScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import RefundStatusScreen from '../screens/RefundStatusScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import ReportIssueScreen from '../screens/ReportIssueScreen';
import OfflineScreen from '../screens/OfflineScreen';

import DeliveryOrdersScreen from '../screens/DeliveryOrdersScreen';
import DeliveryMapScreen from '../screens/DeliveryMapScreen';
import DeliveryConfirmationModal from '../components/DeliveryConfirmationModal';

export { navigationRef };

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Home',       label: 'Home',       Icon: Home },
  { name: 'Categories', label: 'Categories', Icon: LayoutGrid },
  { name: 'Orders',     label: 'Orders',     Icon: Package },
  { name: 'Offers',     label: 'Offers',     Icon: Tag },
  { name: 'Cart',       label: 'Cart',       Icon: ShoppingBag },
];

const DELIVERY_TABS = [
  { name: 'DeliveryOrders', label: 'Tasks', Icon: Package },
];

function TabBarIcon({ Icon, focused }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    scale.value = focused
      ? withSpring(1.12, { damping: 12, stiffness: 220 })
      : withSpring(1, { damping: 12, stiffness: 220 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  return (
    <Animated.View style={animStyle}>
      <Icon size={22} color={focused ? '#047857' : '#64748b'} strokeWidth={focused ? 2.3 : 1.8} />
    </Animated.View>
  );
}

function CustomTabBar({ state, descriptors, navigation, tabs }) {
  const insets = useSafeAreaInsets();
  const { itemCount } = useCart();
  const currentRoute = state.routes[state.index];
  const currentOptions = descriptors[currentRoute?.key]?.options;

  if (currentRoute?.name === 'Cart' || currentOptions?.tabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <View
      style={[
        styles.tabBar,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : 8, height: 60 + (insets.bottom > 0 ? insets.bottom : 8) },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const tab = tabs[index];

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            style={styles.tabItem}
          >
            <View style={{ position: 'relative' }}>
              <TabBarIcon Icon={tab.Icon} focused={isFocused} />
              {tab.name === 'Cart' && itemCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                {
                  fontFamily: isFocused ? fonts.bold : fonts.medium,
                  color: isFocused ? '#047857' : '#64748b',
                  fontWeight: 'normal',
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 16,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    position: 'relative',
    height: 52,
  },
  activePill: {
    position: 'absolute',
    top: -8,
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#16a34a',
  },
  tabLabel: {
    fontSize: 11.5,
    marginTop: 4,
    letterSpacing: 0.1,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    fontWeight: 'normal',
    color: '#ffffff',
    lineHeight: 12,
  },
});

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} tabs={TABS} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Offers" component={MonthlyStockUpScreen} />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{ tabBarStyle: { display: 'none' } }}
      />
    </Tab.Navigator>
  );
}

function DeliveryTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} tabs={DELIVERY_TABS} />}
    >
      <Tab.Screen name="DeliveryOrders" component={DeliveryOrdersScreen} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { token, userProfile, loading, needsAddressPrompt, needsAddressSelection } = useContext(AuthContext);

  if (loading) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        key={token ? (userProfile?.role === 'PARTNER' ? 'partner-session' : 'customer-session') : 'guest-session'}
        screenOptions={{ headerShown: false }}
        initialRouteName={token
          ? userProfile?.role === 'PARTNER'
            ? 'DeliveryMain'
            : needsAddressPrompt
              ? 'LocationPrompt'
              : needsAddressSelection
                ? 'MyAddresses'
                : 'Main'
          : 'Welcome'}
      >
        {token ? (
          userProfile?.role === 'PARTNER' ? (
            <>
              <Stack.Screen name="DeliveryMain" component={DeliveryTabs} />
              <Stack.Screen name="DeliveryMap" component={DeliveryMapScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Main" component={HomeTabs} />
              <Stack.Screen
                name="Category"
                component={CategoryScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ProductDetail"
                component={ProductDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ProductList"
                component={ProductListScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="MonthlyStockUp"
                component={MonthlyStockUpScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Search"
                component={SearchScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="AddAddress"
                component={AddAddressScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Account"
                component={AccountScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="MyAddresses"
                component={MyAddressesScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="LocationPrompt"
                component={LocationPromptScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Checkout"
                component={CheckoutScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Payment"
                component={PaymentScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="OrderTracking"
                component={OrderTrackingScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Orders"
                component={OrdersScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Favorites"
                component={FavoritesScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ApplyCoupon"
                component={ApplyCouponScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="OrderConfirmation"
                component={OrderConfirmationScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="OrderDetail"
                component={OrderDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="RefundStatus"
                component={RefundStatusScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="HelpSupport"
                component={HelpSupportScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ReportIssue"
                component={ReportIssueScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Offline"
                component={OfflineScreen}
                options={{ headerShown: false }}
              />
            </>
          )
        ) : (
          <>
            <Stack.Screen
              name="Welcome"
              component={WelcomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="LocationPrompt"
              component={LocationPromptScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AddAddress"
              component={AddAddressScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
      <DeliveryConfirmationModal />
    </NavigationContainer>
  );
}
