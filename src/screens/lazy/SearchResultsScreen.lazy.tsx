import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the SearchResultsScreen component
const LazySearchResultsScreen = lazy(() => import('../main/searchScreen/SearchResultsScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const SearchResultsScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading search results..." />}>
    <LazySearchResultsScreen {...props} />
  </Suspense>
);

export default SearchResultsScreenWithSuspense;
