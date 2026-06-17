import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef, ParamListBase, useNavigation } from '@react-navigation/native';
import InquiryNotificationListener from '../components/InquiryNotificationListener';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import Svg, { Defs, RadialGradient as SvgRadialGradient, Stop, Rect } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { RootStackParamList, AuthStackParamList, MainTabParamList } from '../types';
import { BORDER_RADIUS, COLORS, DEMO_MODE, SPACING } from '../constants';
import { useAppSelector } from '../store/hooks';
import { useResponsive } from '../hooks/useResponsive';
import { translations } from '../i18n/translations';
import HomeIcon from '../assets/icons/HomeIcon';
import CategoryIcon from '../assets/icons/CategoryIcon';
import SelectedCategoryIcon from '../assets/icons/SelectedCategoryIcon';
import MessageIcon from '../assets/icons/MessageIcon';
// import SensorsIcon from '../assets/icons/SensorsIcon';
import CartIcon from '../assets/icons/CartIcon';
import SelectedCartIcon from '../assets/icons/SelectedCartIcon';
import AccountIcon from '../assets/icons/AccountIcon';
import SelectedPersonIcon from '../assets/icons/SelectedPersonIcon';

// Demo screens
import CartScreenDemo from '../screens/demo/CartScreen.demo';
import WishlistScreenDemo from '../screens/demo/WishlistScreen.demo';
import ProfileScreenDemo from '../screens/demo/ProfileScreen.demo';

// Import screens

import SplashScreen from '../screens/main/SplashScreen';
import LoginScreen from '../screens/lazy/LoginScreen.lazy';
import SignupScreen from '../screens/lazy/SignupScreen.lazy';
import ForgotPasswordScreen from '../screens/lazy/ForgotPasswordScreen.lazy';
import ResetPasswordScreen from '../screens/lazy/ResetPasswordScreen.lazy';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';
import SetPasswordScreen from '../screens/auth/SetPasswordScreen';
import HomeScreen from '../screens/main/HomeScreen';
import SearchScreen from '../screens/lazy/SearchScreen.lazy';
import CartScreen from '../screens/lazy/CartScreen.lazy';
import ProfileScreen from '../screens/lazy/ProfileScreen.lazy';
import ProductDetailScreen from '../screens/lazy/ProductDetailScreen.lazy';
import NotFoundScreen from '../screens/main/NotFoundScreen';
import ReviewsScreen from '../screens/lazy/ReviewsScreen.lazy';
import SellerProfileScreen from '../screens/lazy/SellerProfileScreen.lazy';
import LiveSellerSearchScreen from '../screens/lazy/LiveSellerSearchScreen.lazy';
import LiveSellerDetailScreen from '../screens/lazy/LiveSellerDetailScreen.lazy';
import OrderConfirmationScreen from '../screens/lazy/OrderConfirmationScreen.lazy';
import SearchResultsScreen from '../screens/lazy/SearchResultsScreen.lazy';
import EditProfileScreen from '../screens/lazy/EditProfileScreen.lazy';
import AddressBookScreen from '../screens/lazy/AddressBookScreen.lazy';
import SelectAddressScreen from '../screens/main/profileScreen/settingScreen/SelectAddressScreen';
import AddNewAddressScreen from '../screens/lazy/AddNewAddressScreen.lazy';
import EditAddressScreen from '../screens/lazy/EditAddressScreen.lazy';
import EditFinanceAddressScreen from '../screens/lazy/EditFinanceAddressScreen.lazy';
import PaymentMethodsScreen from '../screens/lazy/PaymentMethodsScreen.lazy';

