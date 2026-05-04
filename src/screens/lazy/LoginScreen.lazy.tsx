import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the LoginScreen component
const LazyLoginScreen = lazy(() => import('../auth/LoginScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const LoginScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading login..." />}>
    <LazyLoginScreen {...props} />
  </Suspense>
);

export default LoginScreenWithSuspense;