import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the PaymentMethodsScreen component
const LazyPaymentMethodsScreen = lazy(() => import('../main/profileScreen/settingScreen/PaymentMethodsScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const PaymentMethodsScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading payment methods..." />}>
    <LazyPaymentMethodsScreen {...props} />
  </Suspense>
);

export default PaymentMethodsScreenWithSuspense;