import AddPaymentMethodScreen from '../screens/main/profileScreen/settingScreen/AddPaymentMethodScreen';
import OrderHistoryScreen from '../screens/lazy/OrderHistoryScreen.lazy';
import WishlistScreen from '../screens/lazy/WishlistScreen.lazy';
import ProfileSettingsScreen from '../screens/main/profileScreen/myPageScreen/ProfileSettingsScreen';
import LanguageSettingsScreen from '../screens/main/profileScreen/LanguageSettingsScreen';
import PaymentScreen from '../screens/main/profileScreen/settingScreen/PaymentScreen';
import OrderPaymentScreen from '../screens/main/profileScreen/settingScreen/OrderPaymentScreen';
import BillgateWebViewScreen from '../screens/main/profileScreen/settingScreen/BillgateWebViewScreen';
import PaymentHistoryScreen from '../screens/main/profileScreen/settingScreen/PaymentHistoryScreen';
import PersonalInformationScreen from '../screens/main/profileScreen/settingScreen/PersonalInformationScreen';
import ProgressNotificationScreen from '../screens/main/profileScreen/settingScreen/ProgressNotificationScreen';

// import EditProductScreen from '../screens/main/EditProductScreen'; // Temporarily removed due to missing module
// Order screens
import MyOrdersScreen from '../screens/main/profileScreen/settingScreen/OrderHistoryScreen';
import LeaveFeedbackScreen from '../screens/lazy/LeaveFeedbackScreen.lazy';
// Settings screens
import PrivacyPolicyScreen from '../screens/lazy/PrivacyPolicyScreen.lazy';
import ChangePasswordScreen from '../screens/lazy/ChangePasswordScreen.lazy';
import AffiliateMarketingScreen from '../screens/main/profileScreen/myPageScreen/AffiliateMarketingScreen';
import UnitSettingsScreen from '../screens/main/profileScreen/myPageScreen/UnitSettingsScreen';
import PaymentPasswordScreen from '../screens/main/profileScreen/myPageScreen/PaymentPasswordScreen';
import DepositScreen from '../screens/main/profileScreen/depositScreen/DepositScreen';
import ChargeScreen from '../screens/main/profileScreen/depositScreen/ChargeScreen';
import PointDetailScreen from '../screens/main/profileScreen/depositScreen/PointDetailScreen';
import CouponScreen from '../screens/main/profileScreen/depositScreen/CouponScreen';
import BuyListScreen from '../screens/main/profileScreen/settingScreen/BuyListScreen';
import Rocket3PLListScreen from '../screens/main/profileScreen/settingScreen/Rocket3PLListScreen';
import VvicHipassListScreen from '../screens/main/profileScreen/settingScreen/VvicHipassListScreen';
import ShippingAgencyListScreen from '../screens/main/profileScreen/settingScreen/ShippingAgencyListScreen';
import RefundRequestScreen from '../screens/main/profileScreen/settingScreen/RefundRequestScreen';
import ProblemProductScreen from '../screens/main/profileScreen/settingScreen/ProblemProductScreen';
import ProductManagementScreen from '../screens/main/profileScreen/settingScreen/productManagementScreen/ProductManagementScreen';
import OnlineProductEditScreen from '../screens/main/profileScreen/settingScreen/productManagementScreen/OnlineProductEditScreen';
import BestProductsScreen from '../screens/main/bestProductsScreen/BestProductsScreen';
import NewStoresScreen from '../screens/main/newStoresScreen/NewStoresScreen';
import PopularMerchantsScreen from '../screens/main/popularMerchantsScreen/PopularMerchantsScreen';
import UnitSurveyScreen from '../screens/main/profileScreen/settingScreen/marketSurveyScreen/UnitSurveyScreen';
import UnitSurveyDetailScreen from '../screens/main/profileScreen/settingScreen/marketSurveyScreen/UnitSurveyDetailScreen';
import OEMSurveyScreen from '../screens/main/profileScreen/settingScreen/marketSurveyScreen/OEMSurveyScreen';
import MyDeliveriesScreen from '../screens/main/profileScreen/settingScreen/MyDeliveriesScreen';
import DeliveryDetailScreen from '../screens/main/profileScreen/settingScreen/DeliveryDetailScreen';
import OrderDetailScreen from '../screens/main/profileScreen/settingScreen/OrderDetailScreen';
import NoteScreen from '../screens/main/profileScreen/NoteScreen';
import LeaveNoteScreen from '../screens/main/profileScreen/LeaveNoteScreen';
import ShareAppScreen from '../screens/main/profileScreen/settingScreen/ShareAppScreen';
import ViewedProductsScreen from '../screens/main/profileScreen/ViewedProductsScreen';
import FollowedStoreScreen from '../screens/main/profileScreen/FollowedStoreScreen';
// Chat screens
import ChatScreen from '../screens/lazy/ChatScreen.lazy';
import ChatErrorBoundary from '../components/ChatErrorBoundary';
// import EditProductScreen from '../screens/main/EditProductScreen';
import CategoryTabScreen from '../screens/main/CategoryTabScreen';
import ProductDiscoveryScreen from '../screens/lazy/ProductDiscoveryScreen.lazy';
import SubCategoryScreen from '../screens/main/SubCategoryScreen';
import FinanceScreen from '../screens/lazy/FinanceScreen.lazy';
import OtpVerificationScreen from '../screens/lazy/OtpVerificationScreen.lazy';
import CustomerServiceScreen from '../screens/main/profileScreen/CustomerServiceScreen';
import OrderInquiryScreen from '../screens/lazy/OrderInquiryScreen.lazy';
import ImageSearchScreen from '../screens/main/searchScreen/ImageSearchScreen';
import ImageSearchCameraScreen from '../screens/main/searchScreen/ImageSearchCameraScreen';
// General Inquiry screens
import GeneralInquiryListScreen from '../screens/main/profileScreen/GeneralInquiryListScreen';
import MessageScreen from '../screens/main/MessageScreen';
import GeneralInquiryChatScreen from '../screens/main/profileScreen/GeneralInquiryChatScreen';
import CreateGeneralInquiryScreen from '../screens/main/profileScreen/CreateGeneralInquiryScreen';

