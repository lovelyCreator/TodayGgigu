import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the CartScreen component
const LazyCartScreen = lazy(() => import('../main/CartScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const CartScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading cart..." />}>
    <LazyCartScreen {...props} />
  </Suspense>
);

export default CartScreenWithSuspense;
