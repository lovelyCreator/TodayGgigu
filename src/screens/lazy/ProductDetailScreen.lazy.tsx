import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the ProductDetailScreen component
const LazyProductDetailScreen = lazy(() => import('../main/ProductDetailScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const ProductDetailScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading product details..." />}>
    <LazyProductDetailScreen {...props} />
  </Suspense>
);

export default ProductDetailScreenWithSuspense;