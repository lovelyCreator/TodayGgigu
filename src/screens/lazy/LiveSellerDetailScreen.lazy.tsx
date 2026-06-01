import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyLiveSellerDetailScreen = lazy(
  () => import('../main/liveScreen/LiveSellerDetailScreen'),
);

const LiveSellerDetailScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="detail" />}>
    <LazyLiveSellerDetailScreen {...props} />
  </Suspense>
);

export default LiveSellerDetailScreenWithSuspense;
