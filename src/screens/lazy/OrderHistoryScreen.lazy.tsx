import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyOrderHistoryScreen = lazy(
  () => import('../main/profileScreen/settingScreen/OrderHistoryScreen'),
);

const OrderHistoryScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="list" />}>
    <LazyOrderHistoryScreen {...props} />
  </Suspense>
);

export default OrderHistoryScreenWithSuspense;
