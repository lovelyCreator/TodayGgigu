import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the OrderInquiryScreen component
const LazyOrderInquiryScreen = lazy(() => import('../main/profileScreen/OrderInquiryScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const OrderInquiryScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading order inquiry..." />}>
    <LazyOrderInquiryScreen {...props} />
  </Suspense>
);

export default OrderInquiryScreenWithSuspense;
