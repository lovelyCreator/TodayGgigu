import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the ProductDiscoveryScreen component
const LazyProductDiscoveryScreen = lazy(() => import('../main/searchScreen/ProductDiscoveryScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const ProductDiscoveryScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading product discovery..." />}>
    <LazyProductDiscoveryScreen {...props} />
  </Suspense>
);

export default ProductDiscoveryScreenWithSuspense;
