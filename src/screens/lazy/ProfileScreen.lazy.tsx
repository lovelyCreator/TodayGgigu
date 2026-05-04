import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the ProfileScreen component
const LazyProfileScreen = lazy(() => import('../main/profileScreen/ProfileScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const ProfileScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading profile..." />}>
    <LazyProfileScreen {...props} />
  </Suspense>
);

export default ProfileScreenWithSuspense;
