import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the FinanceScreen component
const LazyFinanceScreen = lazy(() => import('../main/profileScreen/settingScreen/FinanceScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const FinanceScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading finance..." />}>
    <LazyFinanceScreen {...props} />
  </Suspense>
);

export default FinanceScreenWithSuspense;
