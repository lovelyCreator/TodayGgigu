import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyResetPasswordScreen = lazy(() => import('../auth/ResetPasswordScreen'));

const ResetPasswordScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="form" />}>
    <LazyResetPasswordScreen {...props} />
  </Suspense>
);

export default ResetPasswordScreenWithSuspense;
