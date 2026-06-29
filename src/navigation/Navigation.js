import { useEffect, useContext } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, ShoppingCart, Package, User } from 'lucide-react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { AuthContext } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

import OtpAuthScreen from '../screens/OtpAuthScreen';
import HomeScreen from '../screens/HomeScreen';
import CategoryScreen from '../screens/CategoryScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import ProductListScreen from '../screens/ProductListScreen';
import SearchScreen from '../screens/SearchScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AddAddressScreen from '../screens/AddAddressScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import MyAddressesScreen from '../screens/MyAddressesScreen';
import Loader from '../components/Loader';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Home',    label: 'Home',    Icon: Home },
  { name: 'Cart',    label: 'Cart',    Icon: ShoppingCart },
  { name: 'Orders',  label: 'Orders',  Icon: Package },
  { name: 'Profile', label: 'Profile', Icon: User },
];

function TabBarIcon({ Icon, focused }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    scale.value = focused
      ? withSpring(1.15, { damping: 10, stiffness: 200 })
      : withSpring(1, { damping: 10, stiffness: 200 });
  }, [focused]);

  return (
    <Animated.View style={animStyle}>
      <Icon size={22} color={focused ? '#16a34a' : '#94a3b8'} strokeWidth={focused ? 2.2 : 1.8} />
    </Animated.View>
  );
}

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { itemCount } = useCart();

  return (
    <View
      style={[
        styles.tabBar,
        { paddingBottom: insets.bottom, height: 60 + insets.bottom },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const tab = TABS[index];

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
            {/* Active background pill */}
            {isFocused && (
              <Animated.View
                entering={undefined}
                style={styles.activePill}
              />
            )}
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
                { color: isFocused ? '#16a34a' : '#94a3b8', fontWeight: isFocused ? '700' : '500' },
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
    fontSize: 11,
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
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 12,
  },
});

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { token, loading } = useContext(AuthContext);

  if (loading) return <Loader />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
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
            <Stack.Screen name="Search" component={SearchScreen} />
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
              name="Checkout"
              component={CheckoutScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OrderTracking"
              component={OrderTrackingScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={OtpAuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
