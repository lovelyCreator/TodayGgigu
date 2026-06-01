import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyPrivacyPolicyScreen = lazy(
  () => import('../main/profileScreen/PrivacyPolicyScreen'),
);

const PrivacyPolicyScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="detail" />}>
    <LazyPrivacyPolicyScreen {...props} />
  </Suspense>
);

export default PrivacyPolicyScreenWithSuspense;
