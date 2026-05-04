import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy load the ChatScreen component
const LazyChatScreen = lazy(() => import('../main/chatScreen/ChatScreen'));

// Export a component that wraps the lazy-loaded component with Suspense
const ChatScreenWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner message="Loading chat..." />}>
    <LazyChatScreen {...props} />
  </Suspense>
);

export default ChatScreenWithSuspense;
