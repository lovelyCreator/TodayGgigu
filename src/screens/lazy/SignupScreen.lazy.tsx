import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the SignupScreen component
const LazySignupScreen = lazy(() => import('../auth/SignupScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const SignupScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading signup..." />}>
    <LazySignupScreen {...props} />
  </Suspense>
);

export default SignupScreenWithSuspense;