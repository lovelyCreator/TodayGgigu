import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the ForgotPasswordScreen component
const LazyForgotPasswordScreen = lazy(() => import('../auth/ForgotPasswordScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const ForgotPasswordScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading forgot password..." />}>
    <LazyForgotPasswordScreen {...props} />
  </Suspense>
);

export default ForgotPasswordScreenWithSuspense;