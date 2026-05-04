import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

const LazySearchScreen = lazy(() => import('../main/searchScreen/SearchScreen'));

const SearchScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading search..." />}>
    <LazySearchScreen {...props} />
  </Suspense>
);

export default SearchScreenWithSuspense;
