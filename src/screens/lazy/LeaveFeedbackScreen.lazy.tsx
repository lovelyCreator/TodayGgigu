import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyLeaveFeedbackScreen = lazy(
  () => import('../main/profileScreen/LeaveFeedbackScreen'),
);

const LeaveFeedbackScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="form" />}>
    <LazyLeaveFeedbackScreen {...props} />
  </Suspense>
);

export default LeaveFeedbackScreenWithSuspense;
