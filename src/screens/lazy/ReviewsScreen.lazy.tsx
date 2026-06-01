import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyReviewsScreen = lazy(() => import('../main/profileScreen/ReviewsScreen'));

const ReviewsScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="list" />}>
    <LazyReviewsScreen {...props} />
  </Suspense>
);

export default ReviewsScreenWithSuspense;
