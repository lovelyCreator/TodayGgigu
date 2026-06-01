import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyOtpVerificationScreen = lazy(() => import('../auth/OtpVerificationScreen'));

const OtpVerificationScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="form" />}>
    <LazyOtpVerificationScreen {...props} />
  </Suspense>
);

export default OtpVerificationScreenWithSuspense;
