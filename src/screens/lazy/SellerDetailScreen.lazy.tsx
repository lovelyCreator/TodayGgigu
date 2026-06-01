import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const SellerDetailScreenComponent = lazy(() => import('../main/SellerDetailScreen'));

const SellerDetailScreen = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="detail" />}>
    <SellerDetailScreenComponent {...props} />
  </Suspense>
);

export default SellerDetailScreen;
