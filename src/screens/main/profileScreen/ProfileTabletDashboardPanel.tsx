import React, { lazy, Suspense } from 'react';

import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { COLORS } from '../../../constants';

import type { ProfileDashboardRoute } from './profileTabletDashboardRoute';



const CartScreen = lazy(() => import('../CartScreen'));

const CategoryTabScreen = lazy(() => import('../CategoryTabScreen'));

const WishlistScreen = lazy(() => import('../WishlistScreen'));

const ViewedProductsScreen = lazy(() => import('./ViewedProductsScreen'));

const ProductManagementScreen = lazy(

  () => import('./settingScreen/productManagementScreen/ProductManagementScreen'),

);

const PaymentHistoryScreen = lazy(

  () => import('./settingScreen/PaymentHistoryScreen'),

);

const DepositScreen = lazy(() => import('./depositScreen/DepositScreen'));

const PersonalInformationScreen = lazy(

  () => import('./settingScreen/PersonalInformationScreen'),

);

const ProgressNotificationScreen = lazy(

  () => import('./settingScreen/ProgressNotificationScreen'),

);

const AddressBookScreen = lazy(() => import('./settingScreen/AddressBookScreen'));

const BuyListScreen = lazy(() => import('./settingScreen/BuyListScreen'));

const UnitSurveyScreen = lazy(

  () => import('./settingScreen/marketSurveyScreen/UnitSurveyScreen'),

);

const OEMSurveyScreen = lazy(

  () => import('./settingScreen/marketSurveyScreen/OEMSurveyScreen'),

);

const OrderDetailScreen = lazy(

  () => import('./settingScreen/OrderDetailScreen'),

);

const OrderPaymentScreen = lazy(

  () => import('./settingScreen/OrderPaymentScreen'),

);

const RefundRequestScreen = lazy(

  () => import('./settingScreen/RefundRequestScreen'),

);

const ChatScreen = lazy(() => import('../chatScreen/ChatScreen'));

const CustomerServiceScreen = lazy(() => import('./CustomerServiceScreen'));

const NoteScreen = lazy(() => import('./NoteScreen'));

const ProfileSettingsScreen = lazy(

  () => import('./myPageScreen/ProfileSettingsScreen'),

);

const MessageScreen = lazy(() => import('../MessageScreen'));

const ProductDetailScreen = lazy(() => import('../ProductDetailScreen'));



const panelFallbackStyle = StyleSheet.create({

  fallback: {

    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: COLORS.background,

  },

});



const PanelFallback = () => (

  <View style={panelFallbackStyle.fallback}>

    <ActivityIndicator size="large" color={COLORS.red} />

  </View>

);



const withSuspense = (node: React.ReactNode) => (

  <Suspense fallback={<PanelFallback />}>{node}</Suspense>

);



type ProfileTabletDashboardPanelProps = {

  route: ProfileDashboardRoute;

  onEmbeddedBack?: () => void;

};



export const ProfileTabletDashboardPanel: React.FC<

  ProfileTabletDashboardPanelProps

> = ({ route, onEmbeddedBack }) => {

  switch (route.type) {

    case 'buyList':

      return withSuspense(

        <BuyListScreen

          embedded

          embeddedDomain={route.domain}

          embeddedInitialTab={route.initialTab}

          embeddedProgressStatus={route.progressStatus}

          embeddedUnconfirmedOnly={route.unconfirmedOnly}

        />,

      );

    case 'cart':

      return withSuspense(<CartScreen embedded />);

    case 'productList':

      return withSuspense(<ProductManagementScreen embedded />);

    case 'category':

      return withSuspense(<CategoryTabScreen embedded />);

    case 'wishlist':

      return withSuspense(<WishlistScreen embedded />);

    case 'viewedProducts':

      return withSuspense(<ViewedProductsScreen embedded />);

    case 'unitSurvey':

      return withSuspense(<UnitSurveyScreen embedded />);

    case 'oemSurvey':

      return withSuspense(<OEMSurveyScreen embedded />);

    case 'paymentHistory':

      return withSuspense(<PaymentHistoryScreen embedded />);

    case 'deposit':

      return withSuspense(<DepositScreen embedded />);

    case 'personalSecurity':

      return withSuspense(<PersonalInformationScreen embedded />);

    case 'progressNotification':

      return withSuspense(<ProgressNotificationScreen embedded />);

    case 'deliveryAddress':

      return withSuspense(

        <AddressBookScreen embedded fromShippingSettings />,

      );

    case 'orderDetail':

      return withSuspense(

        <OrderDetailScreen

          embedded

          embeddedOrderId={route.orderId}

          embeddedOrder={route.order as import('../../../services/orderApi').Order | undefined}

          onEmbeddedBack={onEmbeddedBack}

        />,

      );

    case 'orderPayment':

      return withSuspense(

        <OrderPaymentScreen

          embedded

          embeddedOrderId={route.orderId}

          onEmbeddedBack={onEmbeddedBack}

        />,

      );

    case 'refundRequest':

      return withSuspense(

        <RefundRequestScreen

          embedded

          embeddedParams={{

            orderId: route.orderId,

            orderNumber: route.orderNumber,

            items: route.items,

            refundData: route.refundData,

          }}

          onEmbeddedBack={onEmbeddedBack}

        />,

      );

    case 'chat':

      return withSuspense(

        <ChatScreen

          embedded

          embeddedParams={{

            inquiryId: route.inquiryId,

            orderId: route.orderId,

            orderNumber: route.orderNumber,

          }}

          onEmbeddedBack={onEmbeddedBack}

        />,

      );

    case 'customerService':

      return withSuspense(

        <CustomerServiceScreen embedded onEmbeddedBack={onEmbeddedBack} />,

      );

    case 'note':

      return withSuspense(

        <NoteScreen embedded onEmbeddedBack={onEmbeddedBack} />,

      );

    case 'profileSettings':

      return withSuspense(

        <ProfileSettingsScreen embedded onEmbeddedBack={onEmbeddedBack} />,

      );

    case 'message':

      return withSuspense(

        <MessageScreen
          embedded
          initialTabOverride={route.initialTab}
          onEmbeddedBack={onEmbeddedBack}
        />,

      );

    case 'productDetail':

      return withSuspense(

        <ProductDetailScreen

          embedded

          embeddedProductId={route.productId}

          embeddedSource={route.source}

          embeddedCountry={route.country}

          onEmbeddedBack={onEmbeddedBack}

        />,

      );

    default:

      return null;

  }

};



export default ProfileTabletDashboardPanel;


