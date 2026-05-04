import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the OrderHistoryScreen component
const LazyOrderHistoryScreen = lazy(() => import('../main/profileScreen/settingScreen/OrderHistoryScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const OrderHistoryScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading order history..." />}>
    <LazyOrderHistoryScreen {...props} />
  </Suspense>
);

export default OrderHistoryScreenWithSuspense;
