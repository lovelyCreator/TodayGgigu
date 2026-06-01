import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyProductDiscoveryScreen = lazy(
  () => import('../main/searchScreen/ProductDiscoveryScreen'),
);

const ProductDiscoveryScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="grid" />}>
    <LazyProductDiscoveryScreen {...props} />
  </Suspense>
);

export default ProductDiscoveryScreenWithSuspense;
