import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyOrderConfirmationScreen = lazy(
  () => import('../main/profileScreen/settingScreen/OrderConfirmationScreen'),
);

const OrderConfirmationScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="list" />}>
    <LazyOrderConfirmationScreen {...props} />
  </Suspense>
);

export default OrderConfirmationScreenWithSuspense;
