import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the CategoryTabScreen component
const LazyCategoryTabScreen = lazy(() => import('../main/CategoryTabScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const CategoryTabScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading categories..." />}>
    <LazyCategoryTabScreen {...props} />
  </Suspense>
);

export default CategoryTabScreenWithSuspense;
