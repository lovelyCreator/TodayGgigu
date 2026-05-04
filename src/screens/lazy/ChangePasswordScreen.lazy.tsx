import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the ChangePasswordScreen component
const LazyChangePasswordScreen = lazy(() => import('../main/profileScreen/myPageScreen/ChangePasswordScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const ChangePasswordScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading password change..." />}>
    <LazyChangePasswordScreen {...props} />
  </Suspense>
);

export default ChangePasswordScreenWithSuspense;
