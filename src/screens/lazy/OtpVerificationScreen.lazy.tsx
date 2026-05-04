import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the OtpVerificationScreen component
const LazyOtpVerificationScreen = lazy(() => import('../auth/OtpVerificationScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const OtpVerificationScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading OTP verification..." />}>
    <LazyOtpVerificationScreen {...props} />
  </Suspense>
);

export default OtpVerificationScreenWithSuspense;
