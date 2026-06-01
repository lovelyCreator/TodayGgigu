import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyEditAddressScreen = lazy(
  () => import('../main/profileScreen/settingScreen/EditAddressScreen'),
);

const EditAddressScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="form" />}>
    <LazyEditAddressScreen {...props} />
  </Suspense>
);

export default EditAddressScreenWithSuspense;
