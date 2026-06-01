import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyAddressBookScreen = lazy(
  () => import('../main/profileScreen/settingScreen/AddressBookScreen'),
);

const AddressBookScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="list" />}>
    <LazyAddressBookScreen {...props} />
  </Suspense>
);

export default AddressBookScreenWithSuspense;
