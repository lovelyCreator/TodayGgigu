import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyEditProfileScreen = lazy(
  () => import('../main/profileScreen/myPageScreen/EditProfileScreen'),
);

const EditProfileScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="form" />}>
    <LazyEditProfileScreen {...props} />
  </Suspense>
);

export default EditProfileScreenWithSuspense;
