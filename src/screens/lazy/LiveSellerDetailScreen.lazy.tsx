import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

const LazyLiveSellerDetailScreen = lazy(() => import('../main/liveScreen/LiveSellerDetailScreen'));

const LiveSellerDetailScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading live seller..." />}>
    <LazyLiveSellerDetailScreen {...props} />
  </Suspense>
);

export default LiveSellerDetailScreenWithSuspense;
