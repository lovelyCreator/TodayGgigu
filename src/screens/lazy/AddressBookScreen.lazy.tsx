import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the AddressBookScreen component
const LazyAddressBookScreen = lazy(() => import('../main/profileScreen/settingScreen/AddressBookScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const AddressBookScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading address book..." />}>
    <LazyAddressBookScreen {...props} />
  </Suspense>
);

export default AddressBookScreenWithSuspense;
