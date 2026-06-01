import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazySplashScreen = lazy(() => import('../main/SplashScreen'));

const SplashScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="plain" showHeader={false} />}>
    <LazySplashScreen {...props} />
  </Suspense>
);

export default SplashScreenWithSuspense;
