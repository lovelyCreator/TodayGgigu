import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazySearchScreen = lazy(() => import('../main/searchScreen/SearchScreen'));

const SearchScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="list" />}>
    <LazySearchScreen {...props} />
  </Suspense>
);

export default SearchScreenWithSuspense;
