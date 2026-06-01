import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyPaymentMethodsScreen = lazy(
  () => import('../main/profileScreen/settingScreen/PaymentMethodsScreen'),
);

const PaymentMethodsScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="list" />}>
    <LazyPaymentMethodsScreen {...props} />
  </Suspense>
);

export default PaymentMethodsScreenWithSuspense;
