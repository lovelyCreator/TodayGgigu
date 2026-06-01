import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyOrderInquiryScreen = lazy(
  () => import('../main/profileScreen/OrderInquiryScreen'),
);

const OrderInquiryScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="list" />}>
    <LazyOrderInquiryScreen {...props} />
  </Suspense>
);

export default OrderInquiryScreenWithSuspense;
