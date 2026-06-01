import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyEditFinanceAddressScreen = lazy(
  () => import('../main/profileScreen/settingScreen/EditFinanceAddressScreen'),
);

const EditFinanceAddressScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="form" />}>
    <LazyEditFinanceAddressScreen {...props} />
  </Suspense>
);

export default EditFinanceAddressScreenWithSuspense;