const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

const ChatScreenWithBoundary = (props: any) => (
  <ChatErrorBoundary>
    <ChatScreen {...props} />
  </ChatErrorBoundary>
);

// Auth Stack Navigator
const AuthNavigator = React.memo(() => {
  const authContext = useAuth();
  const loginError = authContext?.loginError;
  const signupError = authContext?.signupError;
  
  // Determine initial route based on error states
  let initialRoute: keyof AuthStackParamList = "Login"; // default
  if (signupError) {
    initialRoute = "Signup";
  } else if (loginError) {
    initialRoute = "Login";
  }
  
  // console.log('AuthNavigator: Rendering AuthNavigator');
  // console.log('AuthNavigator: loginError:', loginError, 'signupError:', signupError);
  // console.log('AuthNavigator: initialRoute:', initialRoute);
  // console.log('AuthNavigator: Call stack:', new Error().stack);
  
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.background },
      }}
      initialRouteName={initialRoute}
    >
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <AuthStack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <AuthStack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      <AuthStack.Screen name="SetPassword" component={SetPasswordScreen} />
    </AuthStack.Navigator>
  );
});

// Main Tab Navigator
const MainTabNavigator = () => {
  const authContext = useAuth();
  const shouldNavigateToProfile = authContext?.shouldNavigateToProfile;
  const clearNavigateToProfile = authContext?.clearNavigateToProfile;
  const isGuest = authContext?.isGuest;
  const navigation = useNavigation();
  const locale = useAppSelector((s) => s.i18n.locale);
  const insets = useSafeAreaInsets();
  // Reactive layout metrics — used ONLY to apply tablet-specific tab bar
  // fixes (icon/label overlap, label position). Mobile keeps its
  // original sizing exactly as before.
  const responsive = useResponsive();
  const { unreadCount, generalInquiryUnreadCount } = useSocket();
  const totalMessageUnread = unreadCount + generalInquiryUnreadCount;

  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };
  
  // console.log('MainTabNavigator: Rendering with shouldNavigateToProfile:', shouldNavigateToProfile, 'isGuest:', isGuest);
  
  // Navigate to Profile tab after login if needed
  useEffect(() => {
    // console.log('MainTabNavigator: shouldNavigateToProfile changed to', shouldNavigateToProfile);
    if (shouldNavigateToProfile) {
      // Navigate to the Profile tab
      // console.log('MainTabNavigator: Navigating to Profile screen');
      navigation.navigate('Profile' as never);
      // Clear the flag after handling
      clearNavigateToProfile();
    }
  }, [shouldNavigateToProfile, navigation, clearNavigateToProfile]); // Depend on all required values
  
  // Calculate tab bar height and padding based on safe area insets.
  //
  // Mobile keeps the ORIGINAL sizing (45/15) that was already working
  // on devices with a gesture-bar / home-indicator (insets.bottom > 0).
  // Tablets get a larger height + label-below-icon override (see below)
  // when `responsive.isTablet` is true.
  //
  // FIX for legacy phones with 3-button navigation (insets.bottom == 0):
  // the original mobile bar leaves only `45 - 8 - 15 = 22px` of content
  // area, which is not enough to stack a 24px icon ABOVE a 12px label
  // — causing the icon and label to overlap on that class of devices.
  // When the system reports no bottom inset on a phone, we compensate
  // by raising the base height and trimming paddingBottom so the icon
  // and label have room to render stacked. Phones that DO report a
  // non-zero inset keep the original numbers (already laying out fine).
  //
  // On tablets we DO NOT add the full `insets.bottom` to the height
  // and padding (tablets rarely have a home-indicator cutout, and even
  // when they do, the system inset on Android landscape is usually 0).
  // Adding the inset would have created the wide empty gap visible
  // under the labels in a previous screenshot. Instead we add the
  // inset only to the height (so the bar still clears any real cutout)
  // and keep `paddingBottom` at the base value so the labels sit close
  // to the bottom of the bar — matching the mobile look.
  const TAB_BAR_DOWN_OFFSET = 0;
  const isLowInsetPhone = !responsive.isTablet && insets.bottom < 8;
  const baseTabBarHeight = responsive.isTablet
    ? 84
    : isLowInsetPhone
      ? 60
      : 45;
  const basePaddingBottom = responsive.isTablet
    ? 6
    : isLowInsetPhone
      ? 6
      : 15;
  const tabBarHeight = baseTabBarHeight + insets.bottom - TAB_BAR_DOWN_OFFSET;
  const paddingBottom = basePaddingBottom;
  
  const LIVE_BUTTON_SIZE = 76;
  const LIVE_BUTTON_OVERHANG = 18;

  return (
    <MainTab.Navigator
      detachInactiveScreens={true}
      screenOptions={({ route }) => ({
        lazy: true,
        freezeOnBlur: true,
        tabBarIcon: ({ focused }) => {
          const iconColor = focused ? COLORS.text.red : COLORS.black;
          const iconSize = responsive.isTablet ? 36 : 24;

          if (route.name === 'Home') {
            return <HomeIcon width={iconSize} height={iconSize} color={iconColor} />;
          } else if (route.name === 'ProductList') {
            // 사용자 제공 마스코트 아이콘. PNG 라 색 변경이 불가하므로 focused
            // 상태에서는 살짝 확대해 강조 (다른 탭의 색 변화 대신).
            return (
              <Image
                source={require('../assets/icons/mascot.png')}
                style={{
                  width: iconSize,
                  height: iconSize,
                  resizeMode: 'contain',
                  transform: [{ scale: focused ? 1.1 : 1 }],
                }}
              />
            );
          } else if (route.name === 'Message') {
            return (
              <View>
                <MessageIcon width={iconSize} height={iconSize} color={iconColor} />
                {totalMessageUnread > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    backgroundColor: COLORS.red || '#FF0000',
                    borderRadius: 9,
                    minWidth: 18,
                    height: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}>
                    <Text style={{ color: '#fff', fontSize: responsive.isTablet ? 15 : 10, fontWeight: '700' }}>
                      {totalMessageUnread > 99 ? '99+' : totalMessageUnread}
                    </Text>
                  </View>
                )}
              </View>
            );
            // } else if (route.name === 'Live') {
            //   return null;
            } else if (route.name === 'Cart') {
            return focused ? (
              <SelectedCartIcon width={iconSize} height={iconSize} color={iconColor} />
            ) : (
              <CartIcon width={iconSize} height={iconSize} color={iconColor} />
            );
          } else if (route.name === 'Profile') {
            return focused ? (
              <SelectedPersonIcon width={iconSize} height={iconSize} color={iconColor} />
            ) : (
              <AccountIcon width={iconSize} height={iconSize} color={iconColor} />
            );
          }
          return <HomeIcon width={iconSize} height={iconSize} color={iconColor} />;
        },
        tabBarLabel: ({ focused }) => {
          let label = '';
          if (route.name === 'Home') label = t('navigation.home');
          else if (route.name === 'ProductList') label = t('navigation.productList');
          else if (route.name === 'Message') label = t('navigation.message');
          // else if (route.name === 'Live') label = t('navigation.live');
          else if (route.name === 'Cart') label = t('navigation.cart');
          else if (route.name === 'Profile') label = t('navigation.myPage');
          // if (route.name === 'Live') return null;
          return (
            <Text
              style={{
                fontSize: responsive.isTablet ? 18 : 12,
                color: focused ? COLORS.text.red : COLORS.black,
                fontWeight: focused ? '600' : '400',
              }}
            >
              {label}
            </Text>
          );
        },
        // tabBarButton: route.name === 'Live'
        //   ? (props) => (
        //       <View style={tabBarStyles.liveButtonWrap} pointerEvents="box-none">
        //         <TouchableOpacity
        //           activeOpacity={0.9}
        //           onPress={props.onPress}
        //           style={[tabBarStyles.liveButtonTouchable, { width: LIVE_BUTTON_SIZE, height: LIVE_BUTTON_SIZE }]}
        //         >
        //           <View style={[tabBarStyles.liveButtonOuter, { width: LIVE_BUTTON_SIZE+10, height: LIVE_BUTTON_SIZE -5 }]}>
        //             <View style={[tabBarStyles.liveButtonWhiteBg, { width: LIVE_BUTTON_SIZE + 10, height: LIVE_BUTTON_SIZE -5 }]} />
        //             <View style={[tabBarStyles.liveButtonGradientWrap, { width: LIVE_BUTTON_SIZE, height: LIVE_BUTTON_SIZE-10 }]} pointerEvents="none">
        //               <Svg width={LIVE_BUTTON_SIZE} height={LIVE_BUTTON_SIZE} style={StyleSheet.absoluteFill}>
        //                 <Defs>
        //                   <SvgRadialGradient id="liveTabGradient" cx="50%" cy="0%" rx="100%" ry="100%">
        //                     <Stop offset="0%" stopColor="#FF0000" />
        //                     <Stop offset="65.38%" stopColor="#FFEFE2" />
        //                     <Stop offset="87.98%" stopColor="#FFFFFF" />
        //                   </SvgRadialGradient>
        //                 </Defs>
        //                 <Rect x={0} y={0} width={LIVE_BUTTON_SIZE} height={LIVE_BUTTON_SIZE} rx={LIVE_BUTTON_SIZE / 2} ry={LIVE_BUTTON_SIZE / 2} fill="url(#liveTabGradient)" />
        //               </Svg>
        //             </View>
        //             <View style={tabBarStyles.liveButtonIconWrap}>
        //               <SensorsIcon width={40} height={40} color={COLORS.white} />
        //             </View>
        //             <Text style={tabBarStyles.liveButtonLabel}>{t('navigation.live')}</Text>
        //           </View>
        //         </TouchableOpacity>
        //       </View>
        //     )
        //   : undefined,
        tabBarActiveTintColor: COLORS.text.red,
        tabBarInactiveTintColor: COLORS.black,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.borderLight,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom,
          paddingTop: 8 + TAB_BAR_DOWN_OFFSET,
          shadowColor: COLORS.shadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        // Force label to render BELOW the icon on:
        //   • tablets — React Navigation's adaptive default flips to
        //     `beside-icon` (horizontal) when the short side ≥ 600px,
        //     which previously made the icon and label overlap.
        //   • low-inset phones (3-button nav with insets.bottom == 0) —
        //     the compact bar plus the adaptive default occasionally
        //     stacks icon and label on top of each other instead of in
        //     a vertical column. Pinning the position guarantees the
        //     column layout regardless of how React Navigation reads
        //     the available height.
        // Phones with a gesture bar already render the column layout
        // correctly under the default, so they're left untouched.
        ...(responsive.isTablet || isLowInsetPhone
          ? {
              tabBarLabelPosition: 'below-icon' as const,
              tabBarItemStyle: {
                flexDirection: 'column' as const,
                alignItems: 'center' as const,
                justifyContent: 'center' as const,
                paddingVertical: 0,
              },
            }
          : null),
        tabBarLabelStyle: {
          fontSize: responsive.isTablet ? 18 : 12,
          marginTop: 4,
        },
        headerShown: false,
      })}
    >
      <MainTab.Screen name="Home" component={HomeScreen} />
      {/* Category 탭은 보텀바에서 제거되고 상품관리(ProductList) 화면이
          그 자리를 차지한다. Category 라우트는 RootStack 에 여전히 등록돼 있어
          다른 화면에서 navigation.navigate('Category') 호출은 계속 동작한다. */}
      <MainTab.Screen name="ProductList" component={ProductManagementScreen} />
      <MainTab.Screen name="Message" component={MessageScreen} />
      {/* <MainTab.Screen name="Live" component={LiveScreen} /> */}
      <MainTab.Screen name="Cart" component={DEMO_MODE ? CartScreenDemo : CartScreen} />
      <MainTab.Screen name="Profile" component={DEMO_MODE ? ProfileScreenDemo : ProfileScreen} />
    </MainTab.Navigator>
  );
};

