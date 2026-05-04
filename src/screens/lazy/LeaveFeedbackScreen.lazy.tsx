import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the LeaveFeedbackScreen component
const LazyLeaveFeedbackScreen = lazy(() => import('../main/profileScreen/LeaveFeedbackScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const LeaveFeedbackScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading feedback form..." />}>
    <LazyLeaveFeedbackScreen {...props} />
  </Suspense>
);

export default LeaveFeedbackScreenWithSuspense;
