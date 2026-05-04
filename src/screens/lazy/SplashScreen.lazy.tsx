import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the SplashScreen component
const LazySplashScreen = lazy(() => import('../main/SplashScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const SplashScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading..." />}>
    <LazySplashScreen {...props} />
  </Suspense>
);

export default SplashScreenWithSuspense;