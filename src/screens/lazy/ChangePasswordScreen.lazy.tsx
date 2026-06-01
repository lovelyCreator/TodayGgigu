import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyChangePasswordScreen = lazy(
  () => import('../main/profileScreen/myPageScreen/ChangePasswordScreen'),
);

const ChangePasswordScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="form" />}>
    <LazyChangePasswordScreen {...props} />
  </Suspense>
);

export default ChangePasswordScreenWithSuspense;
