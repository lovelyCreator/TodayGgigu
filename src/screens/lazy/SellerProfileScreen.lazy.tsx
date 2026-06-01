import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazySellerProfileScreen = lazy(
  () => import('../main/searchScreen/SellerProfileScreen'),
);

const SellerProfileScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="list" />}>
    <LazySellerProfileScreen {...props} />
  </Suspense>
);

export default SellerProfileScreenWithSuspense;
