import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazySearchResultsScreen = lazy(
  () => import('../main/searchScreen/SearchResultsScreen'),
);

const SearchResultsScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="grid" />}>
    <LazySearchResultsScreen {...props} />
  </Suspense>
);

export default SearchResultsScreenWithSuspense;