// const tabBarStyles = StyleSheet.create({
//   liveButtonWrap: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'flex-end',
//     paddingBottom: 0,
//     backgroundColor: COLORS.white,
//   },
//   liveButtonTouchable: {
//     alignItems: 'center',
//     justifyContent: 'flex-end',
//     marginTop: -18,
//     marginBottom: 4,
//   },
//   liveButtonOuter: {
//     alignItems: 'center',
//     justifyContent: 'flex-end',
//     overflow: 'visible',
//     position: 'relative',
//     backgroundColor: COLORS.white,
//     borderRadius: 60,
//   },
//   liveButtonWhiteBg: {
//     position: 'absolute',
//     width: '90%',
//     bottom: 0,
//     borderRadius: 60,
//     backgroundColor: COLORS.white,
//     padding: SPACING.sm,
//   },
//   liveButtonGradientWrap: {
//     position: 'absolute',
//     bottom: 0,
//     overflow: 'hidden',
//     borderRadius: 60,
//   },
//   liveButtonIconWrap: {
//     position: 'absolute',
//     alignItems: 'center',
//     justifyContent: 'center',
//     bottom: 12,
//     left: 0,
//     right: 0,
//   },
//   liveButtonLabel: {
//     position: 'absolute',
//     bottom: -3,
//     fontSize: 12,
//     fontWeight: '400',
//     color: COLORS.black,
//     left: 0,
//     right: 0,
//     textAlign: 'center',
//   },
// });

