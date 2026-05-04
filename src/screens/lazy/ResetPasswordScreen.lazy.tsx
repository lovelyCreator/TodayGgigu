import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the ResetPasswordScreen component
const LazyResetPasswordScreen = lazy(() => import('../auth/ResetPasswordScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const ResetPasswordScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading reset password..." />}>
    <LazyResetPasswordScreen {...props} />
  </Suspense>
);

export default ResetPasswordScreenWithSuspense;