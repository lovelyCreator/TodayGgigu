import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the SellerProfileScreen component
const LazySellerProfileScreen = lazy(() => import('../main/searchScreen/SellerProfileScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const SellerProfileScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading seller profile..." />}>
    <LazySellerProfileScreen {...props} />
  </Suspense>
);

export default SellerProfileScreenWithSuspense;
