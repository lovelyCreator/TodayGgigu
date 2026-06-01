import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyLiveSellerSearchScreen = lazy(
  () => import('../main/liveScreen/LiveSellerSearchScreen'),
);

const LiveSellerSearchScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="list" />}>
    <LazyLiveSellerSearchScreen {...props} />
  </Suspense>
);

export default LiveSellerSearchScreenWithSuspense;
