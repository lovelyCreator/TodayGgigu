import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyWishlistScreen = lazy(() => import('../main/WishlistScreen'));

const WishlistScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="grid" />}>
    <LazyWishlistScreen {...props} />
  </Suspense>
);

export default WishlistScreenWithSuspense;
