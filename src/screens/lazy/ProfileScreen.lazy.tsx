import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyProfileScreen = lazy(() => import('../main/profileScreen/ProfileScreen'));

const ProfileScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="list" />}>
    <LazyProfileScreen {...props} />
  </Suspense>
);

export default ProfileScreenWithSuspense;
