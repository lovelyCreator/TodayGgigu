import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyAddNewAddressScreen = lazy(
  () => import('../main/profileScreen/settingScreen/AddNewAddressScreen'),
);

const AddNewAddressScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="form" />}>
    <LazyAddNewAddressScreen {...props} />
  </Suspense>
);

export default AddNewAddressScreenWithSuspense;
