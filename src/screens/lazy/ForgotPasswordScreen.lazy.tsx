import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyForgotPasswordScreen = lazy(() => import('../auth/ForgotPasswordScreen'));

const ForgotPasswordScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="form" />}>
    <LazyForgotPasswordScreen {...props} />
  </Suspense>
);

export default ForgotPasswordScreenWithSuspense;
