import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the WishlistScreen component
const LazyWishlistScreen = lazy(() => import('../main/WishlistScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const WishlistScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading wishlist..." />}>
    <LazyWishlistScreen {...props} />
  </Suspense>
);

export default WishlistScreenWithSuspense;
