import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the EditProfileScreen component
const LazyEditProfileScreen = lazy(() => import('../main/profileScreen/myPageScreen/EditProfileScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const EditProfileScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading profile editor..." />}>
    <LazyEditProfileScreen {...props} />
  </Suspense>
);

export default EditProfileScreenWithSuspense;
