import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the AddNewAddressScreen component
const LazyAddNewAddressScreen = lazy(() => import('../main/profileScreen/settingScreen/AddNewAddressScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const AddNewAddressScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading address form..." />}>
    <LazyAddNewAddressScreen {...props} />
  </Suspense>
);

export default AddNewAddressScreenWithSuspense;
