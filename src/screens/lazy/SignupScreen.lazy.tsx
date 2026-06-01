import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazySignupScreen = lazy(() => import('../auth/SignupScreen'));

const SignupScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="form" />}>
    <LazySignupScreen {...props} />
  </Suspense>
);

export default SignupScreenWithSuspense;
