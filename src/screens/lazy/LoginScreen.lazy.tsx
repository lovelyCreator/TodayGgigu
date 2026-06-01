import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyLoginScreen = lazy(() => import('../auth/LoginScreen'));

const LoginScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="form" />}>
    <LazyLoginScreen {...props} />
  </Suspense>
);

export default LoginScreenWithSuspense;
