import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the ReviewsScreen component
const LazyReviewsScreen = lazy(() => import('../main/profileScreen/ReviewsScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const ReviewsScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading reviews..." />}>
    <LazyReviewsScreen {...props} />
  </Suspense>
);

export default ReviewsScreenWithSuspense;
