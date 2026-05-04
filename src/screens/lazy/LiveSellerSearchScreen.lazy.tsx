import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

const LazyLiveSellerSearchScreen = lazy(() => import('../main/liveScreen/LiveSellerSearchScreen'));

const LiveSellerSearchScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading seller search..." />}>
    <LazyLiveSellerSearchScreen {...props} />
  </Suspense>
);

export default LiveSellerSearchScreenWithSuspense;
