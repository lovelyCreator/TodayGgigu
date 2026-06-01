import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyCartScreen = lazy(() => import('../main/CartScreen'));

const CartScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="list" />}>
    <LazyCartScreen {...props} />
  </Suspense>
);

export default CartScreenWithSuspense;
