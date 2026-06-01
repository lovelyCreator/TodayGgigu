import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyProductDetailScreen = lazy(() => import('../main/ProductDetailScreen'));

const ProductDetailScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="detail" />}>
    <LazyProductDetailScreen {...props} />
  </Suspense>
);

export default ProductDetailScreenWithSuspense;
