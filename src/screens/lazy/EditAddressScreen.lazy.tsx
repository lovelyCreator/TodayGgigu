import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the EditAddressScreen component
const LazyEditAddressScreen = lazy(() => import('../main/profileScreen/settingScreen/EditAddressScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const EditAddressScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading address editor..." />}>
    <LazyEditAddressScreen {...props} />
  </Suspense>
);

export default EditAddressScreenWithSuspense;
