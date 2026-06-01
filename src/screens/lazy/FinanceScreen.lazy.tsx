import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyFinanceScreen = lazy(
  () => import('../main/profileScreen/settingScreen/FinanceScreen'),
);

const FinanceScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="list" />}>
    <LazyFinanceScreen {...props} />
  </Suspense>
);

export default FinanceScreenWithSuspense;