// Root Stack Navigator
const RootNavigator = () => {
  const authContext = useAuth();
  const isAuthenticated = authContext?.isAuthenticated;
  const isLoading = authContext?.isLoading;
  // console.log('RootNavigator: Rendering with isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

  // Debug authentication state changes
  useEffect(() => {
    // console.log('AppNavigator: Authentication state changed - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);
    // console.log('AppNavigator: Current screen should be:', !isAuthenticated ? 'Auth' : 'Main');
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <SplashScreen />;
  }

  // Always start with Main (homepage) - app supports guest mode
  const initialRoute = 'Main';

  return (
    <RootStack.Navigator
      initialRouteName={initialRoute}
      detachInactiveScreens={true}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.background },
        freezeOnBlur: true,
      }}
    >
      {/* Onboarding removed - skip directly to main screens */}
      <>
        <RootStack.Screen name="Main" component={MainTabNavigator} />
        <RootStack.Screen name="Auth" component={AuthNavigator} />
          <RootStack.Screen
            name="Category"
            component={CategoryTabScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen 
            name="NotFound"
            component={NotFoundScreen}
            options={{
              headerShown: false,
              title: 'Page Not Found',
            }}
          />
          <RootStack.Screen 
            name="ProductDetail" 
            component={ProductDetailScreen}
            options={{
              headerShown: false,
              title: 'Product Details',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="Reviews" 
            component={ReviewsScreen}
            options={{
              headerShown: false,
              title: 'Reviews',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="Payment" 
            component={PaymentScreen}
            options={{
              headerShown: false,
              title: 'Payment',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen
            name="OrderPayment"
            component={OrderPaymentScreen}
            options={{
              headerShown: false,
              title: 'Order Payment',
            }}
          />
          <RootStack.Screen
            name="BillgateWebView"
            component={BillgateWebViewScreen}
            options={{
              headerShown: false,
              title: 'Card Payment',
            }}
          />
          <RootStack.Screen 
            name="OrderConfirmation" 
            component={OrderConfirmationScreen}
            options={{
              headerShown: false,
              title: 'Order Confirmation',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen
            name="SellerProfile"
            component={SellerProfileScreen}
            options={{
              headerShown: false,
              title: 'Seller Profile',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen
            name="LiveSellerSearch"
            component={LiveSellerSearchScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="LiveSellerDetail"
            component={LiveSellerDetailScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen 
            name="ProductDiscovery"
            component={ProductDiscoveryScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen 
            name="SubCategory"
            component={SubCategoryScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen 
            name="CustomerService"
            component={CustomerServiceScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen 
            name="OrderInquiry"
            component={OrderInquiryScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen 
            name="ImageSearch"
            component={ImageSearchScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen 
            name="ImageSearchCamera"
            component={ImageSearchCameraScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen 
            name="Search"
            component={SearchScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen 
            name="EditProfile" 
            component={EditProfileScreen}
            options={{
              headerShown: false,
              title: 'Edit Profile',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="AddressBook" 
            component={AddressBookScreen}
            options={{
              headerShown: false,
              title: 'Address Book',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="SelectAddress" 
            component={SelectAddressScreen}
            options={{
              headerShown: false,
              title: 'Select Address',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="AddNewAddress" 
            component={AddNewAddressScreen}
            options={{
              headerShown: false,
              title: 'New Address',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="AddPaymentMethod" 
            component={AddPaymentMethodScreen}
            options={{
              headerShown: false,
              title: 'Add Payment Method',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="EditAddress" 
            component={EditAddressScreen}
            options={{
              headerShown: false,
              title: 'Edit Address',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="EditFinanceAddress" 
            component={EditFinanceAddressScreen}
            options={{
              headerShown: false,
              title: 'Edit Address',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="PaymentMethods" 
            component={PaymentMethodsScreen}
            options={{
              headerShown: false,
              title: 'Payment Methods',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="OrderHistory" 
            component={OrderHistoryScreen}
            options={{
              headerShown: false,
              title: 'Order History',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="Wishlist" 
            component={WishlistScreen}
            options={{
              headerShown: false,
              title: 'Wishlist',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="ProfileSettings" 
            component={ProfileSettingsScreen}
            options={{
              headerShown: false,
              title: 'Profile Settings',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="LanguageSettings" 
            component={LanguageSettingsScreen}
            options={{
              headerShown: false,
              title: 'Language Settings',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="Deposit" 
            component={DepositScreen}
            options={{
              headerShown: false,
              title: 'Deposit',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="Charge" 
            component={ChargeScreen}
            options={{
              headerShown: false,
              title: 'Charge',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="PointDetail" 
            component={PointDetailScreen}
            options={{
              headerShown: false,
              title: 'Point Detail',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="Coupon" 
            component={CouponScreen}
            options={{
              headerShown: false,
              title: 'Coupon',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen
            name="BuyList"
            component={BuyListScreen}
            options={{
              headerShown: false,
              title: 'Buy List',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen
            name="Rocket3PLList"
            component={Rocket3PLListScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="VvicHipassList"
            component={VvicHipassListScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="ShippingAgencyList"
            component={ShippingAgencyListScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen name="RefundRequest" component={RefundRequestScreen} options={{ headerShown: false }} />
          <RootStack.Screen
            name="ProductManagement"
            component={ProductManagementScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="OnlineProductEdit"
            component={OnlineProductEditScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="BestProducts"
            component={BestProductsScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="NewStores"
            component={NewStoresScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="PopularMerchants"
            component={PopularMerchantsScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="UnitSurvey"
            component={UnitSurveyScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="UnitSurveyDetail"
            component={UnitSurveyDetailScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="OEMSurvey"
            component={OEMSurveyScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="PaymentHistory"
            component={PaymentHistoryScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="PersonalInformation"
            component={PersonalInformationScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="ProgressNotification"
            component={ProgressNotificationScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="ProblemProduct"
            component={ProblemProductScreen}
            options={{
              headerShown: false,
              title: 'Problem Product',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="MyDeliveries" 
            component={MyDeliveriesScreen}
            options={{
              headerShown: false,
              title: 'My Deliveries',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="DeliveryDetail" 
            component={DeliveryDetailScreen}
            options={{
              headerShown: false,
              title: 'Delivery Detail',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="OrderDetail" 
            component={OrderDetailScreen}
            options={{
              headerShown: false,
              title: 'Order Detail',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="Note" 
            component={NoteScreen}
            options={{
              headerShown: false,
              title: 'Note',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="LeaveNote" 
            component={LeaveNoteScreen}
            options={{
              headerShown: false,
              title: 'Leave Note',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="ShareApp" 
            component={ShareAppScreen}
            options={{
              headerShown: false,
              title: 'Share App',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="ViewedProducts" 
            component={ViewedProductsScreen}
            options={{
              headerShown: false,
              title: 'Viewed Products',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="FollowedStore" 
            component={FollowedStoreScreen}
            options={{
              headerShown: false,
              title: 'Followed Store',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          {/* Order screens */}
          <RootStack.Screen 
            name="MyOrders" 
            component={MyOrdersScreen}
            options={{
              headerShown: false,
              title: 'My Orders',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="LeaveFeedback" 
            component={LeaveFeedbackScreen}
            options={{
              headerShown: false,
              title: 'Leave Feedback',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          {/* Settings screens */}
          <RootStack.Screen 
            name="Finance" 
            component={FinanceScreen}
            options={{
              headerShown: false,
              title: 'Finance',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="PrivacyPolicy" 
            component={PrivacyPolicyScreen}
            options={{
              headerShown: false,
              title: 'Privacy Policy',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="ChangePassword" 
            component={ChangePasswordScreen}
            options={{
              headerShown: false,
              title: 'Change Password',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="AffiliateMarketing" 
            component={AffiliateMarketingScreen}
            options={{
              headerShown: false,
              title: 'Affiliate Marketing',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="UnitSettings" 
            component={UnitSettingsScreen}
            options={{
              headerShown: false,
              title: 'Unit Settings',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          <RootStack.Screen 
            name="PaymentPassword" 
            component={PaymentPasswordScreen}
            options={{
              headerShown: false,
              title: 'Payment Password',
              headerStyle: {
                backgroundColor: COLORS.white,
              },
              headerTintColor: COLORS.text.primary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
          {/* Chat screens */}
          <RootStack.Screen 
            name="Chat" 
            component={ChatScreenWithBoundary}
            options={{
              headerShown: false,
            }}
          />
          {/* General Inquiry screens */}
          <RootStack.Screen 
            name="GeneralInquiryList" 
            component={GeneralInquiryListScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen 
            name="GeneralInquiryChat" 
            component={GeneralInquiryChatScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen 
            name="CreateGeneralInquiry" 
            component={CreateGeneralInquiryScreen}
            options={{
              headerShown: false,
            }}
          />

      </>
    </RootStack.Navigator>
  );
};

const navigationRef = createNavigationContainerRef<ParamListBase>();

// Main App Navigator
const AppNavigator = () => {
  return (
    <NavigationContainer ref={navigationRef}>
      <RootNavigator />
      <InquiryNotificationListener navigationRef={navigationRef} />
    </NavigationContainer>
  );
};

export default AppNavigator;
