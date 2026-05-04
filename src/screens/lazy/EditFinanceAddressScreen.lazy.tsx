import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the EditFinanceAddressScreen component
const LazyEditFinanceAddressScreen = lazy(() => import('../main/profileScreen/settingScreen/EditFinanceAddressScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const EditFinanceAddressScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading finance address editor..." />}>
    <LazyEditFinanceAddressScreen {...props} />
  </Suspense>
);

export default EditFinanceAddressScreenWithSuspense;
