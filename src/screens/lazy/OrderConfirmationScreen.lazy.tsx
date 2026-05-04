import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the OrderConfirmationScreen component
const LazyOrderConfirmationScreen = lazy(() => import('../main/profileScreen/settingScreen/OrderConfirmationScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const OrderConfirmationScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading order confirmation..." />}>
    <LazyOrderConfirmationScreen {...props} />
  </Suspense>
);

export default OrderConfirmationScreenWithSuspense;
