import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyCategoryTabScreen = lazy(() => import('../main/CategoryTabScreen'));

const CategoryTabScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="grid" />}>
    <LazyCategoryTabScreen {...props} />
  </Suspense>
);

export default CategoryTabScreenWithSuspense;
